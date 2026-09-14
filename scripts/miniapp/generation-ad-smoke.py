"""Random generation intervals and ad callbacks in an isolated depot; no Toss calls."""
import base64
import concurrent.futures
import json
import sqlite3
import tempfile
import time
import uuid

from smoke import SOURCE, cleanup_case, command, expect, request


def migration_check():
    original = (SOURCE / 'migrations/U1789314000__miniapp_lotto.sql').read_text()
    ads = original[original.index('CREATE TABLE ait_lotto_attendance ('):original.index('-- Kit functional ledger template: anonymous_bootstrap_attempts.sql')]
    with sqlite3.connect(':memory:') as db:
        db.executescript('PRAGMA foreign_keys=ON; CREATE TABLE _user(id BLOB PRIMARY KEY); CREATE TABLE promotion_campaigns(id TEXT PRIMARY KEY); CREATE TABLE promotion_reward_ledger(user_id BLOB,source_type TEXT,source_id TEXT);')
        db.executescript(ads)
        for name in ['U1789322000__miniapp_promotion_accounting.sql', 'U1789344000__miniapp_attendance_cycles.sql']:
            db.executescript((SOURCE / 'migrations' / name).read_text())
        db.executescript("""
            INSERT INTO _user VALUES (x'01'),(x'02');
            UPDATE ait_lotto_ad_placements SET enabled=1,rewarded_group_id='existing',rewarded_weight=73 WHERE placement='custom';
            INSERT INTO ait_lotto_ad_sessions(id,user_id,placement,format,group_id,created_at,completed_at,status,expires_at,pass_duration_ms,attendance_day)
              VALUES ('restored',x'01','attendance_restore','rewarded','original',1,2,'granted',999,100000,20),
                     ('pending',x'02','custom','interstitial','original',1,NULL,'pending',999,100000,NULL);
            INSERT INTO ait_lotto_attendance_restores VALUES (x'01',19,'restored',2);
            INSERT INTO ait_lotto_entitlements VALUES (x'01','custom',100000);
        """)
        sessions = db.execute('SELECT * FROM ait_lotto_ad_sessions ORDER BY id').fetchall()
        restores = db.execute('SELECT * FROM ait_lotto_attendance_restores').fetchall()
        placements = db.execute('SELECT * FROM ait_lotto_ad_placements ORDER BY placement').fetchall()
        migration = (SOURCE / 'migrations/U1789374000__miniapp_generation_ads.sql').read_text()
        db.executescript('BEGIN;' + migration + 'COMMIT;')
        assert [row[:-1] for row in db.execute('SELECT * FROM ait_lotto_ad_sessions ORDER BY id')] == sessions
        assert db.execute('SELECT * FROM ait_lotto_attendance_restores').fetchall() == restores
        assert db.execute("SELECT * FROM ait_lotto_ad_placements WHERE placement!='generation_continue' ORDER BY placement").fetchall() == placements
        assert db.execute("SELECT enabled FROM ait_lotto_ad_placements WHERE placement='generation_continue'").fetchone() == (0,)
        assert db.execute('SELECT min_generations,max_generations FROM ait_lotto_generation_ad_policy').fetchone() == (10, 50)
        assert db.execute('PRAGMA foreign_key_check').fetchall() == []
        db.execute("DELETE FROM ait_lotto_ad_sessions WHERE id='restored'")
        assert db.execute('SELECT ad_session_id FROM ait_lotto_attendance_restores').fetchone() == (None,)
        db.execute("INSERT INTO ait_lotto_generation_ad_progress VALUES (x'01',10,0,1)")
        db.execute("DELETE FROM _user WHERE id=x'01'")
        assert db.execute('SELECT * FROM ait_lotto_generation_ad_progress').fetchall() == []
        assert db.execute('SELECT * FROM ait_lotto_entitlements').fetchall() == []
    print(json.dumps({'generation-ad-migration': 'passed', 'preserved': ['placement configuration', 'granted and pending sessions', 'attendance references and cascading deletion']}), flush=True)


def run():
    migration_check()
    name = '645-generation-ads-' + uuid.uuid4().hex[:8]
    with tempfile.TemporaryDirectory(prefix='645-generation-ads-') as folder:
        try:
            command('docker', 'run', '-d', '--name', name, '-p', '127.0.0.1::4000', '-v', f'{folder}:/app/traildepot',
                    '-e', 'BACKFILL_ON_STARTUP=false', '-e', 'AIT_ENABLED=true', '-e', 'AIT_ALLOW_DEV_IDENTITY=true',
                    '-e', 'AIT_BOTS_ENABLED=false', '-e', 'AIT_TEST_ADS=false', '-e', 'AIT_PROMOTIONS_ENABLED=false',
                    '-e', 'RUNTIME_THREADS=4', '645-trailbase:miniapp')

            def connect():
                base = 'http://127.0.0.1:' + command('docker', 'port', name, '4000/tcp').rsplit(':', 1)[1]
                for _ in range(100):
                    try:
                        if request(base, '/api/app/v1/lotto/round-context')[0] == 200:
                            return base
                    except OSError:
                        pass
                    time.sleep(.2)
                raise AssertionError('Generation fixture startup failed')

            base = connect()
            round = request(base, '/api/app/v1/lotto/round-context')[1]['targetRound']

            def sql(statement, params=()):
                script = "import{Database}from'bun:sqlite';const db=new Database('/app/traildepot/data/main.db');const [q,p]=JSON.parse(process.argv[1]);const r=db.query(q).all(...p.map(v=>Array.isArray(v)?Buffer.from(v):v));console.log(JSON.stringify(r));db.close()"
                return json.loads(command('docker', 'exec', name, 'bun', '-e', script, json.dumps([statement, params])))

            def account():
                status, result = request(base, '/api/app/v1/session/bootstrap', {'anonymousHash': 'dev-anon-' + uuid.uuid4().hex})
                expect(status, 200, 'bootstrap')
                tokens = result['authTokens']
                user = list(base64.urlsafe_b64decode(result['user']['id'] + '=='))
                return user, {'Authorization': 'Bearer ' + tokens['authToken'], 'CSRF-Token': tokens['csrfToken']}

            def progress(user):
                return sql('SELECT remaining,cycle FROM ait_lotto_generation_ad_progress WHERE user_id=?', [user])[0]

            def generate(user, auth, request_id=None):
                sql('UPDATE ait_lotto_generation_requests SET created_at=1 WHERE user_id=?', [user])
                return request(base, '/api/app/v1/lotto/generations', {'requestId': request_id or uuid.uuid4().hex, 'round': round,
                    'options': {'fixed': [], 'excluded': [], 'oddCount': None}}, auth)

            def start(auth):
                return request(base, '/api/app/v1/ads/start', {'placement': 'generation_continue'}, auth)

            def complete(auth, ad, events):
                return request(base, '/api/app/v1/ads/complete', {'id': ad['id'], 'events': events}, auth)

            user, auth = account()
            assert not generate(user, auth)[1]['generationAdRequired']
            assert sql('SELECT * FROM ait_lotto_generation_ad_progress') == [], 'disabled ads must not initialize a gate'
            sql("UPDATE ait_lotto_ad_placements SET enabled=1,rewarded_group_id='fixture-rewarded',interstitial_group_id='fixture-interstitial' WHERE placement='generation_continue'")
            sql('UPDATE ait_lotto_generation_ad_policy SET min_generations=10,max_generations=10')
            assert start(auth)[1]['alreadyGranted'], 'a new user must not see an ad first'
            for index in range(10):
                status, result = generate(user, auth)
                expect(status, 200, 'first ten generations')
                assert result['generationAdRequired'] == (index == 9)
            assert progress(user)['remaining'] == 0
            expect(generate(user, auth)[0], 409, 'gate applies only to the next generation')
            before = progress(user)
            command('docker', 'restart', name)
            base = connect()
            assert progress(user) == before, 'restart must retain the same gate'
            assert request(base, '/api/app/v1/ads/config', headers=auth)[1]['generationAdRequired']

            sql("UPDATE ait_lotto_ad_placements SET rewarded_weight=100 WHERE placement='generation_continue'")
            status, ad = start(auth)
            expect(status, 200, 'rewarded start')
            assert ad['format'] == 'rewarded'
            _, other = account()
            expect(complete(other, ad, ['show', 'userEarnedReward'])[0], 404, 'other account cannot complete a session')
            expect(complete(auth, ad, ['show', 'impression', 'dismissed'])[0], 409, 'reward dismissal grants nothing')
            assert progress(user)['remaining'] == 0
            # A shared cap/cooldown allows generation instead of blocking it.
            assert not request(base, '/api/app/v1/ads/config', headers=auth)[1]['generationAdRequired']
            expect(generate(user, auth)[0], 200, 'cooldown permits basic generation')
            sql('UPDATE ait_lotto_ad_sessions SET created_at=created_at-61000 WHERE user_id=?', [user])
            status, ad = start(auth)
            expect(status, 200, 'reward retry')
            expect(complete(auth, ad, ['show', 'userEarnedReward', 'dismissed'])[0], 200, 'reward unlock')
            assert progress(user) == {'remaining': 10, 'cycle': 1}
            # Replayed completions cannot reroll an interval, including after generations.
            expect(generate(user, auth)[0], 200, 'continue after ad')
            before = progress(user)
            for _ in range(2):
                assert complete(auth, ad, ['show', 'userEarnedReward'])[1]['replayed']
                assert progress(user) == before

            # Identical concurrent generation requests count once.
            sql('UPDATE ait_lotto_generation_requests SET created_at=1 WHERE user_id=?', [user])
            payload = {'requestId': uuid.uuid4().hex, 'round': round, 'options': {'fixed': [], 'excluded': [], 'oddCount': None}}
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                replies = list(pool.map(lambda _: request(base, '/api/app/v1/lotto/generations', payload, auth), range(4)))
            assert all(s == 200 for s, _ in replies)
            assert len({r['generation']['id'] for _, r in replies}) == 1
            assert progress(user)['remaining'] == before['remaining'] - 1

            # Exercise the upper endpoint with the real generation route.
            sql('UPDATE ait_lotto_generation_ad_policy SET min_generations=50,max_generations=50')
            user50, auth50 = account()
            for index in range(50):
                status, result = generate(user50, auth50)
                expect(status, 200, 'fifty-generation interval')
                assert result['generationAdRequired'] == (index == 49)
            sql("UPDATE ait_lotto_ad_placements SET rewarded_weight=0 WHERE placement='generation_continue'")
            status, ad50 = start(auth50)
            expect(status, 200, 'interstitial start')
            assert ad50['format'] == 'interstitial'
            expect(complete(auth50, ad50, ['show', 'impression', 'dismissed'])[0], 200, 'interstitial unlock')
            assert progress(user50) == {'remaining': 50, 'cycle': 1}

            # No-fill is recorded as cancelled and never produces a feature pass.
            sql('UPDATE ait_lotto_generation_ad_progress SET remaining=0 WHERE user_id=?', [user50])
            sql('UPDATE ait_lotto_ad_sessions SET created_at=created_at-61000 WHERE user_id=?', [user50])
            status, no_fill = start(auth50)
            expect(status, 200, 'no-fill reservation')
            assert complete(auth50, no_fill, ['failedToShow'])[1]['continuedWithoutAd']
            assert complete(auth50, no_fill, ['failedToShow'])[1]['replayed']
            assert progress(user50) == {'remaining': 50, 'cycle': 2}
            assert sql("SELECT status FROM ait_lotto_ad_sessions WHERE id=?", [no_fill['id']])[0]['status'] == 'cancelled'
            assert sql("SELECT * FROM ait_lotto_entitlements WHERE feature='generation_continue'") == []

            sql('UPDATE ait_lotto_generation_ad_policy SET min_generations=10,max_generations=50')
            intervals = []
            for _ in range(12):
                u, a = account()
                expect(generate(u, a)[0], 200, 'random interval')
                intervals.append(progress(u)['remaining'] + 1)
            assert all(10 <= value <= 50 for value in intervals) and len(set(intervals)) > 1
            sql("UPDATE ait_lotto_ad_placements SET enabled=0 WHERE placement='generation_continue'")
            sql('UPDATE ait_lotto_generation_ad_progress SET remaining=0 WHERE user_id=?', [user50])
            expect(generate(user50, auth50)[0], 200, 'configuration disable immediately releases generation')
            expect(request(base, '/api/app/v1/dev/entitlements', {'action': 'generation_ad'}, auth50)[0], 404, 'production flags reject the local shortcut')
            assert sql('PRAGMA foreign_key_check') == []
            print(json.dumps({'random-generation-ads': 'passed', 'checks': ['10 and 50 boundaries', 'random per-user intervals', 'server restart persistence', 'generation retry idempotency', 'rewarded and interstitial completion', 'cancellation and no-fill distinction', 'no-fill replay idempotency', 'global cooldown fallback', 'disabled placement fallback', 'identity and local-only gates']}), flush=True)
        finally:
            cleanup_case(name, folder, '645-trailbase:miniapp')


if __name__ == '__main__':
    run()

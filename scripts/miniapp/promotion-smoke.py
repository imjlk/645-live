"""Test monetary retries with a disposable DB and local fake provider; never calls Toss."""
import base64
import concurrent.futures
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import platform
import sqlite3
import subprocess
import tempfile
import threading
import time
import uuid

from smoke import SOURCE, cleanup_case, command, expect, request


def check_forward_migration():
    # Exercise an upgrade with existing ad sessions, not just a clean installation.
    original=(SOURCE/'migrations/U1789314000__miniapp_lotto.sql').read_text()
    ads=original[original.index('CREATE TABLE ait_lotto_attendance ('):original.index('-- Kit functional ledger template: anonymous_bootstrap_attempts.sql')]
    with sqlite3.connect(':memory:') as db:
        db.executescript("PRAGMA foreign_keys=ON; CREATE TABLE _user(id BLOB PRIMARY KEY); CREATE TABLE promotion_campaigns(id TEXT PRIMARY KEY); CREATE TABLE promotion_reward_ledger(user_id BLOB,source_type TEXT,source_id TEXT);")
        db.executescript(ads)
        db.executescript((SOURCE/'migrations/U1789322000__miniapp_promotion_accounting.sql').read_text())
        db.execute("INSERT INTO _user VALUES (x'01')")
        db.execute("INSERT INTO promotion_campaigns VALUES ('old')")
        db.execute("INSERT INTO ait_lotto_entitlements VALUES (x'01','custom',100000)")
        db.execute("INSERT INTO ait_lotto_ad_sessions(id,user_id,placement,format,group_id,created_at,completed_at,status,expires_at,pass_duration_ms,events_json) VALUES ('ad-1',x'01','custom','rewarded','real-group',1,2,'granted',999,100000,'[\"show\",\"userEarnedReward\"]')")
        db.execute("INSERT INTO ait_lotto_promotion_reservations VALUES ('old','retained-hmac',30,1)")
        before=db.execute('SELECT * FROM ait_lotto_ad_sessions').fetchall()
        db.commit()
        migration=(SOURCE/'migrations/U1789344000__miniapp_attendance_cycles.sql').read_text()
        db.executescript('BEGIN;'+migration+'COMMIT;')
        after=db.execute('SELECT * FROM ait_lotto_ad_sessions').fetchall()
        assert [row[:-1] for row in after]==before and after[0][-1] is None
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
        assert db.execute('SELECT expires_at FROM ait_lotto_entitlements').fetchone()==(100000,)
        assert db.execute("SELECT enabled FROM ait_lotto_ad_placements WHERE placement='attendance_restore'").fetchone()==(0,)
        db.execute("INSERT INTO ait_lotto_attendance_cycles VALUES (x'01',1,7,1)")
        db.execute("INSERT INTO ait_lotto_attendance_restores VALUES (x'01',5,'ad-1',1)")
        db.execute("DELETE FROM ait_lotto_ad_sessions WHERE id='ad-1'")
        assert db.execute('SELECT ad_session_id FROM ait_lotto_attendance_restores').fetchone()==(None,)
        db.execute('DELETE FROM _user')
        assert db.execute('SELECT * FROM ait_lotto_attendance_cycles').fetchall()==[]
        assert db.execute('SELECT * FROM ait_lotto_attendance_restores').fetchall()==[]
        assert db.execute('SELECT reserved_amount FROM ait_lotto_promotion_usage').fetchone()==(30,)
        assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
    print(json.dumps({'case':'attendance-forward-migration','passed':['existing sessions and passes preserved','restore placement starts disabled','retention and withdrawal preserve foreign-key integrity and budget']}),flush=True)


def run():
    check_forward_migration()
    grants = []

    class Provider(BaseHTTPRequestHandler):
        def log_message(self, *_args):
            pass

        def do_POST(self):
            if self.headers.get('Authorization') != 'Bearer fixture-token':
                self.send_error(401)
                return
            if self.headers.get('Transfer-Encoding') == 'chunked':
                chunks = []
                while True:
                    size = int(self.rfile.readline().split(b';', 1)[0], 16)
                    if size == 0:
                        self.rfile.readline()
                        break
                    chunks.append(self.rfile.read(size))
                    self.rfile.read(2)
                raw = b''.join(chunks)
            else:
                raw = self.rfile.read(int(self.headers['Content-Length']))
            data = json.loads(raw)
            if self.path.endswith('/anonymous-key/verify'):
                result = {'valid': True, 'mode': 'forward'}
            elif self.path.endswith('/promotion/reward/prepare'):
                result = {'ok': True, 'providerTransactionKey': 'fixture-transaction'}
            elif self.path.endswith('/promotion/reward/execute'):
                grants.append(data['providerRequestId'])
                if data['promotionCode'] == 'unknown-outcome':
                    self.send_error(504)
                    return
                result = {'providerStatus': 'PENDING', 'providerTransactionKey': 'fixture-transaction'}
            elif self.path.endswith('/promotion/reward/status'):
                if data['promotionCode'] == 'unknown-outcome':
                    result = {'ok': False, 'providerStatus': 'UNKNOWN', 'providerTransactionKey': 'fixture-transaction'}
                else:
                    result = {'providerStatus': 'GRANTED', 'providerTransactionKey': 'fixture-transaction'}
            else:
                self.send_error(404)
                return
            payload = json.dumps(result).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(payload)))
            self.end_headers()
            self.wfile.write(payload)

    server = ThreadingHTTPServer(('0.0.0.0', 0), Provider)
    worker = threading.Thread(target=server.serve_forever, daemon=True)
    worker.start()
    name = '645-miniapp-promotion-' + uuid.uuid4().hex[:8]
    try:
        with tempfile.TemporaryDirectory(prefix='645-miniapp-promotion-') as folder:
            try:
                command('docker', 'run', '-d', '--name', name,
                    *(['--add-host', 'host.docker.internal:host-gateway'] if platform.system() == 'Linux' else []),
                    '-p', '127.0.0.1::4000', '-v', f'{folder}:/app/traildepot',
                    '-e', 'BACKFILL_ON_STARTUP=false', '-e', 'AIT_ENABLED=true',
                    '-e', 'AIT_ALLOW_DEV_IDENTITY=true', '-e', 'AIT_BOTS_ENABLED=false',
                    '-e', 'AIT_PROMOTIONS_ENABLED=true', '-e', 'AIT_TEST_ADS=true', '-e', 'RUNTIME_THREADS=4',
                    '-e', f'MTLS_PROXY_URL=http://host.docker.internal:{server.server_port}',
                    '-e', 'MTLS_PROXY_TOKEN=fixture-token', '645-trailbase:miniapp')
                base = 'http://127.0.0.1:' + command('docker', 'port', name, '4000/tcp').rsplit(':', 1)[1]
                for _ in range(100):
                    try:
                        if request(base, '/api/app/v1/lotto/round-context')[0] == 200:
                            break
                    except OSError:
                        pass
                    time.sleep(.2)
                else:
                    raise AssertionError('Promotion fixture guest startup failed')
                seed = 'dev-anon-' + uuid.uuid4().hex
                status, session = request(base, '/api/app/v1/session/bootstrap', {'anonymousHash': seed})
                expect(status, 200, 'promotion fixture bootstrap')
                tokens = session['authTokens']
                auth = {'Authorization': 'Bearer ' + tokens['authToken'], 'CSRF-Token': tokens['csrfToken'], 'Refresh-Token': tokens['refreshToken']}
                user = list(base64.urlsafe_b64decode(session['user']['id'] + '=='))
                def fixture(statements):
                    # Run inside the same VM as SQLite; host WAL mmap coherence differs on macOS.
                    script = "import {Database} from 'bun:sqlite'; const db=new Database('/app/traildepot/data/main.db'); const rows=await Bun.stdin.json(); db.exec('PRAGMA foreign_keys=ON'); db.transaction(()=>{for(const [sql,params] of rows) db.query(sql).run(...params.map(v=>Array.isArray(v)?Buffer.from(v):v));})(); db.close();"
                    result = subprocess.run(['docker','exec','-i',name,'bun','-e',script], input=json.dumps(statements), text=True, capture_output=True, timeout=10)
                    assert result.returncode == 0, 'isolated promotion fixture failed'
                def state():
                    status, result = request(base, '/api/app/v1/attendance/status', headers=auth)
                    expect(status, 200, 'attendance state')
                    return result
                def reward(kind):
                    return next(p for p in state()['promotions'] if p['kind'] == kind)
                def claim(r):
                    return request(base, '/api/app/v1/attendance/promotion/claim', {k:r[k] for k in ['kind','periodDay','campaignId','claimId']}, auth)
                def campaign(key, kind, amount, budget, code='pending-then-success'):
                    fixture([("INSERT INTO promotion_campaigns(id,feature_key,provider_promotion_code,reward_amount,status,starts_at,ends_at,budget_limit_amount,created_at,updated_at) VALUES (?,?,?,?,'ACTIVE',?,?,?,?,?)", [key,'ait_lotto_attendance_'+kind,code,amount,now-100,now+86400000,budget,now,now])])
                def new_user(identity=None):
                    status, result = request(base, '/api/app/v1/session/bootstrap', {'anonymousHash':identity or 'dev-anon-'+uuid.uuid4().hex})
                    expect(status,200,'new test user')
                    t = result['authTokens']
                    return list(base64.urlsafe_b64decode(result['user']['id']+'==')), {'Authorization':'Bearer '+t['authToken'],'CSRF-Token':t['csrfToken'],'Refresh-Token':t['refreshToken']}
                def attend_days(days):
                    fixture([('INSERT OR IGNORE INTO ait_lotto_attendance(user_id,day,created_at) VALUES (?,?,?)',[user,d,now]) for d in days])
                def generate():
                    round = request(base,'/api/app/v1/lotto/round-context')[1]['targetRound']
                    expect(request(base,'/api/app/v1/lotto/generations',{'requestId':uuid.uuid4().hex,'round':round,'options':{'fixed':[],'excluded':[],'oddCount':None}},auth)[0],200,'actual generation')
                now = state()['serverTime']
                day = (now+32400000)//86400000
                path = '/api/app/v1/attendance/promotion/claim'
                check_path = '/api/app/v1/attendance/check-in'
                expect(request(base,check_path,{},auth)[0],403,'generation required before check-in')
                expect(request(base,'/api/app/v1/ads/start',{'placement':'attendance_restore'},auth)[0],409,'ineligible restore does not show an ad')
                generate()
                assert state()['generatedToday']
                attend_days([day-2,day-1])
                for _ in range(2): expect(request(base,check_path,{},auth)[0],200,'idempotent attendance')
                assert state()['streak']==3 and 'nextPassIn' not in state()
                assert request(base,'/api/app/v1/ads/config',headers=auth)[1]['passes']=={}, 'three-day attendance still grants feature passes'
                campaign('daily-1','daily',1,1)
                campaign('weekly-1','weekly',30,300)
                daily=reward('daily')
                assert daily['eligible'] and not reward('weekly')['eligible']
                with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                    replies=list(pool.map(lambda _:claim(daily),range(4)))
                assert any(s==200 for s,_ in replies) and all(s in (200,409) for s,_ in replies), [(s,r.get('error',{}).get('code')) for s,r in replies]
                assert len(grants)==1,'concurrent daily claims issued multiple grants'
                assert reward('daily')['claimId'] and not reward('daily')['eligible'],'exhaustion hid claim'
                assert claim(reward('daily'))[1]['status']=='success' and len(grants)==1
                expect(request(base,path,{'kind':'daily','campaignId':'daily-1','periodDay':day+1},auth)[0],403,'future daily reward')
                attend_days(range(day-6,day-2))
                assert state()['streak']==7 and reward('weekly')['eligible']
                assert claim(reward('weekly'))[1]['status']=='pending'
                assert claim(reward('weekly'))[1]['status']=='success' and len(grants)==2
                # The same anonymous identity cannot regain a reward by deleting its profile,
                # even if the operator has since selected another campaign.
                campaign('daily-2','daily',1,100)
                expect(request(base,'/api/app/v1/session/withdraw',{},auth)[0],200,'withdraw')
                user,auth=new_user(seed)
                attend_days(range(day-6,day+1))
                for kind in ['daily','weekly']:
                    r=reward(kind)
                    assert not r['eligible'] and r['status']=='already_claimed',r
                    expect(claim(r)[0],409,'rejoin must not duplicate reward')
                assert len(grants)==2
                user,auth=new_user()
                attend_days(range(day-7,day+1))
                assert state()['streak']==1,'eighth day must start a new cycle'
                assert reward('weekly')['periodDay']==day-1,'completed bonus was lost at reset'
                # Both ad formats restore once, never grant yesterday's daily points.
                for weight in [100,0]:
                    user,auth=new_user()
                    attend_days(range(day-7,day-1))
                    generate()
                    assert state()['canRestore']
                    fixture([("UPDATE ait_lotto_ad_placements SET rewarded_weight=? WHERE placement='attendance_restore'",[weight])])
                    status,ad=request(base,'/api/app/v1/ads/start',{'placement':'attendance_restore'},auth)
                    expect(status,200,'restore ad')
                    assert ad['format']==('rewarded' if weight==100 else 'interstitial')
                    events=['show','impression','dismissed','userEarnedReward']
                    for _ in range(2): expect(request(base,'/api/app/v1/ads/complete',{'id':ad['id'],'events':events},auth)[0],200,'restore completion replay')
                    assert not state()['canRestore'] and reward('weekly')['eligible']
                    assert not state()['checkedIn'] and not reward('daily')['eligible'],'restoration granted retroactive daily attendance'
                    expect(request(base,path,{'kind':'daily','periodDay':day-1,'campaignId':'daily-2'},auth)[0],403,'no retroactive daily points')
                    expect(request(base,check_path,{},auth)[0],200,'today starts next cycle')
                    assert state()['streak']==1
                    assert request(base,'/api/app/v1/ads/start',{'placement':'attendance_restore'},auth)[1]['alreadyGranted'], 'retry must not display another restore ad'
                # Restoration remains bounded across a second gap in the same cycle.
                user,auth=new_user()
                attend_days([day-5,day-3,day-2])
                fixture([('INSERT INTO ait_lotto_attendance_restores(user_id,day,created_at) VALUES (?,?,?)',[user,day-4,now])])
                generate()
                assert not state()['canRestore']
                # A same-day check-in commits to the next cycle: the missed day must
                # not be stitched back into the streak afterwards.
                user,auth=new_user()
                attend_days([day-3,day-2])
                generate()
                expect(request(base,check_path,{},auth)[0],200,'check-in before restore')
                assert state()['streak']==1 and not state()['canRestore']
                expect(request(base,'/api/app/v1/ads/start',{'placement':'attendance_restore'},auth)[0],409,'post-check-in restore rejected')
                assert state()['streak']==1,'restore merged two days into one streak'
                # A started ad cannot restore a different day after midnight.
                user,auth=new_user()
                attend_days([day-2]);generate()
                _,ad=request(base,'/api/app/v1/ads/start',{'placement':'attendance_restore'},auth)
                fixture([('UPDATE ait_lotto_ad_sessions SET attendance_day=? WHERE id=?',[day-1,ad['id']])])
                status,result=request(base,'/api/app/v1/ads/complete',{'id':ad['id'],'events':['show','impression','dismissed','userEarnedReward']},auth)
                expect(status,409,'midnight restore invalidation');assert result['error']['code']=='RESTORE_EXPIRED'
                # Existing claims remain readable if their campaign is removed.
                user,auth=new_user();attend_days([day])
                r=reward('daily');expect(claim(r)[0],200,'orphan fixture claim')
                r=reward('daily');assert claim(r)[1]['status']=='success'
                before=len(grants)
                fixture([("DELETE FROM promotion_campaigns WHERE id='daily-2'",[])])
                orphan=reward('daily');assert orphan['campaignId'] is None and orphan['claimId']==r['claimId']
                assert claim(orphan)[1]['status']=='success' and len(grants)==before
                # Unknown outcomes are escalated without ever granting twice.
                campaign('daily-3','daily',1,1,'unknown-outcome')
                user,auth=new_user();attend_days([day])
                expect(claim(reward('daily'))[0],500,'ambiguous provider outcome')
                fixture([("UPDATE promotion_reward_ledger SET created_at=? WHERE campaign_id='daily-3'",[now-601000])])
                before=len(grants)
                assert claim(reward('daily'))[1]['status']=='needs_review' and len(grants)==before
                # Last month's unsettled claim remains reachable alongside today's reward.
                fixture([("UPDATE promotion_reward_ledger SET source_id=? WHERE campaign_id='daily-3'",[str(day-1)])])
                history=state()['promotionHistory'];assert any(p['status']=='needs_review' for p in history)
                assert len(set(grants))==len(grants)
                usage=command('docker','exec',name,'bun','-e',"import {Database} from 'bun:sqlite'; const db=new Database('/app/traildepot/data/main.db',{readonly:true}); console.log(db.query(\"SELECT reserved_amount FROM ait_lotto_promotion_usage WHERE campaign_id='daily-1'\").get().reserved_amount); db.close();")
                assert usage=='1','withdrawal replenished budget'
                # Console checks use TEST_ codes and isolated ledger entries. They
                # never require attendance fixtures on a production user's history.
                test_path='/api/app/v1/attendance/promotion/test'
                expect(request(base,test_path,{'kind':'daily'},auth)[0],404,'console tests disabled by default')
                def test_settings(values):
                    nonlocal base
                    # WASM caches runtime settings. Preserve this disposable
                    # depot's secrets and restart to load the changed allowlist.
                    script="import{readFileSync,writeFileSync,renameSync}from'node:fs';const p='/app/traildepot/secrets/miniapp-keys.json';const value={...JSON.parse(readFileSync(p,'utf8')),...await Bun.stdin.json()};writeFileSync(p+'.test',JSON.stringify(value),{mode:0o600});renameSync(p+'.test',p);"
                    subprocess.run(['docker','exec','-i',name,'bun','-e',script],input=json.dumps(values),text=True,check=True,capture_output=True)
                    command('docker','restart',name)
                    base='http://127.0.0.1:'+command('docker','port',name,'4000/tcp').rsplit(':',1)[1]
                    for _ in range(100):
                        try:
                            if request(base,'/api/app/v1/lotto/round-context')[0]==200:
                                break
                        except OSError:
                            pass
                        time.sleep(.2)
                    else:
                        raise AssertionError('Console test settings restart failed')
                tester=base64.urlsafe_b64encode(bytes(user)).decode().rstrip('=')
                test_settings({'AIT_PROMOTION_TEST_USER_IDS':tester,'AIT_PROMOTION_TEST_UNTIL':str(now+3600000),'AIT_PROMOTION_TEST_DAILY_CODE':'TEST_00000000000000000000000001','AIT_PROMOTION_TEST_WEEKLY_CODE':'TEST_00000000000000000000000002'})
                assert state()['promotionTestEnabled']
                previous_state=state()
                _,other_auth=new_user()
                expect(request(base,test_path,{'kind':'daily'},other_auth)[0],404,'unlisted tester denied')
                before=len(grants)
                with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                    replies=list(pool.map(lambda _:request(base,test_path,{'kind':'daily'},auth),range(4)))
                assert all(s==200 and r['testOnly'] for s,r in replies),replies
                assert len(grants)==before+1,'console test submitted multiple provider grants'
                for _ in range(2):
                    assert request(base,test_path,{'kind':'daily'},auth)[1]['status']=='success'
                expect(request(base,test_path,{'kind':'weekly'},auth)[0],200,'weekly console test without waiting seven days')
                assert request(base,test_path,{'kind':'weekly'},auth)[1]['status']=='success'
                assert len(grants)==before+2
                after_state=state()
                for key in ['checkedIn','streak','promotions','promotionHistory']:
                    assert after_state[key]==previous_state[key],f'console test changed {key}'
                test_settings({'AIT_PROMOTION_TEST_DAILY_CODE':'00000000000000000000000001'})
                assert not state()['promotionTestEnabled']
                expect(request(base,test_path,{'kind':'daily'},auth)[0],404,'live code rejected by test endpoint')
                test_settings({'AIT_PROMOTION_TEST_DAILY_CODE':'TEST_00000000000000000000000001','AIT_PROMOTION_TEST_UNTIL':str(now-1)})
                expect(request(base,test_path,{'kind':'daily'},auth)[0],404,'expired console access denied')
                print(json.dumps({'case':'attendance-promotions','passed':[
                    'generation-gated check-in; no three-day pass', 'daily and seven-day bonuses independently configurable',
                    'concurrent claims are idempotent; budget survives deletion and rejoin',
                    'seven-day reset retains completed bonus', 'rewarded and interstitial restore exactly once',
                    'no retroactive daily points; restore limits, check-in ordering and midnight binding',
                    'exhausted/deleted campaigns and older claims remain readable', 'unknown outcomes never issue another grant',
                    'console verification requires an unexpired tester allowlist and TEST codes',
                    'concurrent console checks grant once and preserve attendance and live reward history'
                ]}),flush=True)
            finally:
                cleanup_case(name, folder, '645-trailbase:miniapp')
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=5)


if __name__ == '__main__':
    run()

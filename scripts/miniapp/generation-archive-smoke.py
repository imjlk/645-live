"""Run the real scheduled archive job in a disposable depot, without production data."""
import argparse
import base64
import json
import os
import tempfile
import time
import uuid

from smoke import HTTP, cleanup_case, command, expect, request


def run(image):
    name = '645-generation-archive-' + uuid.uuid4().hex[:8]
    with tempfile.TemporaryDirectory(prefix='645-generation-archive-') as folder:
        try:
            command('docker', 'run', '-d', '--name', name, '-p', '127.0.0.1::4000',
                '-v', f'{folder}:/app/traildepot', '-e', 'BACKFILL_ON_STARTUP=false',
                '-e', 'AIT_ENABLED=false', '-e', 'AIT_BOTS_ENABLED=false',
                '-e', 'RUNTIME_THREADS=4', image)
            base = 'http://127.0.0.1:' + command('docker', 'port', name, '4000/tcp').rsplit(':', 1)[1]
            for _ in range(100):
                try:
                    if request(base, '/api/healthcheck')[0] == 200:
                        break
                except OSError:
                    pass
                time.sleep(.2)
            else:
                raise AssertionError('Archive fixture startup failed')
            round = request(base, '/api/app/v1/lotto/round-context')[1]['targetRound']
            # The immediately preceding empty week may already have been archived at startup.
            closed = round - 2
            status, session = request(base, '/api/web/v1/lotto/session', {
                'installationKey': base64.urlsafe_b64encode(os.urandom(32)).decode().rstrip('=')})
            expect(status, 200, 'web bootstrap with miniapp disabled')
            tokens = session['authTokens']
            auth = {'Authorization': 'Bearer ' + tokens['authToken'], 'CSRF-Token': tokens['csrfToken']}
            payload = {'requestId': uuid.uuid4().hex, 'round': round, 'games': [[1,2,3,4,5,6]]}
            expect(request(base, '/api/web/v1/lotto/generations', payload, auth)[0], 200, 'open round')
            expect(request(base, '/scanned', {'games': [{'round': round, 'numbers': [1,2,3,4,5,6]}]})[0], 200, 'QR control')
            scan_path = f'/api/records/v1/lotto_draw_scan_counts/{round}'
            qr_before = request(base, scan_path)

            # All fixture writes are one transaction in this newly created disposable depot.
            seed = """
import {Database} from 'bun:sqlite';
const [round,user] = JSON.parse(process.argv[1]);
const db = new Database('/app/traildepot/data/main.db');
db.exec('PRAGMA foreign_keys=ON');
const owner = Buffer.from(user, 'base64url');
db.transaction(() => {
  const now = Date.now();
  for (let i=0;i<120;i++) {
    const source = i<40?'miniapp':i<80?'web':'bot';
    const at = i%40<20?now-172800000:now-1000;
    const id = Number(db.query("INSERT INTO lotto_public_generations(round,display_name,number_1,number_2,number_3,number_4,number_5,number_6,created_at) VALUES (?,'archive fixture',1,2,3,4,5,6,?)").run(round,at).lastInsertRowid);
    db.query('INSERT INTO ait_lotto_generation_origins VALUES (?,?,?)').run(id,source==='bot'?'bot':'human',source);
    if (source==='miniapp') db.query('INSERT INTO ait_lotto_generation_requests VALUES (?,?,?,?,?)').run(owner,'archive-request-'+i,id,JSON.stringify({round,options:{}}),at);
    if (source==='web') db.query('INSERT INTO web_lotto_generation_batches VALUES (?,?,?,?,?)').run(owner,'archive-request-'+i,JSON.stringify({round,games:[[1,2,3,4,5,6]]}),JSON.stringify([id]),at);
  }
  db.query('INSERT INTO ait_lotto_attendance VALUES (?,?,?)').run(owner,Math.floor((now+32400000)/86400000),now);
})();
db.close();
"""
            command('docker', 'exec', name, 'bun', '-e', seed, json.dumps([closed, session['user']['id']]))
            path = f'/api/app/v1/lotto/feed?round={closed}'
            deadline = time.monotonic() + 90
            while time.monotonic() < deadline:
                status, archived = request(base, path)
                expect(status, 200, 'archive feed')
                if archived.get('archived'):
                    break
                time.sleep(.25)
            else:
                raise AssertionError('The scheduled archive did not complete within one minute')
            assert archived['totalGenerations'] == 120
            assert archived['numberCounts'] == [120]*6 + [0]*39
            assert archived['generations'] == [] and archived['nextCursor'] is None
            assert request(base, path)[1]['totalGenerations'] == 120

            check = """
import {Database} from 'bun:sqlite';
const db = new Database('/app/traildepot/data/main.db',{readonly:true});
const round = Number(process.argv[1]);
const scalar = (sql,...params) => db.query(sql).values(...params)[0][0];
console.log(JSON.stringify({
  details:scalar('SELECT count(*) FROM lotto_public_generations WHERE round=?',round),
  counters:scalar('SELECT count(*) FROM lotto_draw_generation_counts WHERE round=?',round),
  requests:scalar('SELECT count(*) FROM ait_lotto_generation_requests'),
  webBatches:scalar('SELECT count(*) FROM web_lotto_generation_batches'),
  attendance:scalar('SELECT count(*) FROM ait_lotto_attendance'),
  purged:scalar('SELECT purged_at IS NOT NULL FROM lotto_generation_weekly_archives WHERE round=?',round),
  fkErrors:scalar('SELECT count(*) FROM pragma_foreign_key_check')
}));db.close();
"""
            state = json.loads(command('docker', 'exec', name, 'bun', '-e', check, str(closed)))
            assert state == {'details': 0, 'counters': 0, 'requests': 20, 'webBatches': 21, 'attendance': 1, 'purged': 1, 'fkErrors': 0}, state
            expect(request(base, '/api/web/v1/lotto/generations', {**payload, 'requestId': 'archive-request-40', 'round': closed}, auth)[0], 409, 'expired request cannot republish')
            assert request(base, scan_path) == qr_before, 'QR scan counts changed'
            private_status, private = request(base, '/api/records/v1/lotto_generation_weekly_archives')
            # Unregistered Record APIs can fall through to the depot's HTML shell (200).
            assert private_status in (400,401,403,404) or private is None or isinstance(private,dict) and 'error' in private, 'Raw archive table was exposed'
            # The new round and its real Record API subscriptions still accept new activity.
            stream = HTTP.open(base + '/api/records/v1/lotto_draw_generation_counts/subscribe/*', timeout=10)
            try:
                expect(request(base, '/api/web/v1/lotto/generations', {**payload, 'requestId': uuid.uuid4().hex}, auth)[0], 200, 'generation after archive')
                found = False
                for _ in range(20):
                    line = stream.readline().decode().strip()
                    if line.startswith('data:'):
                        row = json.loads(line[5:]).get('Update', {})
                        if row.get('round') == round and row.get('total_generations') == 2:
                            found = True
                            break
                assert found, 'Open-round counters stopped publishing'
            finally:
                stream.close()
            current = request(base, f'/api/app/v1/lotto/feed?round={round}')[1]
            assert current['totalGenerations'] == 2 and current['archived'] is False
            print(json.dumps({'generation_archive': 'passed', 'checks': [
                'real scheduled WASM job with miniapp disabled', 'closed-round aggregate feed',
                'bounded detail and private request cleanup', 'attendance and QR isolation',
                'current-round Record API subscription']}), flush=True)
        finally:
            cleanup_case(name, folder, image)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--image', default='645-trailbase:miniapp')
    run(parser.parse_args().image)

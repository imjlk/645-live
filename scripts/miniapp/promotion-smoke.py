"""Test monetary retries with a disposable DB and local fake provider; never calls Toss."""
import base64
import concurrent.futures
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import platform
import subprocess
import tempfile
import threading
import time
import uuid

from smoke import cleanup_case, command, expect, request


def run():
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
            elif self.path.endswith('/promotion/reward/grant'):
                grants.append(data['providerRequestId'])
                if data['promotionCode'] == 'unknown-outcome':
                    self.send_error(504)
                    return
                result = {'providerStatus': 'PENDING', 'providerTransactionKey': 'fixture-transaction'}
            elif self.path.endswith('/promotion/reward/status'):
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
                    '-e', 'AIT_PROMOTIONS_ENABLED=true', '-e', 'RUNTIME_THREADS=4',
                    '-e', f'MTLS_PROXY_URL=http://host.docker.internal:{server.server_port}',
                    '-e', 'MTLS_PROXY_TOKEN=fixture-token', '645-trailbase:miniapp')
                base = 'http://127.0.0.1:' + command('docker', 'port', name, '4000/tcp').rsplit(':', 1)[1]
                for _ in range(100):
                    try:
                        if request(base, '/api/healthcheck')[0] == 200:
                            break
                    except OSError:
                        pass
                    time.sleep(.2)
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
                now = request(base, '/api/app/v1/attendance/status', headers=auth)[1]['serverTime']
                day = (now + 32400000) // 86400000
                fixture([
                    *[('INSERT INTO ait_lotto_attendance(user_id,day,created_at) VALUES (?,?,?)', [user, day - n, now]) for n in range(5)],
                    ("INSERT INTO promotion_campaigns(id,feature_key,provider_promotion_code,reward_amount,status,starts_at,ends_at,budget_limit_amount,max_grant_count,created_at,updated_at) VALUES ('fixture-1','ait_lotto_attendance','pending-then-success',1,'ACTIVE',?,?,1,1,?,?)", [now - 1000, now + 86400000, now, now])
                ])
                attendance = request(base, '/api/app/v1/attendance/status', headers=auth)[1]
                assert attendance['streak'] == 5 and attendance['promotion'] is not None, {k: attendance[k] for k in ['streak', 'serverTime', 'promotion']}
                path = '/api/app/v1/attendance/promotion/claim'
                body = {'campaignId': 'fixture-1'}
                with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                    replies = list(pool.map(lambda _: request(base, path, body, auth), range(4)))
                assert any(status == 200 for status, _ in replies), [(status, result.get('error', {}).get('code')) for status, result in replies]
                assert all(status in (200, 409) for status, _ in replies), [status for status, _ in replies]
                assert len(grants) == 1, 'concurrent requests issued more than one grant'
                visible = request(base, '/api/app/v1/attendance/status', headers=auth)[1]['promotion']
                assert visible['campaignId'] == 'fixture-1', 'exhausted campaign hid its existing claim'
                status, result = request(base, path, body, auth)
                expect(status, 200, 'status-only reconciliation')
                assert result['status'] == 'success' and len(grants) == 1
                assert request(base, path, body, auth)[1]['status'] == 'success' and len(grants) == 1
                claim_id = visible['claimId']
                fixture([("DELETE FROM promotion_campaigns WHERE id='fixture-1'", [])])
                orphan = request(base, '/api/app/v1/attendance/status', headers=auth)[1]['promotion']
                assert orphan['campaignId'] is None and orphan['claimId'] == claim_id
                assert request(base, path, {'claimId': claim_id}, auth)[1]['status'] == 'success'
                fixture([("INSERT INTO promotion_campaigns(id,feature_key,provider_promotion_code,reward_amount,status,starts_at,ends_at,budget_limit_amount,max_grant_count,created_at,updated_at) VALUES ('fixture-2','ait_lotto_attendance','unknown-outcome',1,'ACTIVE',?,?,1,1,?,?)", [now - 500, now + 86400000, now, now])])
                status, _ = request(base, path, {'campaignId': 'fixture-2'}, auth)
                expect(status, 500, 'ambiguous provider outcome')
                fixture([("UPDATE promotion_reward_ledger SET created_at=? WHERE campaign_id='fixture-2'", [now - 601000])])
                status, result = request(base, path, {'campaignId': 'fixture-2'}, auth)
                expect(status, 200, 'unknown outcome review')
                assert result['status'] == 'needs_review' and len(grants) == 2
                assert len(set(grants)) == 2
                fixture([("INSERT INTO promotion_campaigns(id,feature_key,provider_promotion_code,reward_amount,status,starts_at,ends_at,budget_limit_amount,max_grant_count,created_at,updated_at) VALUES ('fixture-3','ait_lotto_attendance','withdrawal-test',1,'ACTIVE',?,?,10,10,?,?)", [now - 250, now + 86400000, now, now])])
                expect(request(base, path, {'campaignId': 'fixture-3'}, auth)[0], 200, 'third campaign')
                assert len(grants) == 3
                expect(request(base, '/api/app/v1/session/withdraw', {}, auth)[0], 200, 'withdraw after grant request')
                status, restored = request(base, '/api/app/v1/session/bootstrap', {'anonymousHash': seed})
                expect(status, 200, 'recreate anonymous profile')
                assert restored['user']['id'] != session['user']['id']
                tokens = restored['authTokens']
                auth = {'Authorization': 'Bearer ' + tokens['authToken'], 'CSRF-Token': tokens['csrfToken'], 'Refresh-Token': tokens['refreshToken']}
                user = list(base64.urlsafe_b64decode(restored['user']['id'] + '=='))
                fixture([('INSERT INTO ait_lotto_attendance(user_id,day,created_at) VALUES (?,?,?)', [user, day - n, now]) for n in range(5)])
                visible = request(base, '/api/app/v1/attendance/status', headers=auth)[1]['promotion']
                assert visible['status'] == 'already_claimed' and not visible['eligible']
                status, result = request(base, path, {'campaignId': 'fixture-3'}, auth)
                expect(status, 409, 'withdrawal must not allow another reward')
                assert result['error']['code'] == 'PROMOTION_ALREADY_CLAIMED' and len(grants) == 3
                usage = command('docker','exec',name,'bun','-e',"import {Database} from 'bun:sqlite'; const db=new Database('/app/traildepot/data/main.db',{readonly:true}); console.log(db.query(\"SELECT reserved_amount FROM ait_lotto_promotion_usage WHERE campaign_id='fixture-3'\").get().reserved_amount); db.close();")
                assert usage == '1', 'withdrawal replenished campaign budget'
                print(json.dumps({'case': 'promotion-retries', 'passed': [
                    'one grant under concurrent requests', 'status-only reconciliation',
                    'exhausted or deleted campaign remains readable', 'unknown outcomes never issue a second grant',
                    'withdrawal preserves budget and blocks repeat claims'
                ]}), flush=True)
            finally:
                cleanup_case(name, folder, '645-trailbase:miniapp')
    finally:
        server.shutdown()
        server.server_close()
        worker.join(timeout=5)


if __name__ == '__main__':
    run()

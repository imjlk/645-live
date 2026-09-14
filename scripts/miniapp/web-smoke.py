"""Web and Toss share only the public generation ledger; runs on disposable Docker data."""
import argparse
import base64
import concurrent.futures
import json
import os
from pathlib import Path
import sqlite3
import tempfile
import time
import uuid
from smoke import command, request, expect, cleanup_case, HTTP


def run(image, ait):
    name = '645-web-test-' + uuid.uuid4().hex[:8]
    with tempfile.TemporaryDirectory(prefix='645-web-test-') as folder:
        try:
            command('docker', 'run', '-d', '--name', name, '-p', '127.0.0.1::4000', '-v', f'{folder}:/app/traildepot',
                    '-e', 'BACKFILL_ON_STARTUP=false', '-e', f'AIT_ENABLED={str(ait).lower()}', '-e', 'AIT_ALLOW_DEV_IDENTITY=true',
                    '-e', 'AIT_BOTS_ENABLED=false', '-e', 'RUNTIME_THREADS=4', image)
            base = 'http://127.0.0.1:' + command('docker', 'port', name, '4000/tcp').rsplit(':', 1)[1]
            for _ in range(120):
                try:
                    if request(base, '/api/healthcheck')[0] == 200: break
                except OSError: pass
                time.sleep(.25)
            else: raise AssertionError('startup failed')
            def connect(key):
                status, data = request(base, '/api/web/v1/lotto/session', {'installationKey': key})
                expect(status, 200, 'web bootstrap')
                t = data['authTokens']
                return data['user'], {'Authorization': 'Bearer '+t['authToken'], 'CSRF-Token': t['csrfToken']}
            key = base64.urlsafe_b64encode(os.urandom(32)).decode().rstrip('=')
            user, auth = connect(key)
            assert connect(key)[0]['id'] == user['id']
            other, other_auth = connect(base64.urlsafe_b64encode(os.urandom(32)).decode().rstrip('='))
            assert other['id'] != user['id']
            expect(request(base, '/api/web/v1/lotto/session', {'installationKey': 'ait:forged'})[0], 400, 'invalid identity')
            expect(request(base, '/api/web/v1/lotto/heartbeat', {}, auth)[0], 200, 'web heartbeat')
            round = request(base, '/api/app/v1/lotto/round-context')[1]['targetRound']
            payload = {'requestId': uuid.uuid4().hex, 'round': round, 'games': [[45,1,11,21,31,41]]}
            if ait:
                for path, body in [('/session/me',None),('/attendance/status',None),('/attendance/check-in',{}),
                        ('/lotto/generations',{'requestId':uuid.uuid4().hex,'round':round,'options':{}}),
                        ('/ads/start',{'placement':'custom'}),('/session/withdraw',{})]:
                    assert request(base, '/api/app/v1'+path, body, auth)[0] in (401,403), path
                status, toss = request(base, '/api/app/v1/session/bootstrap', {'anonymousHash':'dev-anon-'+uuid.uuid4().hex})
                expect(status,200,'Toss still bootstraps')
                ta={'Authorization':'Bearer '+toss['authTokens']['authToken'],'CSRF-Token':toss['authTokens']['csrfToken']}
                expect(request(base,'/api/web/v1/lotto/generations',payload,ta)[0],401,'Toss is not web')
            for table in ['web_lotto_profiles','web_lotto_generation_batches','ait_lotto_generation_origins']:
                status, private = request(base,'/api/records/v1/'+table)
                assert status in (400,401,403,404) or private is None or isinstance(private,dict) and 'error' in private, table
            expect(request(base,'/scanned',{'games':[{'round':round,'numbers':[1,11,21,31,41,45]}]})[0],200,'QR seed')
            scan_path=f'/api/records/v1/lotto_draw_scan_counts/{round}'
            before=request(base,scan_path)
            streams=[HTTP.open(base+'/api/records/v1/lotto_public_generations/subscribe/*',timeout=15) for _ in range(2)]
            try:
                with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                    replies=list(pool.map(lambda _:request(base,'/api/web/v1/lotto/generations',payload,auth),range(4)))
                assert all(s==200 for s,_ in replies), [s for s,_ in replies]
                gid=replies[0][1]['generations'][0]['id']
                assert {r['generations'][0]['id'] for _,r in replies}=={gid}
                for stream in streams:
                    found=False
                    for _ in range(20):
                        line=stream.readline().decode().strip()
                        if line.startswith('data:') and 'Insert' in json.loads(line[5:]): found=True;break
                    assert found, 'shared subscriber missed web generation'
            finally:
                for stream in streams: stream.close()
            expect(request(base,'/api/web/v1/lotto/generations',{**payload,'games':[[1,2,3,4,5,6]]},auth)[0],409,'payload conflict')
            expect(request(base,'/api/web/v1/lotto/generations',{**payload,'requestId':uuid.uuid4().hex,'round':round-1},auth)[0],409,'stale round')
            batch={'requestId':uuid.uuid4().hex,'round':round,'games':[[1,2,3,4,5,6] for _ in range(100)]}
            bad={**batch,'games':batch['games'][:-1]+[[1,1,2,3,4,5]]}
            expect(request(base,'/api/web/v1/lotto/generations',bad,auth)[0],400,'all games validated before insertion')
            time.sleep(.9)
            status, hundred=request(base,'/api/web/v1/lotto/generations',batch,auth);expect(status,200,'100 game batch')
            assert len(hundred['generations'])==100
            feed=request(base,f'/api/app/v1/lotto/feed?round={round}')[1]
            assert feed['totalGenerations']==101 and sum(feed['numberCounts'])==606
            ids=set(); cursor=None
            while True:
                page=request(base,f'/api/app/v1/lotto/feed?round={round}'+('&cursor='+cursor if cursor else ''))[1]
                page_ids={g['id'] for g in page['generations']};assert not ids.intersection(page_ids);ids.update(page_ids)
                cursor=page['nextCursor']
                if not cursor:break
            assert len(ids)==101
            assert request(base,scan_path)==before, 'QR counters changed'
            assert request(base,'/api/web/v1/lotto/generations/delete',{'id':gid},other_auth)[1]['deleted'] is False
            assert request(base,'/api/web/v1/lotto/generations/delete',{'id':gid},auth)[1]['deleted'] is True
            expect(request(base,'/api/web/v1/lotto/generations',payload,auth)[0],409,'deleted replay tombstone')
            bid=hundred['generations'][0]['id']
            expect(request(base,'/api/web/v1/lotto/generations/delete',{'id':bid},auth)[0],200,'delete one from batch')
            expect(request(base,'/api/web/v1/lotto/generations',batch,auth)[0],409,'partial batch tombstone')
            with sqlite3.connect(f'file:{folder}/data/main.db?mode=ro',uri=True) as db:
                assert db.execute("SELECT count(*) FROM ait_lotto_generation_origins WHERE source='web' AND actor_kind='human'").fetchone()[0]==99
            expect(request(base,'/api/web/v1/lotto/withdraw',{},auth)[0],200,'web deletion')
            assert request(base,f'/api/app/v1/lotto/feed?round={round}')[1]['totalGenerations']==0
            expect(request(base,'/api/web/v1/lotto/heartbeat',{},auth)[0],401,'deleted credential rejected')
            assert request(base,scan_path)==before
            print(json.dumps({'case':'web-with-toss' if ait else 'web-without-toss','passed':['isolated official auth','shared SSE across two clients','atomic 100-game publication','idempotent concurrent retries','pagination','owner deletion and batch tombstones','private metadata ACL','QR counters unchanged','account deletion']},ensure_ascii=False),flush=True)
        finally: cleanup_case(name,folder,image)

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--image',default='645-trailbase:miniapp');a=p.parse_args()
    run(a.image,True)
    run(a.image,False)

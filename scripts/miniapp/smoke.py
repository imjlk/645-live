"""Exercise the miniapp against an isolated depot. Never mount the production/local source DB."""
from pathlib import Path
import argparse
import concurrent.futures
import json
import os
import shutil
import sqlite3
import subprocess
import tempfile
import time
import urllib.error
import urllib.request
import uuid

ROOT = Path(__file__).resolve().parents[2]
SOURCE = ROOT / 'services/trailbase/traildepot'
HTTP = urllib.request.build_opener(urllib.request.ProxyHandler({}))

def command(*args):
    result = subprocess.run(args, text=True, capture_output=True, timeout=60)
    if result.returncode:
        raise RuntimeError(f'{args[0]} failed (exit {result.returncode})')
    return result.stdout.strip()

def request(base, path, body=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(base + path, data=data, headers={'Content-Type':'application/json', **(headers or {})})
    try:
        with HTTP.open(req, timeout=10) as response:
            status, raw = response.status, response.read()
    except urllib.error.HTTPError as response:
        status, raw = response.code, response.read()
    try: parsed = json.loads(raw)
    except ValueError: parsed = None
    return status, parsed

def expect(status, expected, name):
    assert status == expected, f'{name}: expected HTTP {expected}, got {status}'

def run_case(image, copy_existing):
    name = '645-miniapp-test-' + uuid.uuid4().hex[:8]
    checks = []
    with tempfile.TemporaryDirectory(prefix='645-miniapp-') as folder:
        depot = Path(folder)
        if copy_existing:
            (depot/'data').mkdir()
            for source in (SOURCE/'data').glob('*.db'):
                with sqlite3.connect(f'file:{source}?mode=ro', uri=True) as src:
                    with sqlite3.connect(depot/'data'/source.name) as dst: src.backup(dst)
            shutil.copyfile(SOURCE/'metadata.textproto',depot/'metadata.textproto')
        try:
            command('docker','run','-d','--name',name,'-p','127.0.0.1::4000','-v',f'{depot}:/app/traildepot',
                '-e','BACKFILL_ON_STARTUP=false','-e','AIT_ENABLED=true','-e','AIT_ALLOW_DEV_IDENTITY=true',
                '-e','AIT_BOTS_ENABLED=false','-e','AIT_TEST_ADS=true',image)
            def base_url(): return 'http://127.0.0.1:'+command('docker','port',name,'4000/tcp').rsplit(':',1)[1]
            base=base_url()
            for _ in range(100):
                try:
                    if request(base,'/api/healthcheck')[0]==200: break
                except (OSError,ValueError): pass
                time.sleep(.2)
            else: raise AssertionError('TrailBase startup failed')
            checks.append('existing TS and Rust components loaded')
            def bootstrap(seed):
                status,data=request(base,'/api/app/v1/session/bootstrap',{'anonymousHash':seed})
                expect(status,200,'bootstrap')
                tokens=data['authTokens']
                return data['user'],{'Authorization':'Bearer '+tokens['authToken'],'CSRF-Token':tokens['csrfToken'],'Refresh-Token':tokens['refreshToken']}
            seed='dev-anon-'+uuid.uuid4().hex
            user,auth=bootstrap(seed)
            other,other_auth=bootstrap('dev-anon-'+uuid.uuid4().hex)
            again,_=bootstrap(seed)
            assert again['id']==user['id'] and other['id']!=user['id']
            expect(request(base,'/api/app/v1/session/me',headers=auth)[0],200,'official TrailBase user')
            assert request(base,'/api/app/v1/session/bootstrap',{'anonymousHash':'ait:'+uuid.uuid4().hex})[0] != 200, 'unverified production identity accepted'
            expect(request(base,'/api/app/v1/presence/heartbeat',{},auth)[0],200,'heartbeat')
            checks.append('anonymous bootstrap reuses official principal')
            status,context=request(base,'/api/app/v1/lotto/round-context');expect(status,200,'context')
            round=context['targetRound']
            scan_path=f'/api/records/v1/lotto_draw_scan_counts/{round}'
            scan_before=request(base,scan_path)
            payload={'requestId':uuid.uuid4().hex,'round':round,'options':{'fixed':[],'excluded':[],'oddCount':None}}
            expect(request(base,'/api/app/v1/lotto/generations',payload)[0],401,'anonymous write')
            expect(request(base,'/api/records/v1/lotto_public_generations',{'round':round},auth)[0],403,'record write ACL')
            for table in ['ait_lotto_profiles','ait_lotto_generation_origins','ait_lotto_generation_requests','ait_lotto_ad_sessions','message_outbox','promotion_reward_ledger']:
                status,private=request(base,f'/api/records/v1/{table}')
                assert status in (400,401,403,404) or private is None or (isinstance(private,dict) and 'error' in private), f'{table} exposed (status={status}, keys={list(private) if isinstance(private,dict) else type(private).__name__})'
            checks.append('private identity and origin metadata inaccessible')
            # Two independent subscribers both observe the committed generation.
            streams=[HTTP.open(base+'/api/records/v1/lotto_public_generations/subscribe/*',timeout=10) for _ in range(2)]
            try:
                status,data=request(base,'/api/app/v1/lotto/generations',payload,auth);expect(status,200,'generate')
                generation=data['generation'];numbers=generation['numbers']
                assert len(set(numbers))==6 and numbers==sorted(numbers) and all(1<=n<=45 for n in numbers)
                assert not any(key in generation for key in ['actorKind','source','userId','anonymousHash'])
                for stream in streams:
                    received=False
                    for _ in range(20):
                        line=stream.readline().decode().strip()
                        if line.startswith('data:'):
                            event=json.loads(line[5:]);received='Insert' in event or 'Update' in event
                            if received: break
                    assert received,'subscriber missed insertion'
            finally:
                for stream in streams: stream.close()
            checks.append('two clients receive real SSE insertion')
            status,counts=request(base,f'/api/records/v1/lotto_draw_generation_counts/{round}');expect(status,200,'counts')
            assert counts['total_generations']==1
            for number in range(1,46): assert counts[f'generation_count_{number}']==int(number in numbers)
            assert scan_before==request(base,scan_path),'QR counters changed'
            checks.append('all 45 counters match; QR scans untouched')
            with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
                replies=list(pool.map(lambda _:request(base,'/api/app/v1/lotto/generations',payload,auth),range(4)))
            assert all(status==200 and response['generation']['id']==generation['id'] for status,response in replies)
            assert request(base,f'/api/records/v1/lotto_draw_generation_counts/{round}')[1]['total_generations']==1
            changed={**payload,'round':round+1};expect(request(base,'/api/app/v1/lotto/generations',changed,auth)[0],409,'idempotency payload mismatch')
            invalid={**payload,'requestId':uuid.uuid4().hex,'round':round-1};expect(request(base,'/api/app/v1/lotto/generations',invalid,auth)[0],409,'stale round')
            invalid={**payload,'requestId':uuid.uuid4().hex,'options':{'fixed':[1,1],'excluded':[],'oddCount':None}};expect(request(base,'/api/app/v1/lotto/generations',invalid,auth)[0],400,'invalid filters')
            custom={**payload,'requestId':uuid.uuid4().hex,'options':{'fixed':[1,2],'excluded':[3,4],'oddCount':3}};expect(request(base,'/api/app/v1/lotto/generations',custom,auth)[0],403,'custom pass required')
            checks.append('concurrent retries are idempotent; round and filters validated')
            for _ in range(2):expect(request(base,'/api/app/v1/attendance/check-in',{},auth)[0],200,'attendance')
            attendance=request(base,'/api/app/v1/attendance/status',headers=auth)[1];assert attendance['streak']==1 and attendance['checkedIn']
            status,ad=request(base,'/api/app/v1/ads/start',{'placement':'custom'},auth);expect(status,200,'ad reserve')
            expect(request(base,'/api/app/v1/ads/complete',{'id':ad['id'],'events':['show','impression','dismissed','userEarnedReward']},other_auth)[0],404,'ad owner')
            events=['show','impression','dismissed','userEarnedReward']
            status,grant=request(base,'/api/app/v1/ads/complete',{'id':ad['id'],'events':events},auth);expect(status,200,'ad completion')
            again=request(base,'/api/app/v1/ads/complete',{'id':ad['id'],'events':events},auth)[1];assert again['expiresAt']==grant['expiresAt']
            time.sleep(.85)
            status,data=request(base,'/api/app/v1/lotto/generations',custom,auth);expect(status,200,'custom generation')
            n=data['generation']['numbers'];assert 1 in n and 2 in n and 3 not in n and 4 not in n and sum(v%2 for v in n)==3
            status,cancel_ad=request(base,'/api/app/v1/ads/start',{'placement':'report'},other_auth);expect(status,200,'cancel reserve')
            expect(request(base,'/api/app/v1/ads/complete',{'id':cancel_ad['id'],'events':['dismissed']},other_auth)[0],409,'incomplete ad')
            expect(request(base,'/api/app/v1/ads/complete',{'id':cancel_ad['id'],'events':events},other_auth)[0],409,'cancelled ad cannot be reused')
            expect(request(base,'/api/app/v1/ads/start',{'placement':'report'},other_auth)[0],429,'cancel preserves cooldown')
            checks.append('KST check-in and ad entitlement are idempotent and owned')
            gid=generation['id']
            assert request(base,'/api/app/v1/lotto/generations/delete',{'id':gid},other_auth)[1]['deleted'] is False
            with HTTP.open(base+f'/api/records/v1/lotto_draw_generation_counts/subscribe/{round}',timeout=10) as stream:
                assert request(base,'/api/app/v1/lotto/generations/delete',{'id':gid},auth)[1]['deleted'] is True
                assert any(line.decode().startswith('data:') for line in iter(stream.readline,b''))
            expect(request(base,'/api/app/v1/lotto/generations',payload,auth)[0],409,'deleted request tombstone')
            counts=request(base,f'/api/records/v1/lotto_draw_generation_counts/{round}')[1];assert counts['total_generations']==1
            public=request(base,'/api/records/v1/lotto_public_generations?limit=30')[1]['records'];assert all(not any(k in r for k in ['actor_kind','source','user_id']) for r in public)
            command('docker','restart',name);base=base_url()
            for _ in range(100):
                try:
                    if request(base,'/api/healthcheck')[0]==200:break
                except OSError:pass
                time.sleep(.2)
            restored,_=bootstrap(seed);assert restored['id']==user['id']
            assert request(base,f'/api/records/v1/lotto_draw_generation_counts/{round}')[1]['total_generations']==1
            checks.append('delete tombstone, counter subscriptions, restart persistence')
            expect(request(base,'/api/app/v1/session/withdraw',{},auth)[0],200,'withdrawal')
            assert request(base,f'/api/records/v1/lotto_draw_generation_counts/{round}')[1]['total_generations']==0
            assert request(base,'/api/app/v1/session/me',headers=auth)[0] in (401,403)
            checks.append('withdrawal removes owned public and private data')
            print(json.dumps({'case':'existing-copy' if copy_existing else 'fresh','passed':checks},ensure_ascii=False),flush=True)
        except Exception:
            log=subprocess.run(['docker','logs',name],text=True,capture_output=True)
            for line in (log.stdout+log.stderr).splitlines():
                if ('ERROR' in line or 'miniapp ' in line) and not any(word in line.lower() for word in ['token','secret','password','email']): print(line[-400:],flush=True)
            raise
        finally:
            subprocess.run(['docker','rm','-f',name],capture_output=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--image',default='645-trailbase:miniapp');parser.add_argument('--fresh-only',action='store_true');args=parser.parse_args()
    run_case(args.image,False)
    if not args.fresh_only and (SOURCE/'data/main.db').exists(): run_case(args.image,True)

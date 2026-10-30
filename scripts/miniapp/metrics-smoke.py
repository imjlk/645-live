"""Synthetic, isolated metrics endpoint verification; never touches an existing depot."""
from pathlib import Path
import json, os, sqlite3, tempfile, time, uuid
from smoke import command, request, expect, cleanup_case

def variant(user):
    h=2166136261
    for c in 'generation-cadence-v2:'+user: h=((h^ord(c))*16777619)&0xffffffff
    h=((h^(h>>16))*0x85ebca6b)&0xffffffff
    h=((h^(h>>13))*0xc2b2ae35)&0xffffffff
    h^=h>>16
    return 'control' if h%2==0 else 'short'

def run():
    image=os.environ.get('MINIAPP_TEST_IMAGE','645-trailbase:miniapp')
    name='645-metrics-'+uuid.uuid4().hex[:8]
    with tempfile.TemporaryDirectory(prefix='645-metrics-') as folder:
        try:
            command('docker','run','-d','--name',name,'-p','127.0.0.1::4000','-v',f'{folder}:/app/traildepot','-e','BACKFILL_ON_STARTUP=false','-e','AIT_ENABLED=true','-e','AIT_ALLOW_DEV_IDENTITY=true','-e','AIT_BOTS_ENABLED=false','-e','AIT_TEST_ADS=true',image)
            base='http://127.0.0.1:'+command('docker','port',name,'4000/tcp').rsplit(':',1)[1]
            for _ in range(100):
                try:
                    if request(base,'/api/healthcheck')[0]==200: break
                except OSError: pass
                time.sleep(.2)
            else: raise AssertionError('startup failed')
            status,data=request(base,'/api/app/v1/session/bootstrap',{'anonymousHash':'dev-anon-'+uuid.uuid4().hex});expect(status,200,'bootstrap')
            auth={'Authorization':'Bearer '+data['authTokens']['authToken'],'CSRF-Token':data['authTokens']['csrfToken']}
            arm=variant(data['user']['id'])
            policy='generation-cadence-v2/'+arm+(':device:3-3:3-12' if arm=='control' else ':device:1-3:2-8')
            props=dict(placement='generation_continue',format='rewarded',policy=policy,flow_id='flow',outcome='',entry_point='continuation',app_version='1.6.0',session_id='synthetic',event_id='synthetic-1')
            event=dict(eventName='experiment_exposed',eventPayload=props,clientCreatedAt=int(time.time()*1000))
            payload={'events':[event]}
            expect(request(base,'/api/app/v1/metrics',payload)[0],401,'auth required')
            expect(request(base,'/api/app/v1/metrics',payload,auth)[0],200,'record')
            expect(request(base,'/api/app/v1/metrics',payload,auth)[0],200,'deduplicate retry')
            with sqlite3.connect(Path(folder)/'data/analytics.db') as db:
                assert db.execute('SELECT count(*) FROM events').fetchone()[0]==1
                assert db.execute('SELECT source FROM events').fetchone()[0]==arm
                for f in ['11-generation-ab-funnel.sql','12-generation-ab-retention.sql']:
                    # Queries run from main with analytics attached, as in the editor.
                    with sqlite3.connect(':memory:') as query:
                        query.execute('ATTACH DATABASE ? AS analytics',(str(Path(folder)/'data/analytics.db'),))
                        query.execute((Path(__file__).resolve().parents[2]/'services/trailbase/sql'/f).read_text()).fetchall()
            wrong=json.loads(json.dumps(payload));wrong['events'][0]['eventPayload']['policy']='wrong'
            expect(request(base,'/api/app/v1/metrics',wrong,auth)[0],400,'policy validation')
            wrong=json.loads(json.dumps(payload));wrong['events'][0]['eventPayload']['secret']='not-allowed'
            expect(request(base,'/api/app/v1/metrics',wrong,auth)[0],400,'payload allowlist')
            status,public=request(base,'/api/records/v1/events',headers=auth)
            assert status in (400,401,403,404) or public is None, f'unexpected public records response: {status}'
            expect(request(base,'/api/app/v1/session/withdraw',{},auth)[0],200,'withdrawal')
            with sqlite3.connect(Path(folder)/'data/analytics.db') as db:
                assert db.execute('SELECT count(*) FROM events').fetchone()[0]==0
            print('metrics auth, cohort, retry deduplication, private database, SQL and withdrawal passed')
        finally: cleanup_case(name,folder,image)
if __name__=='__main__': run()

"""Attendance enrollment and threshold checks in a disposable local depot; no provider calls."""
import json, os, tempfile, time, uuid
from pathlib import Path
from smoke import command, request, expect, cleanup_case, SOURCE

def variant(principal):
    h=2166136261
    for c in 'generation-cadence-v2:'+principal: h=((h^ord(c))*16777619)&0xffffffff
    h=((h^(h>>16))*0x85ebca6b)&0xffffffff
    h=((h^(h>>13))*0xc2b2ae35)&0xffffffff
    h^=h>>16
    return 'control' if h%2==0 else 'short'

def run():
    image=os.environ.get('MINIAPP_TEST_IMAGE','645-trailbase:miniapp')
    name='645-attendance-'+uuid.uuid4().hex[:8]
    with tempfile.TemporaryDirectory(prefix='645-attendance-') as folder:
        try:
            command('docker','run','-d','--name',name,'-p','127.0.0.1::4000','-v',f'{folder}:/app/traildepot','-e','BACKFILL_ON_STARTUP=false','-e','AIT_ENABLED=true','-e','AIT_ALLOW_DEV_IDENTITY=true','-e','AIT_BOTS_ENABLED=false','-e','AIT_TEST_ADS=false','-e','AIT_PROMOTIONS_ENABLED=false',image)
            base='http://127.0.0.1:'+command('docker','port',name,'4000/tcp').rsplit(':',1)[1]
            for _ in range(100):
                try:
                    if request(base,'/api/healthcheck')[0]==200: break
                except OSError: pass
                time.sleep(.2)
            else: raise AssertionError('startup failed')
            route='/api/app/v1/attendance/status'
            enroll={'experiment':'generation-cadence-v3'}
            expect(request(base,route,enroll)[0],401,'enrollment authentication')
            round=request(base,'/api/app/v1/lotto/round-context')[1]['targetRound']
            def account():
                code,data=request(base,'/api/app/v1/session/bootstrap',{'anonymousHash':'dev-anon-'+uuid.uuid4().hex})
                expect(code,200,'bootstrap')
                auth={'Authorization':'Bearer '+data['authTokens']['authToken'],'CSRF-Token':data['authTokens']['csrfToken']}
                return data['user']['id'],auth
            def generate(auth):
                time.sleep(1.05)
                body={'requestId':uuid.uuid4().hex,'round':round,'options':{},'clientManagedCounter':True}
                code,data=request(base,'/api/app/v1/lotto/generations',body,auth);expect(code,200,'generation')
                return body,data
            seen=set()
            for _ in range(24):
                principal,auth=account();arm=variant(principal)
                if arm in seen: continue
                seen.add(arm)
                legacy=request(base,route,headers=auth)[1]
                assert legacy['requiredGenerations']==1 and legacy['attendanceExperiment'] is None
                expect(request(base,route,{'experiment':'wrong'},auth)[0],400,'unknown enrollment')
                code,state=request(base,route,enroll,auth);expect(code,200,'enroll')
                n=state['requiredGenerations'];assert 3<=n<=5 if arm=='control' else n==1
                assert request(base,route,enroll,auth)[1]['requiredGenerations']==n
                expect(request(base,'/api/app/v1/attendance/check-in',{},auth)[0],403,'not eligible')
                body,data=generate(auth)
                assert data['attendanceProgress']['generatedCount']==1
                assert data['attendanceProgress']['canCheckIn']==(n==1)
                replay=request(base,'/api/app/v1/lotto/generations',body,auth)[1]
                assert replay['replayed'] and replay['attendanceProgress']['generatedCount']==1
                expect(request(base,'/api/app/v1/lotto/generations/delete',{'id':data['generation']['id']},auth)[0],200,'delete public generation')
                assert request(base,route,headers=auth)[1]['generatedCount']==1
                if n>1: expect(request(base,'/api/app/v1/attendance/check-in',{},auth)[0],403,'legacy request cannot bypass enrolled target')
                for count in range(2,n+1):
                    _,data=generate(auth)
                    assert data['attendanceProgress']['generatedCount']==count
                    assert data['attendanceProgress']['canCheckIn']==(count==n)
                expect(request(base,'/api/app/v1/attendance/check-in',{},auth)[0],200,'eligible check in')
                assert request(base,'/api/app/v1/attendance/check-in',{},auth)[1]['replayed']
                assert request(base,route,enroll,auth)[1]['checkedIn']
                expect(request(base,'/api/app/v1/session/withdraw',{},auth)[0],200,'withdraw')
                # Read inside the runtime filesystem; host mount snapshots can lag WAL commits.
                probe="import{Database}from'bun:sqlite';const db=new Database('/app/traildepot/data/main.db',{readonly:true});console.log(JSON.stringify(db.query('SELECT count(*) AS total FROM ait_lotto_attendance_experiments').get()));db.close()"
                assert json.loads(command('docker','exec',name,'bun','-e',probe))['total']==0
                if len(seen)==2: break
            assert seen=={'control','short'}
            # V4: one successful generation in either arm; v3 reopen cannot raise it again.
            v4_seen=set()
            for _ in range(32):
                principal,auth=account();arm=variant(principal)
                if arm in v4_seen: continue
                v4_seen.add(arm)
                state=request(base,route,{'experiment':'generation-cadence-v4'},auth)[1]
                assert state['requiredGenerations']==1 and state['attendanceExperiment']=='generation-cadence-v4'
                expect(request(base,'/api/app/v1/attendance/check-in',{},auth)[0],403,'v4 requires generation')
                _,data=generate(auth)
                assert data['attendanceProgress']['canCheckIn'] and data['attendanceProgress']['generatedCount']==1
                older=request(base,route,enroll,auth)[1]
                assert older['attendanceExperiment']=='generation-cadence-v3' and older['requiredGenerations']==1
                expect(request(base,'/api/app/v1/attendance/check-in',{},auth)[0],200,'v4 one generation check in')
                # Routing uses the authenticated arm. No SDK or provider calls occur.
                def configure(weight):
                    sql=f"UPDATE ait_lotto_ad_placements SET enabled=1,rewarded_group_id='fixture-shared-r',interstitial_group_id='fixture-shared-i',cooldown_ms=30000,daily_cap=20,rewarded_weight={weight} WHERE placement='generation_continue'; UPDATE ait_lotto_ad_sessions SET created_at=created_at-60000"
                    command('docker','exec',name,'bun','-e',"import{Database}from'bun:sqlite';const db=new Database('/app/traildepot/data/main.db');db.exec("+json.dumps(sql)+");db.close()")
                expected={'control':('ait.v2.live.7700cddda6e84a37','ait.v2.live.74d57d445b6d4fd9'),'short':('ait.v2.live.af3e69b0e59d48d8','ait.v2.live.14e80579edd44ee2')}
                for index,weight in enumerate([100,0]):
                    configure(weight)
                    body={'placement':'generation_continue','clientManagedCounter':True,'experiment':'generation-cadence-v4'}
                    code,ad=request(base,'/api/app/v1/ads/start',body,auth);expect(code,200,'v4 group start')
                    assert ad['groupId']==expected[arm][index],ad
                    expect(request(base,'/api/app/v1/ads/complete',{'id':ad['id'],'events':['failedToShow']},auth)[0],200,'fixture free continuation')
                configure(100)
                code,ad=request(base,'/api/app/v1/ads/start',{'placement':'generation_continue','clientManagedCounter':True},auth)
                expect(code,200,'legacy group start');assert ad['groupId']=='fixture-shared-r'
                request(base,'/api/app/v1/ads/complete',{'id':ad['id'],'events':['failedToShow']},auth)
                expect(request(base,'/api/app/v1/ads/start',{'placement':'generation_continue','clientManagedCounter':True,'experiment':'wrong'},auth)[0],400,'unknown phase')
                expect(request(base,'/api/app/v1/session/withdraw',{},auth)[0],200,'v4 withdrawal')
                if len(v4_seen)==2: break
            assert v4_seen=={'control','short'}
            # Existing completed attendance survives later enrollment.
            principal,auth=account();generate(auth)
            expect(request(base,'/api/app/v1/attendance/check-in',{},auth)[0],200,'legacy check in')
            state=request(base,route,enroll,auth)[1]
            assert state['checkedIn'] and state['canCheckIn']
            expect(request(base,'/api/app/v1/attendance/check-in',{},auth)[0],200,'completed attendance is idempotent')
            code,public=request(base,'/api/records/v1/ait_lotto_attendance_experiments',headers=auth)
            assert code in (400,401,403,404) or public is None, (code, type(public).__name__)
            assert 'ait_lotto_attendance_experiments' not in (SOURCE/'config.textproto').read_text()
            print('attendance enrollment, both cohorts, legacy N-gating, v4 single generation and ad group routing, replay, deletion, legacy compatibility and completed attendance passed')
        finally: cleanup_case(name,folder,image)
if __name__=='__main__': run()

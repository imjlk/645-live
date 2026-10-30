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
            # Existing completed attendance survives later enrollment.
            principal,auth=account();generate(auth)
            expect(request(base,'/api/app/v1/attendance/check-in',{},auth)[0],200,'legacy check in')
            state=request(base,route,enroll,auth)[1]
            assert state['checkedIn'] and state['canCheckIn']
            expect(request(base,'/api/app/v1/attendance/check-in',{},auth)[0],200,'completed attendance is idempotent')
            code,public=request(base,'/api/records/v1/ait_lotto_attendance_experiments',headers=auth)
            assert code in (400,401,403,404) or public is None, (code, type(public).__name__)
            assert 'ait_lotto_attendance_experiments' not in (SOURCE/'config.textproto').read_text()
            print('attendance enrollment, both cohorts, N-gating, replay, deletion, legacy compatibility and completed attendance passed')
        finally: cleanup_case(name,folder,image)
if __name__=='__main__': run()

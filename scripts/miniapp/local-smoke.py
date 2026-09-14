"""Verify the local feature shortcut in disposable depots, without an ad or payout provider."""
import argparse
import json
import sqlite3
import tempfile
import time
import uuid

from smoke import cleanup_case, command, expect, request


def run_case(image, blocked_by=None):
    name = '645-miniapp-local-' + uuid.uuid4().hex[:8]
    flags = {
        'BACKFILL_ON_STARTUP': 'false', 'RUNTIME_THREADS': '4',
        'AIT_ENABLED': 'true', 'AIT_LOCAL_PREVIEW': 'true',
        'AIT_ALLOW_DEV_IDENTITY': 'true', 'AIT_TEST_ADS': 'true',
        'AIT_BOTS_ENABLED': 'false', 'AIT_PROMOTIONS_ENABLED': 'false',
    }
    if blocked_by:
        flags[blocked_by] = 'true' if blocked_by == 'AIT_PROMOTIONS_ENABLED' else 'false'
    with tempfile.TemporaryDirectory(prefix='645-miniapp-local-') as folder:
        try:
            command('docker', 'run', '-d', '--name', name, '-p', '127.0.0.1::4000',
                '-v', f'{folder}:/app/traildepot',
                *[part for key, value in flags.items() for part in ['-e', f'{key}={value}']], image)
            base = 'http://127.0.0.1:' + command('docker', 'port', name, '4000/tcp').rsplit(':', 1)[1]
            for _ in range(100):
                try:
                    if request(base, '/api/healthcheck')[0] == 200:
                        break
                except OSError:
                    pass
                time.sleep(.2)
            else:
                raise AssertionError('Local TrailBase startup failed')
            path = '/api/app/v1/dev/entitlements'
            if blocked_by:
                expect(request(base, path, {'action': 'unlock', 'feature': 'custom'})[0], 404, blocked_by)
                print(json.dumps({'local_shortcut_blocked_by': blocked_by}), flush=True)
                return
            expect(request(base, path, {'action': 'reset'})[0], 401, 'shortcut requires auth')
            status, data = request(base, '/api/app/v1/session/bootstrap', {'anonymousHash': 'dev-anon-' + uuid.uuid4().hex})
            expect(status, 200, 'local identity bootstrap')
            tokens = data['authTokens']
            auth = {'Authorization': 'Bearer ' + tokens['authToken'], 'CSRF-Token': tokens['csrfToken']}
            context = request(base, '/api/app/v1/lotto/round-context')[1]
            generation = {'requestId': uuid.uuid4().hex, 'round': context['targetRound'],
                'options': {'fixed': [7, 8], 'excluded': [1], 'oddCount': 3}}
            expect(request(base, '/api/app/v1/lotto/generations', generation, auth)[0], 403, 'pass required')
            expect(request(base, path, {'action': 'unlock', 'feature': 'attendance_restore'}, auth)[0], 400, 'no attendance shortcut')
            for feature in ['custom', 'report']:
                expect(request(base, path, {'action': 'unlock', 'feature': feature}, auth)[0], 200, 'local pass')
            status, result = request(base, '/api/app/v1/lotto/generations', generation, auth)
            expect(status, 200, 'real custom generation after shortcut')
            numbers = result['generation']['numbers']
            assert 7 in numbers and 8 in numbers and 1 not in numbers
            expect(request(base, '/api/app/v1/lotto/report', {'numbers': numbers}, auth)[0], 200, 'real report after shortcut')
            expect(request(base, '/api/app/v1/attendance/check-in', {}, auth)[0], 200, 'real generation enables attendance')
            with sqlite3.connect(f'file:{folder}/data/main.db?mode=ro', uri=True) as db:
                assert db.execute('SELECT count(*) FROM ait_lotto_ad_sessions').fetchone()[0] == 0
                assert db.execute('SELECT count(*) FROM promotion_reward_ledger').fetchone()[0] == 0
            expect(request(base, path, {'action': 'reset'}, auth)[0], 200, 'reset passes')
            assert request(base, '/api/app/v1/ads/config', headers=auth)[1]['passes'] == {}
            expect(request(base, '/api/app/v1/lotto/report', {'numbers': numbers}, auth)[0], 403, 'reset revokes shortcut')
            status, ad = request(base, '/api/app/v1/ads/start', {'placement': 'custom'}, auth)
            expect(status, 200, 'real test-ad flow still available')
            assert ad['groupId'] in ['ait-ad-test-rewarded-id', 'ait-ad-test-interstitial-id']
            print(json.dumps({'local_preview': 'passed', 'checks': ['authenticated local passes', 'real generation and attendance', 'no synthetic ad sessions or cash', 'reset and SDK test-ad reservation']}), flush=True)
        finally:
            cleanup_case(name, folder, image)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--image', default='645-trailbase:miniapp')
    args = parser.parse_args()
    for flag in ['AIT_LOCAL_PREVIEW', 'AIT_ALLOW_DEV_IDENTITY', 'AIT_TEST_ADS', 'AIT_PROMOTIONS_ENABLED', None]:
        run_case(args.image, flag)

"""Bootstrap timing regression against a disposable TrailBase depot, never production."""
import argparse
import json
import re
import sqlite3
import tempfile
import time
import uuid

from smoke import cleanup_case, command, expect, request


def run_case(image, enabled):
    name = '645-bootstrap-timing-' + uuid.uuid4().hex[:8]
    with tempfile.TemporaryDirectory(prefix='645-bootstrap-timing-') as folder:
        try:
            command('docker', 'run', '-d', '--name', name, '-p', '127.0.0.1::4000',
                    '-v', f'{folder}:/app/traildepot', '-e', 'BACKFILL_ON_STARTUP=false',
                    '-e', 'AIT_ENABLED=true', '-e', 'AIT_ALLOW_DEV_IDENTITY=true',
                    '-e', 'AIT_BOTS_ENABLED=false', '-e', 'RUNTIME_THREADS=4',
                    '-e', f'TRAILBASE_BOOTSTRAP_TIMING={str(enabled).lower()}', image)
            base = 'http://127.0.0.1:' + command('docker', 'port', name, '4000/tcp').rsplit(':', 1)[1]
            for _ in range(100):
                try:
                    if request(base, '/api/healthcheck')[0] == 200:
                        break
                except (OSError, ValueError):
                    pass
                time.sleep(.2)
            else:
                raise AssertionError('Isolated TrailBase did not start')
            seed = 'dev-anon-' + uuid.uuid4().hex
            status, first = request(base, '/api/app/v1/session/bootstrap', {'anonymousHash': seed})
            expect(status, 200, 'initial bootstrap')
            with sqlite3.connect(f'file:{folder}/data/main.db?mode=ro', uri=True) as db:
                before = db.execute('SELECT id, password_hash FROM _user ORDER BY id').fetchall()
            status, second = request(base, '/api/app/v1/session/bootstrap', {'anonymousHash': seed})
            expect(status, 200, 'repeat bootstrap')
            assert first['user'] == second['user'], 'Repeated bootstrap changed the principal'
            with sqlite3.connect(f'file:{folder}/data/main.db?mode=ro', uri=True) as db:
                assert before == db.execute('SELECT id, password_hash FROM _user ORDER BY id').fetchall(), 'Repeat bootstrap rewrote password hashes'
            expect(request(base, '/api/app/v1/session/me', headers={
                'Authorization': 'Bearer ' + second['authTokens']['authToken'],
            })[0], 200, 'official auth token')
            expect(request(base, '/api/app/v1/session/bootstrap', {'anonymousHash': 'invalid'})[0], 400, 'invalid identity')
            # docker writes stderr separately; capture both streams for the fixed diagnostic format.
            import subprocess
            captured = subprocess.run(['docker', 'logs', name], capture_output=True, text=True, check=True)
            logs = captured.stdout + captured.stderr
            lines = [line for line in logs.splitlines() if line.startswith('bootstrap_timing ')]
            if not enabled:
                assert not lines, 'Disabled diagnostics emitted a timing line'
            else:
                assert len(lines) == 3, 'Expected one timing line per bootstrap, including failure'
                pattern = r'bootstrap_timing status=(ok|error) last_stage=(prepare|transaction_open|transaction|auth|response) prepare_ms=(\d+) transaction_open_ms=(\d+) transaction_ms=(\d+) auth_ms=(\d+) response_ms=(\d+) total_ms=(\d+)'
                states = []
                for line in lines:
                    match = re.fullmatch(pattern, line)
                    assert match, 'Timing line included unexpected fields'
                    states.append(match[1])
                    assert sum(map(int, match.groups()[2:7])) == int(match[8]), 'Stage durations are not additive'
                    assert seed not in line and first['user']['id'] not in line
                assert states == ['ok', 'ok', 'error']
            print(json.dumps({'timingEnabled': enabled, 'principalAndPasswordPreserved': True,
                              'officialTokenAccepted': True, 'timingLines': len(lines)}))
        finally:
            cleanup_case(name, folder, image)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--image', default='645-trailbase:miniapp')
    args = parser.parse_args()
    for enabled in [False, True]:
        run_case(args.image, enabled)

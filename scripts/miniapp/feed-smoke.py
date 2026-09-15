"""Cursor pagination and feed ad pools against an isolated, disposable TrailBase."""
import argparse
import json
import tempfile
import time
import uuid

from smoke import cleanup_case, command, expect, request


def run(image):
    name = '645-miniapp-feed-' + uuid.uuid4().hex[:8]
    with tempfile.TemporaryDirectory(prefix='645-miniapp-feed-') as folder:
        try:
            command('docker', 'run', '-d', '--name', name, '-p', '127.0.0.1::4000',
                '-v', f'{folder}:/app/traildepot', '-e', 'BACKFILL_ON_STARTUP=false',
                '-e', 'AIT_ENABLED=true', '-e', 'AIT_ALLOW_DEV_IDENTITY=true',
                '-e', 'AIT_BOTS_ENABLED=false', '-e', 'AIT_TEST_ADS=false',
                '-e', 'RUNTIME_THREADS=4', '-e', 'AIT_FEED_INLINE_GROUP_IDS= feed-a,feed-b,feed-a,feed-c ', image)
            base = 'http://127.0.0.1:' + command('docker', 'port', name, '4000/tcp').rsplit(':', 1)[1]
            for _ in range(100):
                try:
                    if request(base, '/api/healthcheck')[0] == 200:
                        break
                except OSError:
                    pass
                time.sleep(.2)
            else:
                raise AssertionError('Feed fixture startup failed')
            round = request(base, '/api/app/v1/lotto/round-context')[1]['targetRound']

            def sql(statements):
                script = "import {Database} from 'bun:sqlite';const db=new Database('/app/traildepot/data/main.db');db.transaction(()=>{for(const [sql,params] of JSON.parse(process.argv[1]))db.query(sql).run(...params)})();db.close()"
                command('docker', 'exec', name, 'bun', '-e', script, json.dumps(statements))

            insert = 'INSERT INTO lotto_public_generations(round,display_name,number_1,number_2,number_3,number_4,number_5,number_6,created_at) VALUES (?, ?, 1, 2, 3, 4, 5, 6, ?)'
            now = int(time.time() * 1000)
            sql([[insert, [round, '페이지 테스트', now + i]] for i in range(75)])
            path = f'/api/app/v1/lotto/feed?round={round}'
            status, first = request(base, path)
            expect(status, 200, 'first page')
            assert len(first['generations']) == 30 and first['nextCursor']
            ids = [g['id'] for g in first['generations']]
            cursor_id = ids[-1]
            # New records and deletion of the cursor's own row must not shift the next page.
            sql([[insert, [round, '추가 내역', now + i + 100]] for i in range(5)] +
                [['DELETE FROM lotto_public_generations WHERE id=?', [cursor_id]],
                 ['DELETE FROM lotto_public_generations WHERE id=?', [cursor_id - 2]],
                 [insert, [round + 1, '다른 회차', now + 200]]])
            cursor = first['nextCursor']
            pages = 1
            while cursor:
                status, page = request(base, path + '&cursor=' + cursor)
                expect(status, 200, 'older page')
                assert len(page['generations']) <= 30
                assert all(g['round'] == round and g['id'] < int(cursor.split(':')[1]) for g in page['generations'])
                ids.extend(g['id'] for g in page['generations'])
                assert page['nextCursor'] != cursor
                cursor = page['nextCursor']
                pages += 1
                assert pages < 5
            assert pages == 3
            assert len(ids) == len(set(ids)) == 74
            assert ids == sorted(ids, reverse=True)
            assert set(ids) == set(range(1, 76)) - {cursor_id - 2}
            fresh = request(base, path)[1]
            assert fresh['generations'][0]['id'] == 80 and fresh['totalGenerations'] == 78
            assert request(base, path + '&cursor=' + f'{round}:1')[1]['generations'] == []
            for cursor in ['invalid', f'{round}:0', f'{round}:-1', f'{round}:9007199254740992', f'{round - 1}:10']:
                expect(request(base, path + '&cursor=' + cursor)[0], 400, 'invalid cursor')
            expect(request(base, '/api/app/v1/lotto/feed?round=0')[0], 400, 'invalid round')
            status, session = request(base, '/api/app/v1/session/bootstrap', {'anonymousHash': 'dev-anon-' + uuid.uuid4().hex})
            expect(status, 200, 'config fixture bootstrap')
            auth = {'Authorization': 'Bearer ' + session['authTokens']['authToken']}
            config = request(base, '/api/app/v1/ads/config', headers=auth)[1]
            assert config['feedInlineGroupIds'] == ['feed-a', 'feed-b', 'feed-c']
            print(json.dumps({'feed_pagination': 'passed', 'checks': ['30-item keyset pages', 'no duplicates or gaps during inserts and cursor-row deletion', 'round isolation and cursor validation', 'independent live totals', 'deduplicated multi-group ad configuration']}), flush=True)
        finally:
            cleanup_case(name, folder, image)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--image', default='645-trailbase:miniapp')
    run(parser.parse_args().image)

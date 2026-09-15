"""Exercise archival and winning comparisons through real WASM jobs in a disposable depot."""
import argparse
import json
import tempfile
import time
import uuid

from smoke import cleanup_case, command, expect, request


def run(image):
    name = '645-generation-results-' + uuid.uuid4().hex[:8]
    with tempfile.TemporaryDirectory(prefix='645-generation-results-') as folder:
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
                raise AssertionError('Result fixture startup failed')
            current = request(base, '/api/app/v1/lotto/round-context')[1]['targetRound']
            closed = current - 1
            # Only this newly created disposable DB is seeded. An empty startup snapshot
            # may already exist; replace it in the same transaction as the fixture rows.
            seed = """
import {Database} from 'bun:sqlite';
const round = Number(process.argv[1]);
const db = new Database('/app/traildepot/data/main.db');
db.exec('PRAGMA foreign_keys=ON');
db.transaction(() => {
  db.query('DELETE FROM lotto_generation_weekly_archives WHERE round=?').run(round);
  for (const [numbers,copies] of [[[1,2,3,4,5,6],2],[[1,2,3,4,5,7],3],[[1,2,3,4,5,8],1],[[1,2,3,4,8,9],1],[[1,2,3,8,9,10],4],[[8,9,10,11,12,13],5]]) {
    for(let i=0;i<copies;i++) db.query("INSERT INTO lotto_public_generations(round,display_name,number_1,number_2,number_3,number_4,number_5,number_6,created_at) VALUES (?,'comparison fixture',?,?,?,?,?,?,?)").run(round,...numbers,1039258800000+(round-1)*604800000-1000);
  }
})();db.close();
"""
            command('docker', 'exec', name, 'bun', '-e', seed, str(closed))
            endpoint = '/api/app/v1/lotto/generation-results'

            def await_result(wanted, counts=None):
                deadline = time.monotonic() + 90
                while time.monotonic() < deadline:
                    status, value = request(base, endpoint + f'?round={closed}')
                    if status == 200:
                        row = value['rounds'][0]
                        if row['status'] == wanted and (counts is None or row['rankCounts'] == counts):
                            return row
                    time.sleep(.25)
                raise AssertionError(f'Scheduled comparison did not reach {wanted}: {value}')

            waiting = await_result('waiting')
            assert waiting['rankCounts'] is None and waiting['totalGenerations'] == 16
            print('Real archive captured all 16 generation occurrences; waiting for draw', flush=True)
            draw = """
import {Database} from 'bun:sqlite';
const [round,numbers,bonus] = JSON.parse(process.argv[1]);
const db = new Database('/app/traildepot/data/main.db');
const date = new Date(1039258800000+(round-1)*604800000+32400000).toISOString().slice(0,10);
db.query('INSERT INTO lotto_draw_results(round,draw_date,total_sell_amount,first_prize_amount,first_prize_winner_count,first_prize_accumulated_amount,draw_number_1,draw_number_2,draw_number_3,draw_number_4,draw_number_5,draw_number_6,bonus_number) VALUES (?,?,1000,1000,1,1000,?,?,?,?,?,?,?) ON CONFLICT(round) DO UPDATE SET draw_number_1=excluded.draw_number_1,draw_number_2=excluded.draw_number_2,draw_number_3=excluded.draw_number_3,draw_number_4=excluded.draw_number_4,draw_number_5=excluded.draw_number_5,draw_number_6=excluded.draw_number_6,bonus_number=excluded.bonus_number').run(round,date,...numbers,bonus);
db.close();
"""
            command('docker', 'exec', name, 'bun', '-e', draw, json.dumps([closed, [1,2,3,4,5,6], 7]))
            ready = await_result('ready', [5,2,3,1,1,4])
            assert ready['comparedGenerations'] == ready['totalGenerations'] == 16
            print('Real comparison settled all six rank buckets with duplicate weights', flush=True)
            command('docker', 'exec', name, 'bun', '-e', draw, json.dumps([closed, [8,9,10,11,12,13], 7]))
            # A correction must never expose the original counts as the new draw's result.
            corrected = request(base, endpoint + f'?round={closed}')[1]['rounds'][0]
            assert corrected['rankCounts'] is None or corrected['rankCounts'] == [7,5,0,0,0,4]
            await_result('ready', [7,5,0,0,0,4])
            status, history = request(base, endpoint)
            expect(status, 200, 'public history with participation disabled')
            assert history['rounds'][0]['round'] == current and history['rounds'][0]['status'] == 'open'
            for query in ['?round=0', f'?round={current+1}', f'?round={closed}&before={closed}']:
                expect(request(base, endpoint + query)[0], 400, 'invalid history query')
            for table in ['lotto_generation_weekly_archives', 'lotto_generation_result_combinations']:
                status, value = request(base, '/api/records/v1/' + table)
                assert status in (400,401,403,404) or value is None or isinstance(value,dict) and 'error' in value, 'Private comparison table exposed'
            state = command('docker', 'exec', name, 'bun', '-e', """
import {Database} from 'bun:sqlite';const db=new Database('/app/traildepot/data/main.db',{readonly:true});
console.log(JSON.stringify({details:db.query('SELECT count(*) AS n FROM lotto_public_generations WHERE round=?').get(Number(process.argv[1])).n,bins:db.query('SELECT count(*) AS n FROM lotto_generation_result_combinations WHERE round=?').get(Number(process.argv[1])).n,fk:db.query('SELECT count(*) AS n FROM pragma_foreign_key_check').get().n}));db.close();
""", str(closed))
            assert json.loads(state) == {'details': 0, 'bins': 6, 'fk': 0}, state
            print(json.dumps({'generation_results': 'passed', 'checks': [
                'real scheduled archive and comparison jobs', 'all ranks and multiplicity',
                'draw correction recomputes results', 'private anonymous source',
                'public paginated API with participation disabled']}), flush=True)
        finally:
            cleanup_case(name, folder, image)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--image', default='645-trailbase:miniapp')
    run(parser.parse_args().image)

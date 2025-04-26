// https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=861

// https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=1160

// {"totSellamnt":123177536000,"returnValue":"success","drwNoDate":"2025-02-22","firstWinamnt":2509359875,"drwtNo6":45,"drwtNo4":36,"firstPrzwnerCo":12,"drwtNo5":39,"bnusNo":19,"firstAccumamnt":30112318500,"drwNo":1160,"drwtNo2":13,"drwtNo3":18,"drwtNo1":7}

// 매 주 토요일 20:40분부터 1분 간격으로 10회 실행되는 함수. 실행일 회차 정보가 이미 json파일에 담겨 있으면 건너뛰기. 당첨결과가 나오면 기존 json파일에서 1회차를 제외하고, 새로운 당첨결과를 추가한다.

// http://qr.645lotto.net/?v=0809
// q021825303444
// q050812313445
// q060817202240
// q121623253641
// q040809232944
// 0000002233

// http://m.dhlottery.co.kr/?v=1064q152434353839q061327303743q040915162534q061323273039q0320273036451857146742

function getLottoNumbers(drwNo: number): Promise<Lotto> {
	return fetch(`https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=${drwNo}`)
		.then((response) => response.json())
		.then((data) => {
			return {
				drwNo: data.drwNo,
				drwtNo1: data.drwtNo1,
				drwtNo2: data.drwtNo2,
				drwtNo3: data.drwtNo3,
				drwtNo4: data.drwtNo4,
				drwtNo5: data.drwtNo5,
				drwtNo6: data.drwtNo6,
				bnusNo: data.bnusNo,
			};
		});
}

function parseLottoQueryString(url: string): { drawNumber: number, lotteryGames: number[][] } {
	const urlParams = new URLSearchParams(url.split('?')[1]);
	const queryValue = urlParams.get('v') || '';
	const drawNumber = Number.parseInt(queryValue.slice(0, 4), 10);

	const gameStrings = queryValue.split('q');
	gameStrings.shift(); // Remove the first element which contains the draw number

	// Handle the last game string which may contain extra characters
	const lastGameString = gameStrings.pop() || '';
	gameStrings.push(lastGameString.slice(0, 12)); // Take only the first 12 characters
	
	// Split each game string into pairs of digits
	const lotteryGames = gameStrings.map(gameString => gameString.match(/.{1,2}/g) || []);
	
	// Convert string arrays to number arrays
	const numberGames = lotteryGames.map(game => 
		game.map(num => Number.parseInt(num, 10))
	);

	return { drawNumber, lotteryGames: numberGames };
}

// Example usage
const url = 'http://m.dhlottery.co.kr/?v=1064q152434353839q061327303743q040915162534q061323273039q0320273036451857146742';
const parsedData = parseLottoQueryString(url);
console.log(parsedData);

async function main() {
	const latestLotto = await getLottoNumbers(1160);
	console.log(latestLotto);
}

main();

export type Lotto = {
	drwNo: number;
	drwtNo1: number;
	drwtNo2: number;
	drwtNo3: number;
	drwtNo4: number;
	drwtNo5: number;
	drwtNo6: number;
	bnusNo: number;
};


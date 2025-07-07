// https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=861

// https://www.dhlottery.co.kr/common.do?method=getLottoNumber&drwNo=1160

// {"totSellamnt":123177536000,"returnValue":"success","drwNoDate":"2025-02-22","firstWinamnt":2509359875,"drwtNo6":45,"drwtNo4":36,"firstPrzwnerCo":12,"drwtNo5":39,"bnusNo":19,"firstAccumamnt":30112318500,"drwNo":1160,"drwtNo2":13,"drwtNo3":18,"drwtNo1":7}

// 매 주 토요일 20:40분부터 1분 간격으로 10회 실행되는 함수. 실행일 회차 정보가 이미 json파일에 담겨 있으면 건너뛰기. 당첨결과가 나오면 기존 json파일에서 1회차를 제외하고, 새로운 당첨결과를 추가한다.

// http://m.dhlottery.co.kr/?v=1064q152434353839q061327303743q040915162534q061323273039q0320273036451857146742

import {
	getLatestLottoRound,
	getLottoNumbers,
} from "../pages/www/src/lib/utils/lotto-api-script.js";
import {
	convertToLottoGames,
	parseDhlotteryURL,
} from "../pages/www/src/lib/utils/lotto-parser.js";

// Example usage - using the refactored utility function
const url =
	"http://m.dhlottery.co.kr/?v=1064q152434353839q061327303743q040915162534q061323273039q0320273036451857146742";
const parsedData = parseDhlotteryURL(url);
if (parsedData) {
	const lottoGames = convertToLottoGames(parsedData);
	console.log(lottoGames);
}

async function main() {
	try {
		// Get the latest round dynamically
		const latestInfo = await getLatestLottoRound();
		if (latestInfo) {
			console.log(
				`Latest round: ${latestInfo.drwNo} (${latestInfo.drwNoDate})`,
			);

			// Get lotto numbers for the latest round
			const latestLotto = await getLottoNumbers(latestInfo.drwNo);
			if (latestLotto) {
				console.log("Latest lotto numbers:", latestLotto);
			}
		} else {
			console.error("Failed to get latest round info");
		}
	} catch (error) {
		console.error("Error in main:", error);
	}
}

main();

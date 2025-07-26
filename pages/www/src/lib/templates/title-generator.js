/**
 * 로또 뉴스 기사 제목 생성기
 * 어그로성 제목과 부제목을 생성하는 유틸리티
 */

export const titleTemplates = {
	// 1등 당첨자 수에 따른 제목
	jackpot: {
		none: [
			"🚨 제{round}회 로또, 1등 없어 {nextAmount}억 대박 예고!",
			"💰 로또 {round}회차 이월! 다음 주 당첨금 {nextAmount}억 돌파",
			"🔥 {round}회 로또 1등 공석, {nextAmount}억 잭팟 대기 중!",
		],
		single: [
			"🎯 제{round}회 로또 {amount}억 독점! 1명이 모든 걸 가져갔다",
			"💎 로또 {round}회차 {amount}억 단독 당첨! 인생 역전 드라마",
			"⚡ {round}회 로또 대박! {amount}억 혼자 독차지한 행운아",
		],
		few: [
			"🔥 제{round}회 로또 {amount}억, 단 {count}명만 나눠가져!",
			"💰 로또 {round}회차 소수정예 {count}명, {amount}억 분할",
			"🎯 {round}회 로또 희소성 대박! {count}명이 {amount}억 분배",
		],
		many: [
			"😱 제{round}회 로또 대박 러시! {count}명이 동시 당첨",
			"🌊 로또 {round}회차 당첨 쓰나미! {count}명 1등 행렬",
			"🎊 {round}회 로또 축제! 무려 {count}명이 함께 웃었다",
		],
	},

	// 특별한 번호 패턴에 따른 제목
	pattern: {
		consecutive: [
			"🎲 제{round}회 로또 연번 대박! {pattern} 출현으로 화제",
			"⚡ 로또 {round}회차 연속번호 {pattern} 등장! 확률 신화",
			"🔮 {round}회 로또 {pattern} 연번 출현, 수학적 기적!",
		],
		allOdd: [
			"🎯 제{round}회 로또 홀수 독무대! 6개 모두 홀수 등장",
			"🔥 로또 {round}회차 홀수 완전체! 극단적 확률 실현",
			"⚡ {round}회 로또 홀수만 6개! 통계학 뒤집은 결과",
		],
		allEven: [
			"🎯 제{round}회 로또 짝수 천국! 6개 모두 짝수로 구성",
			"🔥 로또 {round}회차 짝수 완주! 희귀 패턴 출현",
			"⚡ {round}회 로또 짝수 올킬! 확률 역사에 남을 결과",
		],
		highNumbers: [
			"🚀 제{round}회 로또 고번호 집중! 40번대 {count}개 출현",
			"📈 로또 {round}회차 고점 공략! 높은 번호들의 역습",
			"🔝 {round}회 로또 상위권 번호들의 잔치! {count}개 등장",
		],
		lowNumbers: [
			"📉 제{round}회 로또 저번호 몰리기! 1~10 구간 {count}개",
			"🎯 로또 {round}회차 낮은 번호 집중! 초반 번호의 힘",
			"🔢 {round}회 로또 한 자리 수 {count}개! 저번호 파티",
		],
	},

	// 판매량에 따른 제목  
	sales: {
		record: [
			"📊 제{round}회 로또 역대급 판매! {amount}억 돌파",
			"🔥 로또 {round}회차 판매 신기록! {amount}억 달성",
			"💰 {round}회 로또 대박 열풍! {amount}억 판매고 경신",
		],
		low: [
			"📉 제{round}회 로또 의외의 저조! {amount}억 판매",
			"🤔 로또 {round}회차 관심 감소? {amount}억 그쳐",
			"📊 {round}회 로또 판매 부진, {amount}억 기록",
		],
	},

	// 기본 제목 (특별한 요소 없을 때)
	default: [
		"🎲 제{round}회 로또 645 당첨번호 발표! {numbers}",
		"💰 로또 {round}회차 결과 공개! 당신의 번호는?",
		"🔔 {round}회 로또 추첨 완료! 행운의 번호들",
		"🎯 제{round}회 로또 당첨번호 {numbers} 확인하세요!",
	],
};

export const subtitleTemplates = {
	jackpot: {
		none: "다음 회차 예상 당첨금 {nextAmount}억원, 역대 최고 수준 근접",
		single: "1인당 {amount}억원, 세후 약 {afterTax}억원 수령 예정",
		few: "1인당 약 {individualAmount}억원씩 분배, 인생 역전 기회",
		many: "1인당 {individualAmount}천만원대, 많은 당첨자와 기쁨 나눠",
	},
	pattern: "통계적으로 매우 드문 패턴으로 로또 커뮤니티 뜨거운 반응",
	sales: {
		record: "전국민 로또 열풍 증명, 평균 대비 {percentage}% 증가",
		low: "경제 상황 반영된 것으로 분석, 평균 대비 {percentage}% 감소",
	},
	default: "이번 주도 수많은 꿈과 희망이 담긴 추첨 결과",
};

/**
 * 제목 생성 함수
 */
export function generateTitle(data) {
	const { 
		round, 
		jackpot_winners, 
		jackpot_amount, 
		numbers, 
		total_sales,
		consecutive_numbers,
		special_pattern,
		high_sales
	} = data;

	let template;
	let category;

	// 1등 당첨자 수에 따른 분류
	if (jackpot_winners === 0) {
		template = getRandomTemplate(titleTemplates.jackpot.none);
		category = 'jackpot_none';
	} else if (jackpot_winners === 1) {
		template = getRandomTemplate(titleTemplates.jackpot.single);
		category = 'jackpot_single';
	} else if (jackpot_winners <= 5) {
		template = getRandomTemplate(titleTemplates.jackpot.few);
		category = 'jackpot_few';
	} else if (jackpot_winners >= 15) {
		template = getRandomTemplate(titleTemplates.jackpot.many);
		category = 'jackpot_many';
	}
	// 특별 패턴이 있는 경우
	else if (consecutive_numbers) {
		template = getRandomTemplate(titleTemplates.pattern.consecutive);
		category = 'pattern_consecutive';
	} else if (special_pattern) {
		const patternType = special_pattern.toLowerCase();
		if (patternType.includes('홀수')) {
			template = getRandomTemplate(titleTemplates.pattern.allOdd);
		} else if (patternType.includes('짝수')) {
			template = getRandomTemplate(titleTemplates.pattern.allEven);
		} else if (patternType.includes('고번호')) {
			template = getRandomTemplate(titleTemplates.pattern.highNumbers);
		} else if (patternType.includes('저번호')) {
			template = getRandomTemplate(titleTemplates.pattern.lowNumbers);
		}
		category = 'pattern_special';
	}
	// 판매량이 특별한 경우
	else if (high_sales) {
		template = getRandomTemplate(titleTemplates.sales.record);
		category = 'sales_record';
	}
	// 기본 제목
	else {
		template = getRandomTemplate(titleTemplates.default);
		category = 'default';
	}

	return {
		title: template
			.replace(/{round}/g, round)
			.replace(/{amount}/g, Math.round(jackpot_amount / 100000000))
			.replace(/{count}/g, jackpot_winners)
			.replace(/{numbers}/g, numbers.join(', '))
			.replace(/{pattern}/g, consecutive_numbers || special_pattern),
		category
	};
}

/**
 * 부제목 생성 함수
 */
export function generateSubtitle(data, titleCategory) {
	const { 
		jackpot_winners, 
		jackpot_amount, 
		total_sales,
		high_sales 
	} = data;

	let template;

	if (titleCategory.startsWith('jackpot_')) {
		const subCategory = titleCategory.split('_')[1];
		template = subtitleTemplates.jackpot[subCategory];
		
		if (subCategory === 'single' || subCategory === 'few') {
			const individualAmount = Math.round(jackpot_amount / jackpot_winners / 100000000);
			const afterTax = Math.round(individualAmount * 0.78); // 22% 세금 가정
			
			template = template
				.replace(/{individualAmount}/g, individualAmount)
				.replace(/{afterTax}/g, afterTax)
				.replace(/{amount}/g, Math.round(jackpot_amount / 100000000));
		}
	} else if (titleCategory.startsWith('pattern_')) {
		template = subtitleTemplates.pattern;
	} else if (titleCategory.startsWith('sales_')) {
		const subCategory = titleCategory.split('_')[1];
		template = subtitleTemplates.sales[subCategory];
		// 판매량 증감률 계산 (예시)
		const percentage = high_sales ? '+25' : '-15';
		template = template.replace(/{percentage}/g, percentage);
	} else {
		template = subtitleTemplates.default;
	}

	return template;
}

function getRandomTemplate(templates) {
	return templates[Math.floor(Math.random() * templates.length)];
}
import type { Attendance } from "./api";
import { attendanceInstruction, attendanceReady } from "./attendance-progress";
import { pointWindowHeadline } from "./reward-policy";
import { useTheme } from "./theme";
import { Pressable, StyleSheet, Text, View } from "./web/primitives";

export function GeneratorAttendanceEntry({
	attendance,
	onPress,
}: {
	attendance: Attendance | null;
	onPress: () => void;
}) {
	const theme = useTheme();
	const daily = attendance?.promotions.find(
		(promotion) => promotion.kind === "daily" && promotion.available,
	);
	let title = "오늘의 출석";
	let caption = attendanceInstruction(attendance);
	let action = "출석 안내 ›";
	if (attendance?.checkedIn) {
		title = `오늘 출석 완료 · ${attendance.streak}/7일`;
		caption =
			attendance.streak === 7
				? "7일을 채웠어요. 출석 혜택을 확인해 보세요."
				: `7일 완성까지 ${7 - attendance.streak}일 남았어요.`;
		action = "혜택 보기 ›";
	} else if (attendanceReady(attendance)) {
		const tickets = attendance?.adSkips?.active
			? `광고 스킵권 ${attendance.adSkips.dailyTickets}장`
			: null;
		const points = daily?.amount != null ? `${daily.amount}P` : null;
		const reward =
			tickets && points
				? `${tickets}과 ${points}를`
				: tickets
					? `${tickets}을`
					: points
						? `${points}를`
						: null;
		caption = reward
			? `오늘 출석하면 ${reward} 받을 수 있어요.`
			: "오늘 만든 번호로 출석할 수 있어요.";
		action = "출석하기 ›";
	}
	const notice = pointWindowHeadline(attendance);
	return (
		<Pressable
			accessibilityRole="button"
			accessibilityLabel="오늘의 출석과 혜택 보기"
			onPress={onPress}
			style={({ pressed }) => [
				s.root,
				{ borderColor: theme.line, opacity: pressed ? 0.65 : 1 },
			]}
		>
			<View style={s.copy}>
				<Text style={[s.title, { color: theme.text }]}>{title}</Text>
				<Text style={[s.caption, { color: theme.muted }]}>{caption}</Text>
				{notice ? (
					<Text style={[s.caption, { color: theme.blue }]}>{notice}</Text>
				) : null}
			</View>
			<Text style={[s.action, { color: theme.blue }]}>{action}</Text>
		</Pressable>
	);
}

const s = StyleSheet.create({
	root: {
		marginTop: 20,
		paddingTop: 20,
		paddingBottom: 4,
		borderTopWidth: StyleSheet.hairlineWidth,
		flexDirection: "row",
		alignItems: "center",
		gap: 16,
		minHeight: 76,
	},
	copy: { flex: 1, gap: 4 },
	title: { fontSize: 15, lineHeight: 23, fontWeight: "500" },
	caption: { fontSize: 12, lineHeight: 18 },
	action: { fontSize: 14, lineHeight: 22, fontWeight: "500" },
});

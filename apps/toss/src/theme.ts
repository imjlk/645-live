import { useColorScheme } from "react-native";
export function useTheme() {
	const dark = useColorScheme() === "dark";
	return {
		dark,
		background: dark ? "#17171C" : "#FFFFFF",
		surface: dark ? "#24242B" : "#F2F4F6",
		text: dark ? "#F2F4F6" : "#191F28",
		muted: dark ? "#AEB5BC" : "#6B7684",
		line: dark ? "#33333D" : "#E5E8EB",
		blue: dark ? "#6CA9FF" : "#3182F6",
		positive: dark ? "#5DD5A1" : "#168352",
	};
}

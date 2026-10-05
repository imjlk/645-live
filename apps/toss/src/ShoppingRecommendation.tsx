import { useIsFocused } from "@granite-js/native/@react-navigation/native";
import {
	ImpressionArea,
	IOContext,
	openURL,
	useVisibility,
} from "@granite-js/react-native";
import { memo, useContext, useEffect, useRef, useState } from "react";
import {
	AppState,
	Image,
	Pressable,
	StyleSheet,
	Text,
	View,
} from "react-native";
import { LOCAL_PREVIEW, publicGet } from "./api";
import {
	createShoppingCatalog,
	isSharelinkUrl,
	type ShoppingRecommendation as Offer,
	SHOPPING_CATALOG_CACHE_MS,
	type ShoppingPlacement,
} from "./shopping-recommendations";
import { trackShopping } from "./telemetry";
import { useTheme } from "./theme";

const catalog = createShoppingCatalog(() =>
	publicGet("/api/app/v1/shopping/recommendations"),
);

/** An optional shopping recommendation. SDK ad callbacks and rewards remain separate. */
export const ShoppingRecommendation = memo(function ShoppingRecommendation({
	placement,
	active = true,
}: {
	placement: ShoppingPlacement;
	active?: boolean;
}) {
	const focused = useIsFocused();
	const screenVisible = useVisibility();
	const { manager } = useContext(IOContext);
	const [foreground, setForeground] = useState(
		AppState.currentState !== "background" &&
			AppState.currentState !== "inactive",
	);
	const visible = active && focused && screenVisible && foreground && !!manager;
	const [offer, setOffer] = useState<Offer | null>(null);
	const [opening, setOpening] = useState(false);
	const [failed, setFailed] = useState(false);
	const alive = useRef(true);
	const busy = useRef(false);
	const seen = useRef(new Set<string>());
	const theme = useTheme();
	useEffect(() => {
		alive.current = true;
		const subscription = AppState.addEventListener("change", (state) =>
			setForeground(state === "active"),
		);
		return () => {
			alive.current = false;
			subscription.remove();
		};
	}, []);
	useEffect(() => {
		if (!visible) return;
		let cancelled = false;
		let timer: ReturnType<typeof setTimeout> | undefined;
		const refresh = () =>
			void catalog.read().then((rows) => {
				if (cancelled) return;
				const next =
					rows.find(
						(r) => r.placement === placement && r.expiresAt > Date.now(),
					) ?? null;
				setOffer(next);
				timer = setTimeout(
					refresh,
					next
						? Math.max(1, next.expiresAt - Date.now() + 1)
						: SHOPPING_CATALOG_CACHE_MS + 1,
				);
			});
		refresh();
		return () => {
			cancelled = true;
			clearTimeout(timer);
		};
	}, [visible, placement]);
	const preview = LOCAL_PREVIEW && !offer;
	if (!manager || (!offer && !preview)) return null;
	const current = offer && offer.expiresAt > Date.now() ? offer : null;
	if (!current && !preview) return null;
	async function open() {
		if (
			!current ||
			!visible ||
			busy.current ||
			current.expiresAt <= Date.now() ||
			!isSharelinkUrl(current.affiliateUrl)
		)
			return;
		busy.current = true;
		setOpening(true);
		setFailed(false);
		trackShopping("clicked", placement, current.productId);
		try {
			await openURL(current.affiliateUrl);
			trackShopping("opened", placement, current.productId);
		} catch {
			trackShopping("open_failed", placement, current.productId);
			if (alive.current) setFailed(true);
		} finally {
			busy.current = false;
			if (alive.current) setOpening(false);
		}
	}
	return (
		<ImpressionArea
			enabled={visible && !!current}
			areaThreshold={0.5}
			timeThreshold={500}
			onImpressionStart={() => {
				if (!current || !visible || current.expiresAt <= Date.now()) return;
				const key = `${placement}:${current.productId}`;
				if (seen.current.has(key)) return;
				seen.current.add(key);
				trackShopping("viewed", placement, current.productId);
			}}
			style={s.root}
		>
			<View style={[s.surface, { backgroundColor: theme.surface }]}>
				<Text style={[s.disclosure, { color: theme.muted }]}>
					{preview
						? "로컬 미리보기 · 상품 추천"
						: "광고 · 이 링크로 구매하면 수수료를 받아요."}
				</Text>
				<Pressable
					accessibilityRole="button"
					accessibilityLabel={
						current
							? `${current.title}, 토스쇼핑에서 보기`
							: "상품 추천 미리보기"
					}
					disabled={!current || opening || !visible}
					onPress={() => void open()}
					style={({ pressed }) => [s.product, { opacity: pressed ? 0.65 : 1 }]}
				>
					{current?.imageUrl ? (
						<Image
							source={{ uri: current.imageUrl }}
							resizeMode="contain"
							accessible={false}
							style={s.image}
						/>
					) : null}
					<View style={s.copy}>
						<Text style={[s.title, { color: theme.text }]} numberOfLines={2}>
							{current?.title ??
								(placement === "generator"
									? "따뜻하게 쓰는 생활 아이템"
									: "가볍게 즐기는 간식")}
						</Text>
						<Text style={[s.action, { color: theme.blue }]}>
							{preview
								? "운영 상품을 연결하면 여기에 표시돼요."
								: opening
									? "상품 여는 중…"
									: "토스쇼핑에서 보기 ›"}
						</Text>
					</View>
				</Pressable>
				{failed ? (
					<Text
						accessibilityRole="alert"
						style={[s.disclosure, { color: theme.muted }]}
					>
						상품을 열지 못했어요. 다시 눌러 주세요.
					</Text>
				) : null}
			</View>
		</ImpressionArea>
	);
});
const s = StyleSheet.create({
	root: { marginTop: 16, marginBottom: 8 },
	surface: { borderRadius: 16, padding: 16, gap: 8 },
	disclosure: { fontSize: 12, lineHeight: 19 },
	product: {
		flexDirection: "row",
		alignItems: "center",
		gap: 14,
		minHeight: 64,
	},
	image: { width: 68, height: 68 },
	copy: { flex: 1, gap: 6 },
	title: { fontSize: 15, lineHeight: 22, fontWeight: "600" },
	action: { fontSize: 13, lineHeight: 20 },
});

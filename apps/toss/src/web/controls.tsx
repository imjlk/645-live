import { ClassNames } from "@emotion/react";
import {
	Badge as TBadge,
	Button as TButton,
	ConfirmDialog as TDialog,
	IconButton as TIconButton,
	SegmentedControl as TSegment,
	BottomSheet as TSheet,
	Switch as TSwitch,
	Tab as TTab,
} from "@toss/tds-mobile";
import { TDSMobileAITProvider } from "@toss/tds-mobile-ait";
import {
	Children,
	type ComponentProps,
	isValidElement,
	type PropsWithChildren,
	type ReactNode,
} from "react";
import { useTheme } from "../theme";
import { ScrollView, StyleSheet } from "./layout";
export function TDSProvider({
	children,
	fontScaleAvailable,
}: PropsWithChildren<{
	colorPreference?: "light";
	fontScaleAvailable?: boolean;
}>) {
	return (
		<TDSMobileAITProvider
			brandPrimaryColor="#3182F6"
			fontScaleAvailable={fontScaleAvailable}
		>
			{children}
		</TDSMobileAITProvider>
	);
}
type Action = PropsWithChildren<{
	onPress?: () => void;
	type?: "dark" | "danger" | "primary";
	style?: "weak" | "fill";
	accessibilityLabel?: string;
	accessibilityState?: { selected?: boolean };
	display?: "full" | "block" | "inline";
	size?: "tiny" | "small" | "medium" | "large" | "big";
	loading?: boolean;
	disabled?: boolean;
}>;
export function Button({
	onPress,
	type,
	style,
	size,
	accessibilityLabel,
	accessibilityState,
	...rest
}: Action) {
	return (
		<TButton
			aria-pressed={accessibilityState?.selected}
			aria-label={accessibilityLabel}
			{...rest}
			onClick={onPress}
			// RN Web flex columns must retain the TDS button's intrinsic touch height.
			style={{ flexShrink: 0 }}
			color={type}
			variant={style}
			size={size === "tiny" ? "small" : size === "big" ? "xlarge" : size}
		/>
	);
}
export function Badge({
	children,
}: PropsWithChildren<{ type: "green"; size: "tiny"; badgeStyle: "weak" }>) {
	return (
		<TBadge size="xsmall" color="green" variant="weak">
			{children}
		</TBadge>
	);
}
export function Switch({
	onCheckedChange,
	...rest
}: {
	onCheckedChange: (value: boolean) => void;
	checked: boolean;
	disabled?: boolean;
}) {
	return (
		<TSwitch {...rest} onChange={(_, checked) => onCheckedChange(checked)} />
	);
}
export function IconButton({
	name,
	label,
	onPress,
	iconSize,
	color,
	style,
	variant,
}: {
	name: string;
	label: string;
	onPress: () => void;
	iconSize: number;
	color: string;
	variant: "clear" | "fill" | "border";
	style?: object;
}) {
	return (
		<TIconButton
			type="button"
			aria-label={label}
			onClick={onPress}
			name={name}
			iconSize={iconSize}
			color={color}
			variant={variant}
			style={StyleSheet.flatten(style)}
		/>
	);
}
export const SegmentedControl = {
	Root: ({ style, ...props }: ComponentProps<typeof TSegment>) => (
		<TSegment
			{...props}
			style={{ flexShrink: 0, height: "auto", ...style, whiteSpace: "nowrap" }}
		/>
	),
	Item: TSegment.Item,
};
type TabItemProps = PropsWithChildren<{
	value: string;
	redBean?: boolean;
	selected?: boolean;
	onClick?: () => void;
}>;
function TabItem({
	selected = false,
	onClick,
	children,
	redBean,
}: TabItemProps) {
	return (
		<TTab.Item selected={selected} onClick={onClick} redBean={redBean}>
			{children}
		</TTab.Item>
	);
}
export const Tab = Object.assign(
	function Tabs({
		value,
		onChange,
		children,
		fluid,
		floating = false,
	}: PropsWithChildren<{
		value: string;
		onChange: (v: string) => void;
		size?: string;
		fluid?: boolean;
		floating?: boolean;
	}>) {
		const theme = useTheme();
		const items = Children.toArray(children).filter(
			isValidElement<TabItemProps>,
		);
		return (
			<ClassNames>
				{({ css }) => (
					<TTab
						fluid={fluid}
						style={floating ? { backgroundColor: "transparent" } : undefined}
						className={
							floating
								? css({
										"&&::after": { display: "none" },
										"& .tab__scroll-wrapper": { padding: 4 },
										"& .tab__list::after": { display: "none" },
										// Floating navigation marks the selected tab with its own surface.
										// Hide the SDK's separate underline without changing other Tab uses.
										"& .tab__scroll-wrapper > div:last-child": {
											display: "none",
										},
									})
								: undefined
						}
						onChange={(index) => {
							const next = items[index];
							if (next) onChange(next.props.value);
						}}
					>
						{items.map((child) => (
							<TTab.Item
								key={child.props.value}
								selected={child.props.value === value}
								redBean={child.props.redBean}
								style={
									floating
										? {
												backgroundColor:
													child.props.value === value
														? theme.surface
														: "transparent",
												border: `1px solid ${child.props.value === value ? theme.line : "transparent"}`,
												borderRadius: 20,
												whiteSpace: "nowrap",
											}
										: undefined
								}
							>
								{child.props.children}
							</TTab.Item>
						))}
					</TTab>
				)}
			</ClassNames>
		);
	},
	{ Item: TabItem },
);
export const ConfirmDialog = Object.assign(
	function Dialog({
		leftButton,
		rightButton,
		content,
		description,
		...rest
	}: ComponentProps<typeof TDialog> & {
		leftButton: ReactNode;
		rightButton: ReactNode;
		content?: ReactNode;
	}) {
		return (
			<TDialog
				{...rest}
				closeOnBackEvent={false}
				description={
					<>
						{description}
						{content}
					</>
				}
				cancelButton={leftButton}
				confirmButton={rightButton}
			/>
		);
	},
	{ Button },
);
export const BottomSheet = {
	Header: TSheet.Header,
	CTA: Button,
	Root: ({
		open,
		header,
		children,
		cta,
		onClose,
		onExited,
		wrapperProps,
	}: PropsWithChildren<{
		open: boolean;
		header: ReactNode;
		cta?: ReactNode;
		onClose: () => void;
		onExited: () => void;
		wrapperProps?: React.ComponentPropsWithRef<typeof ScrollView>;
	}>) => (
		<TSheet
			open={open}
			onClose={onClose}
			onDimmerClick={onClose}
			onExited={onExited}
			header={header}
			cta={cta}
			UNSAFE_ignoreBackEvent
		>
			<ScrollView {...wrapperProps}>{children}</ScrollView>
		</TSheet>
	),
};

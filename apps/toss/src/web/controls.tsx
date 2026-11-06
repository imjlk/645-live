import {
	Badge as TBadge,
	Button as TButton,
	ConfirmDialog as TDialog,
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
	label,
	onPress,
	iconSize,
	color,
	style,
}: {
	name: string;
	label: string;
	onPress: () => void;
	iconSize: number;
	color: string;
	variant: string;
	style?: object;
}) {
	return (
		<button
			type="button"
			aria-label={label}
			onClick={onPress}
			style={{
				...StyleSheet.flatten(style),
				border: 0,
				background: "transparent",
				fontSize: iconSize,
				color,
			}}
		>
			⚙
		</button>
	);
}
export const SegmentedControl = { Root: TSegment, Item: TSegment.Item };
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
	}: PropsWithChildren<{
		value: string;
		onChange: (v: string) => void;
		size?: string;
		fluid?: boolean;
	}>) {
		const items = Children.toArray(children).filter(
			isValidElement<TabItemProps>,
		);
		return (
			<TTab
				fluid={fluid}
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
					>
						{child.props.children}
					</TTab.Item>
				))}
			</TTab>
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

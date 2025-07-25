/**
 * Comprehensive component prop types and utilities
 * Ensures type safety across all UI components
 */

import type { Snippet } from "svelte";
import type {
	HTMLButtonAttributes,
	HTMLInputAttributes,
} from "svelte/elements";
import type {
	LoadingState,
	LottoNumber,
	RoundNumber,
	ValidationResult,
} from "./index.js";

// ============= Base Component Types =============

/** Base props that all components should accept */
export interface BaseComponentProps {
	/** Additional CSS classes */
	class?: string;
	/** Data attributes for testing and analytics */
	"data-testid"?: string;
}

/** Component with children */
export interface ComponentWithChildren {
	children?: Snippet;
}

/** Component with loading state */
export interface ComponentWithLoading {
	loading?: LoadingState;
}

// ============= Button Component Types =============

/** Button variants */
export type ButtonVariant =
	| "primary"
	| "secondary"
	| "accent"
	| "ghost"
	| "link"
	| "outline"
	| "error"
	| "warning"
	| "success"
	| "info";

/** Button sizes */
export type ButtonSize = "xs" | "sm" | "md" | "lg";

/** Button props with strict typing */
export interface ButtonProps
	extends Omit<HTMLButtonAttributes, "class">,
		BaseComponentProps,
		ComponentWithChildren {
	variant?: ButtonVariant;
	size?: ButtonSize;
	loading?: boolean;
	disabled?: boolean;
	leftIcon?: Snippet<[{ class: string }]>;
	rightIcon?: Snippet<[{ class: string }]>;
}

// ============= Input Component Types =============

/** Input variants */
export type InputVariant =
	| "default"
	| "bordered"
	| "ghost"
	| "primary"
	| "secondary"
	| "accent"
	| "error"
	| "warning"
	| "success";

/** Input sizes */
export type InputSize = "xs" | "sm" | "md" | "lg";

/** Input props with validation */
export interface InputProps
	extends Omit<HTMLInputAttributes, "class" | "size">,
		BaseComponentProps {
	variant?: InputVariant;
	size?: InputSize;
	label?: string;
	placeholder?: string;
	helperText?: string;
	errorText?: string;
	validation?: ValidationResult;
	leftIcon?: Snippet<[{ class: string }]>;
	rightIcon?: Snippet<[{ class: string }]>;
}

// ============= Modal Component Types =============

/** Modal sizes */
export type ModalSize = "sm" | "md" | "lg" | "xl" | "full";

/** Modal props */
export interface ModalProps extends BaseComponentProps, ComponentWithChildren {
	open: boolean;
	onClose?: () => void;
	size?: ModalSize;
	title?: string;
	closable?: boolean;
	backdrop?: boolean;
	header?: Snippet;
	footer?: Snippet;
}

// ============= Card Component Types =============

/** Card variants */
export type CardVariant =
	| "default"
	| "bordered"
	| "compact"
	| "side"
	| "image-full";

/** Card props */
export interface CardProps extends BaseComponentProps, ComponentWithChildren {
	variant?: CardVariant;
	shadow?: boolean;
	hoverable?: boolean;
	title?: string;
	image?: string;
	imageAlt?: string;
	actions?: Snippet;
}

// ============= Table Component Types =============

/** Table column definition */
export interface TableColumn<T = unknown> {
	readonly key: keyof T | string;
	readonly label: string;
	readonly sortable?: boolean;
	readonly width?: string;
	readonly align?: "left" | "center" | "right";
	readonly render?: (value: unknown, row: T, index: number) => string | Snippet;
}

/** Table props */
export interface TableProps<T> extends BaseComponentProps {
	data: readonly T[];
	columns: readonly TableColumn<T>[];
	loading?: LoadingState;
	emptyMessage?: string;
	striped?: boolean;
	hoverable?: boolean;
	compact?: boolean;
	onRowClick?: (row: T, index: number) => void;
}

// ============= Lotto-Specific Component Types =============

/** Lotto ball component props */
export interface LottoBallProps extends BaseComponentProps {
	number: LottoNumber;
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	variant?: "default" | "outlined" | "minimal";
	selected?: boolean;
	disabled?: boolean;
	clickable?: boolean;
	onSelect?: (number: LottoNumber) => void;
}

/** Lotto number picker props */
export interface LottoNumberPickerProps extends BaseComponentProps {
	selectedNumbers: readonly LottoNumber[];
	maxSelections?: number;
	disabled?: boolean;
	onSelectionChange: (numbers: readonly LottoNumber[]) => void;
	highlightedNumbers?: readonly LottoNumber[];
}

/** Round selector props */
export interface RoundSelectorProps extends BaseComponentProps {
	currentRound: RoundNumber;
	minRound?: RoundNumber;
	maxRound?: RoundNumber;
	onRoundChange: (round: RoundNumber) => void;
	loading?: boolean;
	disabled?: boolean;
}

// ============= Statistics Component Types =============

/** Chart component base props */
export interface ChartProps extends BaseComponentProps {
	data: readonly unknown[];
	loading?: LoadingState;
	width?: string;
	height?: string;
	responsive?: boolean;
}

/** Bar chart specific props */
export interface BarChartProps extends ChartProps {
	xAxisKey: string;
	yAxisKey: string;
	color?: string;
	showGrid?: boolean;
	showLabels?: boolean;
}

/** Line chart specific props */
export interface LineChartProps extends ChartProps {
	xAxisKey: string;
	yAxisKey: string;
	strokeColor?: string;
	strokeWidth?: number;
	showPoints?: boolean;
	showArea?: boolean;
}

/** Pie chart specific props */
export interface PieChartProps extends ChartProps {
	labelKey: string;
	valueKey: string;
	colors?: readonly string[];
	showLegend?: boolean;
	showLabels?: boolean;
}

/** Statistics card props */
export interface StatsCardProps extends BaseComponentProps {
	title: string;
	value: string | number;
	change?: {
		value: string | number;
		type: "increase" | "decrease" | "neutral";
	};
	icon?: Snippet<[{ class: string }]>;
	loading?: boolean;
}

// ============= Form Component Types =============

/** Form field props */
export interface FormFieldProps
	extends BaseComponentProps,
		ComponentWithChildren {
	label?: string;
	required?: boolean;
	helperText?: string;
	errorText?: string;
	horizontal?: boolean;
}

/** Form props */
export interface FormProps extends BaseComponentProps, ComponentWithChildren {
	onSubmit?: (event: SubmitEvent) => void | Promise<void>;
	validation?: ValidationResult;
	loading?: boolean;
	disabled?: boolean;
}

// ============= Navigation Component Types =============

/** Navigation item */
export interface NavigationItem {
	readonly href: string;
	readonly label: string;
	readonly icon?: string;
	readonly badge?: string | number;
	readonly disabled?: boolean;
	readonly external?: boolean;
	readonly ariaLabel?: string;
	readonly activePattern?: (pathname: string) => boolean;
}

/** Navigation menu props */
export interface NavigationMenuProps extends BaseComponentProps {
	items: readonly NavigationItem[];
	currentPath: string;
	orientation?: "horizontal" | "vertical";
	variant?: "default" | "pills" | "tabs" | "underline";
}

/** Breadcrumb item */
export interface BreadcrumbItem {
	readonly label: string;
	readonly href?: string;
	readonly current?: boolean;
}

/** Breadcrumb props */
export interface BreadcrumbProps extends BaseComponentProps {
	items: readonly BreadcrumbItem[];
	separator?: Snippet;
	homeIcon?: Snippet<[{ class: string }]>;
}

// ============= Utility Component Types =============

/** Tooltip props */
export interface TooltipProps
	extends BaseComponentProps,
		ComponentWithChildren {
	content: string | Snippet;
	position?: "top" | "bottom" | "left" | "right";
	trigger?: "hover" | "click" | "focus";
	delay?: number;
}

/** Badge props */
export interface BadgeProps extends BaseComponentProps, ComponentWithChildren {
	variant?:
		| "default"
		| "primary"
		| "secondary"
		| "accent"
		| "ghost"
		| "outline"
		| "success"
		| "warning"
		| "error"
		| "info";
	size?: "xs" | "sm" | "md" | "lg";
}

/** Avatar props */
export interface AvatarProps extends BaseComponentProps {
	src?: string;
	alt?: string;
	size?: "xs" | "sm" | "md" | "lg" | "xl";
	shape?: "circle" | "square";
	placeholder?: string;
	online?: boolean;
}

/** Progress bar props */
export interface ProgressProps extends BaseComponentProps {
	value: number;
	max?: number;
	color?: string;
	size?: "xs" | "sm" | "md" | "lg";
	label?: string;
	showValue?: boolean;
}

// ============= Component State Types =============

/** Generic component state */
export interface ComponentState<T = unknown> {
	readonly data: T | null;
	readonly loading: LoadingState;
	readonly initialized: boolean;
}

/** Async component state */
export interface AsyncComponentState<T = unknown> extends ComponentState<T> {
	readonly lastFetch: Date | null;
	readonly cacheKey: string | null;
}

// ============= Event Handler Types =============

/** Generic click handler */
export type ClickHandler<T = HTMLElement> = (
	event: MouseEvent & { currentTarget: T },
) => void;

/** Generic change handler */
export type ChangeHandler<T = HTMLInputElement> = (
	event: Event & { currentTarget: T },
) => void;

/** Generic submit handler */
export type SubmitHandler = (event: SubmitEvent) => void | Promise<void>;

/** Keyboard event handler */
export type KeyboardHandler<T = HTMLElement> = (
	event: KeyboardEvent & { currentTarget: T },
) => void;

// ============= Component Factory Types =============

/** Props for creating reusable component factories */
export interface ComponentFactory<TProps extends Record<string, unknown>> {
	(props: TProps): Snippet;
	displayName?: string;
}

/** Create a typed component factory */
export function createComponentFactory<TProps extends Record<string, unknown>>(
	render: (props: TProps) => Snippet,
	displayName?: string,
): ComponentFactory<TProps> {
	const factory = render as ComponentFactory<TProps>;
	if (displayName) {
		factory.displayName = displayName;
	}
	return factory;
}

// ============= Layout Component Types =============

/** Layout container props */
export interface ContainerProps
	extends BaseComponentProps,
		ComponentWithChildren {
	maxWidth?: "xs" | "sm" | "md" | "lg" | "xl" | "2xl" | "full";
	centered?: boolean;
	padding?: boolean;
}

/** Grid props */
export interface GridProps extends BaseComponentProps, ComponentWithChildren {
	columns?: number | string;
	gap?: string;
	responsive?: Record<string, number | string>;
}

/** Flex props */
export interface FlexProps extends BaseComponentProps, ComponentWithChildren {
	direction?: "row" | "column" | "row-reverse" | "column-reverse";
	justify?: "start" | "end" | "center" | "between" | "around" | "evenly";
	align?: "start" | "end" | "center" | "stretch" | "baseline";
	wrap?: boolean;
	gap?: string;
}

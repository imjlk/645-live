/**
 * Composable for form state management and validation
 * Provides consistent form handling patterns across the application
 */

import type { ValidationResult } from "$lib/types";

// Validation rule types
export type ValidationRule<T = unknown> = (value: T) => string | null;

export interface FieldConfig<T = unknown> {
	/** Initial value for the field */
	initialValue: T;
	/** Validation rules for the field */
	rules?: ValidationRule<T>[];
	/** Whether to validate on change (vs only on submit) */
	validateOnChange?: boolean;
	/** Custom error message */
	errorMessage?: string;
}

export interface FormConfig<T extends Record<string, unknown>> {
	/** Field configurations */
	fields: { [K in keyof T]: FieldConfig<T[K]> };
	/** Whether to validate all fields on change */
	validateOnChange?: boolean;
	/** Submit handler */
	onSubmit?: (values: T) => Promise<void> | void;
	/** Reset handler */
	onReset?: () => void;
}

export interface FormFieldState<T = unknown> {
	/** Current field value */
	readonly value: T;
	/** Field validation result */
	readonly validation: ValidationResult;
	/** Whether field has been touched */
	readonly touched: boolean;
	/** Whether field is currently being validated */
	readonly validating: boolean;
}

export interface FormState<T extends Record<string, unknown>> {
	/** Current form values */
	readonly values: T;
	/** Form validation state */
	readonly validation: ValidationResult;
	/** Individual field states */
	readonly fields: { [K in keyof T]: FormFieldState<T[K]> };
	/** Whether form is currently submitting */
	readonly isSubmitting: boolean;
	/** Whether form has been touched */
	readonly touched: boolean;
	/** Whether form is valid */
	readonly isValid: boolean;
	/** Whether form is pristine (unchanged from initial) */
	readonly isPristine: boolean;
}

export interface FormActions<T extends Record<string, unknown>> {
	/** Set value for a specific field */
	setValue: <K extends keyof T>(field: K, value: T[K]) => void;
	/** Set multiple field values */
	setValues: (values: Partial<T>) => void;
	/** Validate a specific field */
	validateField: <K extends keyof T>(field: K) => Promise<ValidationResult>;
	/** Validate all fields */
	validateForm: () => Promise<ValidationResult>;
	/** Submit the form */
	submit: () => Promise<void>;
	/** Reset form to initial state */
	reset: () => void;
	/** Mark field as touched */
	touchField: <K extends keyof T>(field: K) => void;
	/** Clear field errors */
	clearFieldError: <K extends keyof T>(field: K) => void;
	/** Clear all form errors */
	clearErrors: () => void;
}

// Built-in validation rules
export const validationRules = {
	required: <T>(message = "필수 입력 항목입니다."): ValidationRule<T> => {
		return (value: T): string | null => {
			if (value === null || value === undefined || value === "") {
				return message;
			}
			if (Array.isArray(value) && value.length === 0) {
				return message;
			}
			return null;
		};
	},

	minLength: (min: number, message?: string): ValidationRule<string> => {
		return (value: string): string | null => {
			if (typeof value !== "string") return null;
			if (value.length < min) {
				return message || `최소 ${min}자 이상 입력해주세요.`;
			}
			return null;
		};
	},

	maxLength: (max: number, message?: string): ValidationRule<string> => {
		return (value: string): string | null => {
			if (typeof value !== "string") return null;
			if (value.length > max) {
				return message || `최대 ${max}자까지 입력 가능합니다.`;
			}
			return null;
		};
	},

	email: (
		message = "올바른 이메일 주소를 입력해주세요.",
	): ValidationRule<string> => {
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		return (value: string): string | null => {
			if (typeof value !== "string" || !value) return null;
			if (!emailRegex.test(value)) {
				return message;
			}
			return null;
		};
	},

	pattern: (
		pattern: RegExp,
		message = "형식이 올바르지 않습니다.",
	): ValidationRule<string> => {
		return (value: string): string | null => {
			if (typeof value !== "string" || !value) return null;
			if (!pattern.test(value)) {
				return message;
			}
			return null;
		};
	},

	min: (min: number, message?: string): ValidationRule<number> => {
		return (value: number): string | null => {
			if (typeof value !== "number") return null;
			if (value < min) {
				return message || `${min} 이상의 값을 입력해주세요.`;
			}
			return null;
		};
	},

	max: (max: number, message?: string): ValidationRule<number> => {
		return (value: number): string | null => {
			if (typeof value !== "number") return null;
			if (value > max) {
				return message || `${max} 이하의 값을 입력해주세요.`;
			}
			return null;
		};
	},

	custom: <T>(
		validator: (value: T) => boolean,
		message: string,
	): ValidationRule<T> => {
		return (value: T): string | null => {
			return validator(value) ? null : message;
		};
	},
};

/**
 * Create a form manager
 */
export function useForm<T extends Record<string, unknown>>(
	config: FormConfig<T>,
): [FormState<T>, FormActions<T>] {
	const {
		fields: fieldConfigs,
		validateOnChange = false,
		onSubmit,
		onReset,
	} = config;

	// Initialize state
	const initialValues = Object.fromEntries(
		Object.entries(fieldConfigs).map(([key, config]) => [
			key,
			config.initialValue,
		]),
	) as T;

	let values = $state<T>({ ...initialValues });
	let isSubmitting = $state(false);
	let touched = $state<Set<keyof T>>(new Set());
	let fieldValidations = $state<Record<keyof T, ValidationResult>>(
		Object.fromEntries(
			Object.keys(fieldConfigs).map((key) => [
				key,
				{ isValid: true, errors: [] },
			]),
		) as Record<keyof T, ValidationResult>,
	);
	let fieldValidating = $state<Set<keyof T>>(new Set());

	// Validate a single field
	const validateField = async <K extends keyof T>(
		field: K,
	): Promise<ValidationResult> => {
		const config = fieldConfigs[field];
		const value = values[field];

		if (!config.rules || config.rules.length === 0) {
			return { isValid: true, errors: [] };
		}

		fieldValidating.add(field);
		fieldValidating = new Set(fieldValidating);

		try {
			const errors: string[] = [];

			for (const rule of config.rules) {
				const error = rule(value);
				if (error) {
					errors.push(error);
				}
			}

			const result: ValidationResult = {
				isValid: errors.length === 0,
				errors,
			};

			fieldValidations[field] = result;
			fieldValidations = { ...fieldValidations };

			return result;
		} finally {
			fieldValidating.delete(field);
			fieldValidating = new Set(fieldValidating);
		}
	};

	// Validate all fields
	const validateForm = async (): Promise<ValidationResult> => {
		const results = await Promise.all(
			Object.keys(fieldConfigs).map((field) => validateField(field as keyof T)),
		);

		const allErrors = results.flatMap((result) => result.errors);
		const isValid = results.every((result) => result.isValid);

		return { isValid, errors: allErrors };
	};

	// Set field value
	const setValue = <K extends keyof T>(field: K, value: T[K]) => {
		values[field] = value;
		values = { ...values };

		// Validate on change if configured
		const config = fieldConfigs[field];
		if (config.validateOnChange || validateOnChange) {
			validateField(field);
		}
	};

	// Set multiple values
	const setValues = (newValues: Partial<T>) => {
		Object.entries(newValues).forEach(([key, value]) => {
			if (key in values) {
				setValue(key as keyof T, value as T[keyof T]);
			}
		});
	};

	// Submit form
	const submit = async (): Promise<void> => {
		if (isSubmitting) return;

		try {
			isSubmitting = true;

			// Mark all fields as touched
			touched = new Set(Object.keys(fieldConfigs) as (keyof T)[]);

			// Validate all fields
			const validation = await validateForm();

			if (!validation.isValid) {
				throw new Error("Form validation failed");
			}

			// Call submit handler
			if (onSubmit) {
				await onSubmit(values);
			}
		} finally {
			isSubmitting = false;
		}
	};

	// Reset form
	const reset = () => {
		values = { ...initialValues };
		touched = new Set();
		fieldValidations = Object.fromEntries(
			Object.keys(fieldConfigs).map((key) => [
				key,
				{ isValid: true, errors: [] },
			]),
		) as Record<keyof T, ValidationResult>;

		if (onReset) {
			onReset();
		}
	};

	// Mark field as touched
	const touchField = <K extends keyof T>(field: K) => {
		touched.add(field);
		touched = new Set(touched);
	};

	// Clear field error
	const clearFieldError = <K extends keyof T>(field: K) => {
		fieldValidations[field] = { isValid: true, errors: [] };
		fieldValidations = { ...fieldValidations };
	};

	// Clear all errors
	const clearErrors = () => {
		fieldValidations = Object.fromEntries(
			Object.keys(fieldConfigs).map((key) => [
				key,
				{ isValid: true, errors: [] },
			]),
		) as Record<keyof T, ValidationResult>;
	};

	// Computed state
	const formValidation = $derived<ValidationResult>({
		isValid: Object.values(fieldValidations).every((v) => v.isValid),
		errors: Object.values(fieldValidations).flatMap((v) => v.errors),
	});

	const fieldStates = $derived(
		Object.fromEntries(
			Object.entries(fieldConfigs).map(([key, config]) => [
				key,
				{
					value: values[key as keyof T],
					validation: fieldValidations[key as keyof T],
					touched: touched.has(key as keyof T),
					validating: fieldValidating.has(key as keyof T),
				},
			]),
		) as { [K in keyof T]: FormFieldState<T[K]> },
	);

	const isPristine = $derived(
		Object.keys(fieldConfigs).every(
			(key) => values[key as keyof T] === initialValues[key as keyof T],
		),
	);

	const state: FormState<T> = $derived({
		values,
		validation: formValidation,
		fields: fieldStates,
		isSubmitting,
		touched: touched.size > 0,
		isValid: formValidation.isValid,
		isPristine,
	});

	const actions: FormActions<T> = {
		setValue,
		setValues,
		validateField,
		validateForm,
		submit,
		reset,
		touchField,
		clearFieldError,
		clearErrors,
	};

	return [state, actions];
}

/**
 * Simple field validator for individual fields
 */
export function useFieldValidation<T>(
	initialValue: T,
	rules: ValidationRule<T>[] = [],
): [
	{ value: T; validation: ValidationResult; touched: boolean },
	{
		setValue: (value: T) => void;
		validate: () => Promise<ValidationResult>;
		touch: () => void;
	},
] {
	let value = $state(initialValue);
	let validation = $state<ValidationResult>({ isValid: true, errors: [] });
	let touched = $state(false);

	const validate = async (): Promise<ValidationResult> => {
		const errors: string[] = [];

		for (const rule of rules) {
			const error = rule(value);
			if (error) {
				errors.push(error);
			}
		}

		const result: ValidationResult = {
			isValid: errors.length === 0,
			errors,
		};

		validation = result;
		return result;
	};

	const setValue = (newValue: T) => {
		value = newValue;
		validate(); // Auto-validate on change
	};

	const touch = () => {
		touched = true;
	};

	return [
		{
			value: $derived(value),
			validation: $derived(validation),
			touched: $derived(touched),
		},
		{ setValue, validate, touch },
	];
}

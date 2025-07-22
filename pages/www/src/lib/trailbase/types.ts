/**
 * TrailBase client types
 */

export interface LottoDrawScanCount {
	round: number;
	scan_count_1: number;
	scan_count_2: number;
	scan_count_3: number;
	scan_count_4: number;
	scan_count_5: number;
	scan_count_6: number;
	scan_count_7: number;
	scan_count_8: number;
	scan_count_9: number;
	scan_count_10: number;
	scan_count_11: number;
	scan_count_12: number;
	scan_count_13: number;
	scan_count_14: number;
	scan_count_15: number;
	scan_count_16: number;
	scan_count_17: number;
	scan_count_18: number;
	scan_count_19: number;
	scan_count_20: number;
	scan_count_21: number;
	scan_count_22: number;
	scan_count_23: number;
	scan_count_24: number;
	scan_count_25: number;
	scan_count_26: number;
	scan_count_27: number;
	scan_count_28: number;
	scan_count_29: number;
	scan_count_30: number;
	scan_count_31: number;
	scan_count_32: number;
	scan_count_33: number;
	scan_count_34: number;
	scan_count_35: number;
	scan_count_36: number;
	scan_count_37: number;
	scan_count_38: number;
	scan_count_39: number;
	scan_count_40: number;
	scan_count_41: number;
	scan_count_42: number;
	scan_count_43: number;
	scan_count_44: number;
	scan_count_45: number;
	total_scans: number;
	updated_at: string;
}

export interface TrailbaseError extends Error {
	status?: number;
	code?: string;
}

export interface ConnectionState {
	connected: boolean;
	connecting: boolean;
	error: TrailbaseError | null;
	lastConnected: Date | null;
	retryCount: number;
}

export type SubscriberCallback = (data: LottoDrawScanCount) => void;
export type ConnectionStateCallback = (state: ConnectionState) => void;

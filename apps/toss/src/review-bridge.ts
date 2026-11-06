import {
	getOperationalEnvironment,
	requestReview,
	Storage,
} from "@apps-in-toss/web-framework";
import { LOCAL_PREVIEW } from "./api";
import { createReviewRequest } from "./review-request";
import { trackProduct } from "./telemetry";
import { AppState } from "./web/primitives";

const reviews = createReviewRequest({
	storage: Storage,
	key: "lotto.review-request.v1",
	supported: () =>
		!LOCAL_PREVIEW &&
		getOperationalEnvironment() !== "sandbox" &&
		typeof requestReview === "function" &&
		typeof requestReview.isSupported === "function" &&
		requestReview.isSupported(),
	request: () => requestReview(),
	onRequested: (source) => trackProduct("review_requested", source),
});

export const requestAppReview = (
	options: Parameters<typeof reviews.consider>[0],
) =>
	reviews.consider({
		...options,
		canShow: () => AppState.currentState === "active" && options.canShow(),
	});

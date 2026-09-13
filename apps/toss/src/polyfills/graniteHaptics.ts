import { ensureAppsInTossHapticFallback } from "@trailbase-apps-in-toss-kit/ait-rn/haptics";
import { NativeModules } from "react-native";

export function ensureGraniteHapticFallback() {
	ensureAppsInTossHapticFallback({ nativeModules: NativeModules });
}

ensureGraniteHapticFallback();

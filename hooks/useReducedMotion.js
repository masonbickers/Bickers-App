import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

// Default to the gentler presentation until the device preference is known.
export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(true);
  useEffect(() => {
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener("reduceMotionChanged", (value) => {
      changed = true;
      if (active) setReducedMotion(value);
    });
    AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active && !changed) setReducedMotion(value);
    }).catch(() => {});
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);
  return reducedMotion;
}

//app/(auth)/_layout.tsx
import { Stack } from "expo-router";
import { useReducedMotion } from "../../hooks/useReducedMotion";
export default function AuthLayout() {
  const reduceMotion = useReducedMotion();
  return <Stack screenOptions={{ headerShown: false, animation: reduceMotion ? "none" : "fade" }} />;
}

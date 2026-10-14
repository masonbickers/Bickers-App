import { Stack } from "expo-router";
import { Platform } from "react-native";
import { useReducedMotion } from "../../hooks/useReducedMotion";

import { useEmployeeNotifications } from "../../hooks/useEmployeeNotifications";
import { useAuth } from "../../providers/AuthProvider";

export default function ProtectedLayout() {
  const reduceMotion = useReducedMotion();
  const { workingTermsAccepted } = useAuth();
  useEmployeeNotifications({ enabled: workingTermsAccepted });

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: reduceMotion ? "none" : Platform.OS === "android" ? "default" : "slide_from_right",
        gestureEnabled: true,
        fullScreenGestureEnabled: true,
        animationMatchesGesture: true,
      }}
    >
      <Stack.Screen name="(main-tabs)" options={{ animation: "none", gestureEnabled: false }} />
      <Stack.Screen name="(service-tabs)" options={{ animation: "none", gestureEnabled: false }} />
    </Stack>
  );
}

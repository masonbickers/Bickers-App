import { Slot } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { Platform } from "react-native";
import { useTheme } from "../../providers/ThemeProvider";

export default function NativeTabLayout({ tabs }) {
  const { colors, colorScheme } = useTheme();
  if (Platform.OS !== "ios") return <Slot />;
  return (
      <NativeTabs tintColor={colors.accent} minimizeBehavior="never" disableTransparentOnScrollEdge>
        {tabs.map((tab) => (
          <NativeTabs.Trigger key={tab.route} name={tab.route.replace(/^\//, "")} contentStyle={{ backgroundColor: colors.background }} unstable_nativeProps={{ experimental_userInterfaceStyle: colorScheme }} disableAutomaticContentInsets>
            <NativeTabs.Trigger.Label>{tab.label}</NativeTabs.Trigger.Label>
            <NativeTabs.Trigger.Icon sf={{ default: tab.symbol.inactive, selected: tab.symbol.active }} />
            {tab.badge ? <NativeTabs.Trigger.Badge>{tab.badge}</NativeTabs.Trigger.Badge> : null}
          </NativeTabs.Trigger>
        ))}
      </NativeTabs>
  );
}

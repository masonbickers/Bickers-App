// providers/ThemeProvider.tsx
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DarkTheme, DefaultTheme, ThemeProvider as NavigationThemeProvider } from "@react-navigation/native";
import React, {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useLayoutEffect,
    useMemo,
    useState,
} from "react";
import { AccessibilityInfo, Appearance, Platform } from "react-native";
import { designTokens, type DesignTokens } from "../lib/design/tokens";

const THEME_STORAGE_KEY = "bickers-theme-preference";

/* ---------- Types ---------- */
type Theme = "light" | "dark" | "system";
type ColorScheme = "light" | "dark";

type Colors = {
  groupedBackground: string;
  groupedSurface: string;
  groupedText: string;
  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceElevated: string;
  border: string;
  text: string;
  textMuted: string;
  textOnAccent: string;
  primary: string;
  accent: string;
  accentText: string;
  accentFill: string;
  accentSoft: string;
  danger: string;
  dangerSoft: string;
  warning: string;
  warningSoft: string;
  success: string;
  successSoft: string;
  info: string;
  infoSoft: string;
  focusRing: string;
  inputBackground: string;
  inputBorder: string;
  link: string;
  disabled: string;
  disabledText: string;
  overlay: string;
  mediaBackdrop: string;
  pressed: string;
  selected: string;
  divider: string;
  navigationSurface: string;
  navigationSelected: string;
  navigationBorder: string;
  glassSurface: string;
  glassSelected: string;
  glassBorder: string;
  glassPressed: string;
};

type ThemeContextValue = {
  theme: Theme;          // user preference
  colorScheme: ColorScheme; // effective scheme
  colors: Colors;
  tokens: DesignTokens;
  reduceTransparency: boolean;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
};

interface ThemeProviderProps {
  children: ReactNode;
  forcedTheme?: ColorScheme;
}

/* ---------- Helpers ---------- */

function buildColors(scheme: ColorScheme): Colors {
  if (scheme === "light") {
    return {
      groupedBackground: "#F2F2F7",
      groupedSurface: "#FFFFFF",
      groupedText: "#000000",
      background: "#FFFFFF",
      surface: "#FFFFFF",
      surfaceAlt: "#F2F3F5",
      surfaceElevated: "#FFFFFF",
      border: "#D8DCE2",
      text: "#15202B",
      textMuted: "#5F6C7B",
      textOnAccent: "#FFFFFF",
      primary: "#ED1C25",
      accent: "#ED1C25",
      accentText: "#B31920",
      accentFill: "#D91D26",
      accentSoft: "#F8E6E7",
      danger: "#B42318",
      dangerSoft: "#FEE2E2",
      warning: "#9A4D00",
      warningSoft: "#FEF3C7",
      success: "#157347",
      successSoft: "#DCFCE7",
      info: "#1D4ED8",
      infoSoft: "#DBEAFE",
      focusRing: "#1D4ED8",
      inputBackground: "#FFFFFF",
      inputBorder: "#C7D1DD",
      link: "#B42318",
      disabled: "#E5E7EB",
      disabledText: "#6B7280",
      overlay: "rgba(21, 32, 43, 0.48)",
      mediaBackdrop: "#000000",
      pressed: "#E4E7EB",
      selected: "#F8E6E7",
      divider: "#D4DCE6",
      navigationSurface: "rgba(255, 255, 255, 0.78)",
      navigationSelected: "#D9DADD",
      navigationBorder: "rgba(99, 99, 102, 0.34)",
      glassSurface: "rgba(255, 255, 255, 0.82)",
      glassSelected: "rgba(237, 28, 37, 0.12)",
      glassBorder: "rgba(99, 99, 102, 0.30)",
      glassPressed: "rgba(118, 118, 128, 0.16)",
    };
  }

  return {
    groupedBackground: "#000000",
    groupedSurface: "#1C1C1E",
    groupedText: "#FFFFFF",
    background: "#000000",
    surface: "#0B0B0C",
    surfaceAlt: "#151517",
    surfaceElevated: "#1D1D21",
    border: "#2B2B31",
    text: "#F5F5F5",
    textMuted: "#A1A1AA",
    textOnAccent: "#FFFFFF",
    primary: "#ED1C25",
    accent: "#ED1C25",
    accentText: "#FF6B72",
    accentFill: "#D91D26",
    accentSoft: "#3A1216",
    danger: "#FF5A62",
    dangerSoft: "#3B1212",
    warning: "#F2A93B",
    warningSoft: "#33280C",
    success: "#34C38F",
    successSoft: "#112A1B",
    info: "#60A5FA",
    infoSoft: "#14213D",
    focusRing: "#93C5FD",
    inputBackground: "#111114",
    inputBorder: "#303038",
    link: "#FF6B72",
    disabled: "#27272A",
    disabledText: "#A1A1AA",
    overlay: "rgba(0, 0, 0, 0.68)",
    mediaBackdrop: "#000000",
    pressed: "#54191E",
    selected: "#3A1216",
    divider: "#2B2B31",
    navigationSurface: "rgba(18, 18, 20, 0.78)",
    navigationSelected: "rgba(174, 174, 178, 0.28)",
    navigationBorder: "rgba(199, 199, 204, 0.34)",
    glassSurface: "rgba(36, 36, 40, 0.88)",
    glassSelected: "rgba(237, 28, 37, 0.22)",
    glassBorder: "rgba(199, 199, 204, 0.30)",
    glassPressed: "rgba(174, 174, 178, 0.20)",
  };
}

/* ---------- Context ---------- */

const ThemeContext = createContext<ThemeContextValue>({
  theme: "system",
  colorScheme: "light",
  colors: buildColors("light"),
  tokens: designTokens,
  reduceTransparency: true,
  setTheme: () => {},
  toggleTheme: () => {},
});

/* ---------- Provider ---------- */

export function ThemeProvider({ children, forcedTheme }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>("system");
  const [systemScheme, setSystemScheme] = useState<ColorScheme>(
    Appearance.getColorScheme() === "dark" ? "dark" : "light"
  );
  const [reduceTransparency, setReduceTransparency] = useState(true);

  // Load stored preference
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
        if (stored === "light" || stored === "dark" || stored === "system") {
          setThemeState(stored);
        }
      } catch (err) {
        console.warn("Failed to load theme preference", err);
      }
    })();
  }, []);

  // Watch system theme
  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemScheme(colorScheme === "dark" ? "dark" : "light");
    });
    return () => {
      // Appearance.addChangeListener returns { remove: fn } on native
      // @ts-ignore
      sub?.remove?.();
    };
  }, []);

  useEffect(() => {
    if (Platform.OS !== "ios" || typeof AccessibilityInfo.isReduceTransparencyEnabled !== "function") return;
    let active = true;
    let changed = false;
    const subscription = AccessibilityInfo.addEventListener("reduceTransparencyChanged", (value) => {
      changed = true;
      if (active) setReduceTransparency(value);
    });
    AccessibilityInfo.isReduceTransparencyEnabled().then((value) => {
      if (active && !changed) setReduceTransparency(value);
    }).catch(() => {});
    return () => {
      active = false;
      subscription?.remove();
    };
  }, []);

  const colorScheme: ColorScheme = forcedTheme || (theme === "system" ? systemScheme : theme);

  // Keep native controls in step with the saved app preference, including the
  // currently selected tab. "unspecified" restores device-controlled appearance.
  useLayoutEffect(() => {
    if (Platform.OS !== "ios") return;
    Appearance.setColorScheme(forcedTheme || (theme === "system" ? "unspecified" : theme));
    setSystemScheme(Appearance.getColorScheme() === "dark" ? "dark" : "light");
  }, [forcedTheme, theme]);

  const colors = useMemo(() => buildColors(colorScheme), [colorScheme]);

  // Set theme & persist (synchronous state, async fire-and-forget storage)
  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch((err) =>
      console.warn("Failed to save theme preference", err)
    );
  }, []);

  // Toggle between light/dark, ignoring "system"
  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next: Theme = prev === "dark" ? "light" : "dark";
      AsyncStorage.setItem(THEME_STORAGE_KEY, next).catch((err) =>
        console.warn("Failed to save theme preference", err)
      );
      return next;
    });
  }, []);

  const value = useMemo(
    () => ({
      theme,
      colorScheme,
      colors,
      tokens: designTokens,
      reduceTransparency,
      setTheme,
      toggleTheme,
    }),
    [theme, colorScheme, colors, reduceTransparency, setTheme, toggleTheme]
  );

  const navigationTheme = useMemo(() => {
    const base = colorScheme === "dark" ? DarkTheme : DefaultTheme;
    return {
      ...base,
      colors: {
        ...base.colors,
        background: colors.background,
        card: colors.surface,
        text: colors.text,
        primary: colors.accent,
        border: colors.border,
      },
    };
  }, [colorScheme, colors]);

  return (
    <ThemeContext.Provider value={value}>
      <NavigationThemeProvider value={navigationTheme}>{children}</NavigationThemeProvider>
    </ThemeContext.Provider>
  );
}

/* ---------- Hook ---------- */

export const useTheme = () => useContext(ThemeContext);

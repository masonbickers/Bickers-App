import { createContext, useContext, useLayoutEffect, useMemo, useState } from "react";
import { View } from "react-native";

const NavigationAccessoryContext = createContext({ height: 0, setHeight: () => {} });

export function NavigationAccessoryProvider({ children }) {
  const [height, setHeight] = useState(0);
  const value = useMemo(() => ({ height, setHeight }), [height]);
  return <NavigationAccessoryContext.Provider value={value}>{children}</NavigationAccessoryContext.Provider>;
}

export function useNavigationAccessoryHeight() {
  return useContext(NavigationAccessoryContext).height;
}

// The one floating accessory belongs to the active workspace footer. Its actual
// height includes wrapped copy and stacked recce buttons, including larger text.
export function NavigationAccessory({ children }) {
  const { setHeight } = useContext(NavigationAccessoryContext);
  useLayoutEffect(() => () => setHeight(0), [setHeight]);
  return <View onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>{children}</View>;
}

import { ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Children, Fragment, cloneElement, useEffect, useState } from "react";
import { AppModal, AppText, IconButton } from "./AppPrimitives";
import { getNativeUI } from "./nativeUI";
import { designTokens as t } from "../../lib/design/tokens";
import { useTheme } from "../../providers/ThemeProvider";
import NativeActionButton from "./NativeActionButton";

/** Opt-in native sheet; other platforms and older binaries keep AppModal. */
export default function NativeSettingsSheet(props) {
  const { colors, colorScheme, reduceTransparency } = useTheme();
  const { width, fontScale = 1 } = useWindowDimensions();
  const [detent, setDetent] = useState("medium");
  useEffect(() => { if (props.visible) setDetent("medium"); }, [props.visible]);
  const native = getNativeUI(reduceTransparency);
  if (!native || props.presentation !== "sheet") return <AppModal {...props} />;
  const { Host, BottomSheet, Group, RNHostView, VStack, HStack, Spacer } = native.components;
  const m = native.modifiers;
  const requestClose = () => { if (!props.busy && props.dismissible !== false) props.onRequestClose?.(); };
  const actions = Children.toArray(props.actions?.type === Fragment ? props.actions.props.children : props.actions);
  const nativeFooter = actions.length > 0 && actions.every((action) => action.type === NativeActionButton);
  const stackedActions = width < 360 || fontScale > 1.3;
  const Footer = stackedActions ? VStack : HStack;
  const availableWidth = Math.min(width, t.layout.tabletBreakpoint) - t.spacing.md * 2;
  return <Host style={styles.anchor} useViewportSizeMeasurement colorScheme={colorScheme}>
    <BottomSheet isPresented={props.visible} onIsPresentedChange={(visible) => { if (!visible) requestClose(); }}>
      <Group modifiers={[m.presentationDetents(["medium", "large"], { selection: detent, onSelectionChange: setDetent }), m.presentationDragIndicator("visible"), m.interactiveDismissDisabled(Boolean(props.busy) || props.dismissible === false), m.environment({ key: "colorScheme", value: colorScheme })]}>
        <VStack spacing={t.spacing.none} modifiers={[m.background(colors.groupedBackground)]}>
        <RNHostView>
          <View testID={props.testID} style={[styles.content, { width: Math.min(width, t.layout.tabletBreakpoint), backgroundColor: colors.groupedBackground }]}>
            <View style={styles.header}>
              <AppText variant="sectionTitle" accessibilityRole="header" layoutStyle={styles.title}>{props.title}</AppText>
              {props.dismissible !== false ? <IconButton icon="x" label={props.closeLabel || `Close ${props.title || "settings"}`} onPress={requestClose} disabled={props.busy} /> : null}
            </View>
            <ScrollView style={styles.scroll} contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
              {props.children}
            </ScrollView>
            {!nativeFooter ? <View style={styles.actions}>{props.actions}</View> : null}
          </View>
        </RNHostView>
        {nativeFooter ? <Footer alignment={stackedActions ? "trailing" : undefined} spacing={t.spacing.sm} modifiers={[m.frame({ width: availableWidth, alignment: "trailing" }), m.padding({ all: t.spacing.md })]}>
          {!stackedActions ? <Spacer /> : null}
          {actions.map((action) => cloneElement(action, { hosted: true, availableWidth }))}
        </Footer> : null}
        </VStack>
      </Group>
    </BottomSheet>
  </Host>;
}
const styles = StyleSheet.create({
  anchor: { position: "absolute", width: "100%", height: t.spacing.none },
  content: { flex: 1, paddingTop: t.spacing.sm },
  header: { flexDirection: "row", alignItems: "center", gap: t.spacing.sm, paddingHorizontal: t.spacing.md, paddingBottom: t.spacing.sm },
  title: { flex: 1, minWidth: 0 },
  body: { padding: t.spacing.md, gap: t.spacing.sm },
  scroll: { flex: 1 },
  actions: { flexDirection: "row", justifyContent: "flex-end", flexWrap: "wrap", gap: t.spacing.sm, padding: t.spacing.md },
});

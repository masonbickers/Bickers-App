import React from 'react';
import { View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { AppText as Text } from '../ui/AppPrimitives';
import { useTheme } from '../../providers/ThemeProvider';
import { getCardSurfaceStyle } from '../../lib/design/cardSurface';
import { HOME_DAY_ICONS } from '../../lib/homeDayStatus';
import { styles } from '../../lib/design/screenStyles/main-tabs-screens-homescreen-js';

export default function HomeDayStatus({ label, upcoming = false }) {
  const { colors } = useTheme();
  return <View accessibilityRole="summary" style={[styles.statusSummary, getCardSurfaceStyle(colors)]}>
    <View style={[styles.statusSummaryIcon, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
      <Icon name={HOME_DAY_ICONS[label]} size={18} color={colors.textMuted} />
    </View>
    <View style={styles.statusSummaryCopy}>
      <Text tone="primary" style={styles.statusSummaryTitle}>{label}</Text>
      <Text tone="muted" style={styles.statusSummaryText}>{upcoming ? 'No job assigned.' : 'No assigned job details for today.'}</Text>
    </View>
  </View>;
}

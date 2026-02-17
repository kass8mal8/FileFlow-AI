import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTheme } from '../components/ThemeContext';
import { Bot, Sparkles, ArrowRight } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { triggerHaptic } from '@/utils/haptics';

interface SmartRecapWidgetProps {
  recap: string;
  urgentCount: number;
}

export const SmartRecapWidget: React.FC<SmartRecapWidgetProps> = ({ recap, urgentCount }) => {
  const { colors, theme, typography } = useTheme();

  const handlePress = () => {
    triggerHaptic('selection');
  };

  return (
    <Animated.View entering={FadeInDown.springify()} style={styles.container}>
      <TouchableOpacity activeOpacity={0.9} onPress={handlePress}>
        <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[
          styles.card, 
          { 
            borderColor: urgentCount > 0 ? '#ef4444' : (theme === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)'),
          }
        ]}
      >
        <View style={styles.header}>
          <LinearGradient
            colors={
              urgentCount > 0
                ? [colors.error, '#B91C1C']
                : [colors.aiAccent, colors.aiAccentSecondary]
            }
            style={styles.botCircle}
          >
            <Bot size={18} color="#fff" />
          </LinearGradient>
          
          <View style={styles.titleBox}>
            <Text style={[typography.title, styles.title, { color: colors.text }]}>FileFlow Insights</Text>
            <View style={styles.statusBadge}>
              <Sparkles size={10} color={urgentCount > 0 ? '#EF4444' : colors.primary} />
              <Text style={[styles.statusText, { color: urgentCount > 0 ? colors.error : colors.aiAccent }]}>
                {urgentCount > 0 ? 'Urgent Action Needed' : 'Personal Summary'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.recapContainer}>
          <Text style={[typography.body, styles.recapText, { color: colors.text }]}>
            {recap}
          </Text>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  </Animated.View>
);
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    marginHorizontal: 4,
  },
  card: {
    padding: 16,
    borderRadius: 24,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  botCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBox: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  recapContainer: {
    marginTop: 4,
  },
  recapText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    opacity: 0.8,
  },
});

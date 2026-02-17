import React, { useEffect } from 'react';
import { TouchableOpacity, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { 
  useSharedValue, 
  useAnimatedStyle, 
  withRepeat, 
  withTiming, 
  withSequence,
  Easing 
} from 'react-native-reanimated';
import { triggerHaptic } from '../utils/haptics';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from './ThemeContext';

export type OrbStatus = 'normal' | 'warning' | 'urgent';

interface AIOrbProps {
  onPress: () => void;
  status?: OrbStatus;
}

export const AIOrb: React.FC<AIOrbProps> = ({ onPress, status = 'normal' }) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);
  const translateX = useSharedValue(0);
  const { colors } = useTheme();

  // Status colors mapping (theme-aware)
  const colorsMap = {
    normal: {
      glow: `rgba(${colors.primaryRGB}, 0.55)`,
      gradient: [colors.aiAccent, colors.aiAccentSecondary],
      shadow: colors.aiAccent,
    },
    warning: {
      glow: 'rgba(245, 158, 11, 0.55)',
      gradient: [colors.warning, '#D97706'],
      shadow: colors.warning,
    },
    urgent: {
      glow: 'rgba(239, 68, 68, 0.6)',
      gradient: [colors.error, '#B91C1C'],
      shadow: colors.error,
    },
  } as const;

  const currentColors = colorsMap[status] || colorsMap.normal;

  useEffect(() => {
    // Breathing animation
    scale.value = withRepeat(
      withSequence(
        withTiming(1.1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
    
    // Glow pulsation
    glowOpacity.value = withRepeat(
      withSequence(
        withTiming(0.8, { duration: 1500 }),
        withTiming(0.5, { duration: 1500 })
      ),
      -1,
      true
    );

    // Urgent shake animation
    if (status === 'urgent') {
      translateX.value = withRepeat(
        withSequence(
          withTiming(-4, { duration: 50 }),
          withTiming(4, { duration: 50 }),
          withTiming(0, { duration: 50 })
        ),
        5, // Shake a few times
        false
      );
    }
  }, [status]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value }
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePress = () => {
    triggerHaptic('selection');
    console.log('AI Orb Pressed');
    onPress();
  };

  return (
    <View style={styles.container}>
      {/* Outer Glow */}
      <Animated.View style={[styles.glowContainer, glowStyle]}>
        <LinearGradient
          colors={[currentColors.glow, 'rgba(0, 0, 0, 0.0)']}
          style={styles.glow}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <Animated.View style={[styles.orb, animatedStyle, { shadowColor: currentColors.shadow }]}>
          <LinearGradient
            colors={currentColors.gradient as any}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Sparkles color="#fff" size={28} strokeWidth={2.5} />
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 110,
    right: 24,
    width: 64,
    height: 64,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
  },
  orb: {
    width: 64,
    height: 64,
    borderRadius: 32,
    elevation: 8,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
  },
  gradient: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  glowContainer: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    zIndex: -1,
  },
  glow: {
    flex: 1,
    borderRadius: 45,
  }
});

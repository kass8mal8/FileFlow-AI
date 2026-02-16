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
import { Sparkles } from 'lucide-react-native';
import { triggerHaptic } from '../utils/haptics';

interface AIOrbProps {
  onPress: () => void;
}

export const AIOrb: React.FC<AIOrbProps> = ({ onPress }) => {
  const scale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.5);

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
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const handlePress = () => {
    triggerHaptic('selection');
    // Action Logic to be defined (e.g., Global Command Palette)
    console.log('AI Orb Pressed');
    onPress();
  };

  return (
    <View style={styles.container}>
      {/* Outer Glow */}
      <Animated.View style={[styles.glowContainer, glowStyle]}>
        <LinearGradient
          colors={['rgba(139, 92, 246, 0.6)', 'rgba(56, 189, 248, 0.0)']}
          style={styles.glow}
          start={{ x: 0.5, y: 0.5 }}
          end={{ x: 1, y: 1 }}
        />
      </Animated.View>

      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <Animated.View style={[styles.orb, animatedStyle]}>
          <LinearGradient
            colors={['#8B5CF6', '#3B82F6']}
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

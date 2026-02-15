import React, { useEffect } from 'react';
import { View, StyleSheet, Animated, Easing, ViewStyle, Platform } from 'react-native';
import { useTheme } from './ThemeContext';

interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  variant?: 'rect' | 'circle' | 'rounded';
  style?: ViewStyle;
}

export default function Skeleton({ 
  width = '100%', 
  height = 20, 
  variant = 'rect',
  style 
}: SkeletonProps) {
  const { colors } = useTheme();
  const animatedValue = new Animated.Value(0);

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== 'web',
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [animatedValue]);

  const opacity = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const borderRadius = variant === 'circle' 
    ? typeof height === 'number' ? height / 2 : 999 
    : variant === 'rounded' ? 12 : 0;

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: width as any,
          height: height as any,
          borderRadius,
          opacity,
          backgroundColor: colors.border, // Use theme color instead of hardcoded
        },
        style,
      ] as any}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    // Background color is handled in dynamic styles above
  },
});

import React from 'react';
import { View, StyleSheet, ViewStyle, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useTheme } from '../components/ThemeContext';

interface GlassCardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  intensity?: number;
  variant?: 'default' | 'elevated' | 'outline';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  style, 
  intensity = 20,
  variant = 'default' 
}) => {
  const { colors, isDark } = useTheme();

  // Glass effect settings
  const tint = isDark ? 'dark' : 'light';
  const borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.4)';
  const backgroundColor = isDark ? 'rgba(30, 30, 40, 0.4)' : 'rgba(255, 255, 255, 0.4)';

  return (
    <View style={[styles.container, style]}>
      <BlurView 
        intensity={intensity} 
        tint={tint} 
        style={[
          styles.blurView, 
          { 
            backgroundColor, 
            borderColor,
          } 
        ]}
      >
        <View style={styles.content}>
          {children}
        </View>
      </BlurView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 24,
    overflow: 'hidden',
    // Shadow for depth
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  blurView: {
    width: '100%',
    height: '100%',
    borderWidth: 1,
    borderRadius: 24,
  },
  content: {
    padding: 16,
  }
});

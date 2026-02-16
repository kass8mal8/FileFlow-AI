import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Crown } from 'lucide-react-native';

interface ProBadgeProps {
  size?: 'small' | 'medium' | 'large';
  showIcon?: boolean;
}

export default function ProBadge({ size = 'medium', showIcon = true }: ProBadgeProps) {
  const sizeConfig = {
    small: { padding: 4, fontSize: 9, iconSize: 10, gap: 3 },
    medium: { padding: 6, fontSize: 11, iconSize: 12, gap: 4 },
    large: { padding: 8, fontSize: 13, iconSize: 14, gap: 5 }
  };

  const config = sizeConfig[size];

  return (
    <LinearGradient
      colors={['#FFD700', '#FFA500', '#FF6B35']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[
        styles.badge,
        { 
          paddingHorizontal: config.padding + 4,
          paddingVertical: config.padding,
          gap: config.gap
        }
      ]}
    >
      {showIcon && <Crown size={config.iconSize} color="#FFFFFF" strokeWidth={2.5} />}
      <Text style={[styles.text, { fontSize: config.fontSize }]}>PRO</Text>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 6,
    shadowColor: '#FFA500',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  text: {
    color: '#FFFFFF',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

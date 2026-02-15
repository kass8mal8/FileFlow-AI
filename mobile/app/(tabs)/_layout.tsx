import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '@/components/ThemeContext';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}) {
  return <MaterialCommunityIcons size={26} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { colors, theme } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: 20,
          left: 20,
          right: 20,
          borderRadius: 24,
          height: 70,
          backgroundColor: theme === 'dark' ? colors.surface : colors.white + 'F0',
          borderTopWidth: 0,
          borderWidth: 1,
          borderColor: colors.border,
          elevation: 10,
          ...Platform.select({
            web: {
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
            },
            default: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.1,
              shadowRadius: 10,
            },
          }),
          paddingBottom: 12,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 4,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Flow',
          tabBarIcon: ({ color }) => <TabBarIcon name="folder-sync-outline" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reports"
        options={{
          title: 'Insights',
          tabBarIcon: ({ color }) => <TabBarIcon name="chart-donut" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <TabBarIcon name="tune-variant" color={color} />,
        }}
      />
    </Tabs>
  );
}

import React from 'react';
import { Tabs } from 'expo-router';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/components/ThemeContext';

import { AIOrb } from '@/components/AIOrb';
import { AIActionSheet } from '@/components/AIActionSheet';
import { useState, useEffect } from 'react';
import { triggerHaptic } from '@/utils/haptics';
import { router } from 'expo-router';
import { appStorage } from '@/utils/storage';
import gmailService from '@/services/gmail';
import { useIntelligence } from '@/hooks/useIntelligence';
import { ProcessedFile, UnreadEmail } from '@/types';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  color: string;
}) {
  return <MaterialCommunityIcons size={26} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const { colors, theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [aiMenuVisible, setAiMenuVisible] = useState(false);
  const [intelligenceData, setIntelligenceData] = useState<{ files: ProcessedFile[], emails: UnreadEmail[] }>({ files: [], emails: [] });

  const intelligence = useIntelligence(intelligenceData.files, intelligenceData.emails);

  const refreshIntelligence = async () => {
    const [files, emails] = await Promise.all([
      appStorage.getProcessedFiles(),
      gmailService.fetchRecentUnreadEmails() // Note: This is lightweight (10 emails)
    ]);
    setIntelligenceData({ files, emails });
  };

  useEffect(() => {
    refreshIntelligence();
    // Refresh every 2 minutes for Orb state
    const interval = setInterval(refreshIntelligence, 120000);
    return () => clearInterval(interval);
  }, []);

  const handleAIAction = (actionId: string) => {
    triggerHaptic('medium');
    switch (actionId) {
      case 'chat':
        // Potentially navigate to a dedicated chat screen or open global bubble
        console.log('Global Chat requested');
        break;
      case 'summarize':
        router.push('/reports');
        break;
      case 'scan':
        router.push('/');
        break;
      default:
        break;
    }
  };

  return (
    <>
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          bottom: Math.max(12, insets.bottom + 8),
          left: 16,
          right: 16,
          borderRadius: 20,
          height: 64,
          backgroundColor: theme === 'dark' ? colors.surface : colors.white + 'F0',
          borderTopWidth: 0,
          borderWidth: 0.5,
          borderColor: colors.border,
          elevation: 6,
          ...Platform.select({
            web: {
              boxShadow: '0 4px 10px rgba(0, 0, 0, 0.1)',
            },
            default: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            },
          }),
          paddingBottom: Math.max(8, insets.bottom / 2),
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
        name="todos"
        options={{
          title: 'Todos',
          tabBarIcon: ({ color }) => <TabBarIcon name="checkbox-marked-circle-outline" color={color} />,
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

      <AIOrb onPress={() => setAiMenuVisible(true)} status={intelligence.status} />

    <AIActionSheet 
      visible={aiMenuVisible} 
      onClose={() => setAiMenuVisible(false)}
      onAction={handleAIAction}
    />
    </>
  );
}

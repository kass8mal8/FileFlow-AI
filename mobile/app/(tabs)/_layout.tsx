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
import { BlurView } from 'expo-blur';
import Animated, { 
  useAnimatedStyle, 
  useSharedValue, 
  withSpring,
  withTiming,
  interpolate,
  Extrapolate,
  FadeIn,
  FadeOut,
  Layout
} from 'react-native-reanimated';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';

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
        console.log('Global Chat requested');
        break;
      case 'summarize':
        router.push('/');
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
          headerShown: false,
          tabBarStyle: { display: 'none' }, // We'll use our custom tab bar
        }}
        tabBar={(props) => <CustomTabBar {...props} colors={colors} theme={theme} insets={insets} />}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Flow',
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons 
                name={focused ? "folder-sync" : "folder-sync-outline"} 
                size={26} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="todos"
          options={{
            title: 'Todos',
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons 
                name={focused ? "checkbox-marked-circle" : "checkbox-marked-circle-outline"} 
                size={26} 
                color={color} 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <MaterialCommunityIcons 
                name={focused ? "tune" : "tune-variant"} 
                size={26} 
                color={color} 
              />
            ),
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

function CustomTabBar({ state, descriptors, navigation, colors, theme, insets }: BottomTabBarProps & { colors: any, theme: string, insets: any }) {
  // Removed previous sliding pill logic

  return (
    <View style={[styles.tabBarContainer, { bottom: Math.max(12, insets.bottom + 8) }]}>
      <BlurView
        intensity={theme === 'dark' ? 80 : 95}
        tint={theme === 'dark' ? 'dark' : 'light'}
        style={styles.blurContainer}
      >
        <View style={styles.tabsRow}>
          {state.routes.map((route, index) => {
            const { options } = descriptors[route.key];
            const isFocused = state.index === index;

            // Animated container style
            const animatedContainerStyle = useAnimatedStyle(() => {
              const bg = withTiming(
                isFocused ? colors.primary + (theme === 'dark' ? '30' : '15') : 'transparent',
                { duration: 200 }
              );
              return {
                backgroundColor: bg,
              };
            });

            const animatedIconStyle = useAnimatedStyle(() => {
              const scale = withSpring(isFocused ? 1.1 : 1);
              return {
                transform: [{ scale }],
              };
            });

            const onPress = () => {
              triggerHaptic('light');
              const event = navigation.emit({
                type: 'tabPress',
                target: route.key,
                canPreventDefault: true,
              });

              if (!isFocused && !event.defaultPrevented) {
                navigation.navigate(route.name);
              }
            };

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                style={styles.tabButton}
                activeOpacity={0.7}
              >
                <Animated.View 
                  layout={Layout.springify().damping(15)}
                  style={[styles.animatedTabButton, animatedContainerStyle]}
                >
                  <Animated.View style={animatedIconStyle}>
                    {options.tabBarIcon?.({
                      focused: isFocused,
                      color: isFocused ? colors.primary : colors.textSecondary,
                      size: 24,
                    })}
                  </Animated.View>
                  
                  {isFocused && (
                    <Animated.Text 
                      entering={FadeIn.duration(200).delay(100)}
                      exiting={FadeOut.duration(100)}
                      numberOfLines={1}
                      style={[
                        styles.tabLabel, 
                        { 
                          color: colors.primary,
                          fontWeight: '700',
                          marginLeft: 8
                        }
                      ]}
                    >
                      {options.title}
                    </Animated.Text>
                  )}
                </Animated.View>
              </TouchableOpacity>
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 68,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: 'transparent',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  blurContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  tabsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  tabButton: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  animatedTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
    borderRadius: 22,
    paddingHorizontal: 12,
  },
  iconWrapper: {
    padding: 4,
  },
  tabLabel: {
    fontSize: 13,
  },
});

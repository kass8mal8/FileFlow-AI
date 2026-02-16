import * as React from 'react';
import { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { useColorScheme as useDeviceColorScheme } from 'react-native';
import { appStorage } from '@/utils/storage';

export type ThemePreference = 'light' | 'dark' | 'system';

export const LIGHT_COLORS = {
  primary: '#334155', // Slate 700
  primaryRGB: '51, 65, 85',
  primaryLight: '#64748b', // Slate 500
  primaryDark: '#1e293b', // Slate 800
  background: '#ffffff',
  surface: '#f8fafc', // Slate 50
  text: '#1e293b', // Slate 800
  textSecondary: '#64748b', // Slate 500
  textTertiary: '#94a3b8', // Slate 400
  border: '#f1f5f9', // Slate 100
  success: '#059669', // Emerald 600
  warning: '#d97706', // Amber 600
  error: '#dc2626', // Red 600
  white: '#ffffff',
  glass: 'rgba(255, 255, 255, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.5)',
  gradientStart: '#f8fafc',
  gradientEnd: '#e2e8f0',
};

export const DARK_COLORS = {
  primary: '#f1f5f9', // Slate 100
  primaryRGB: '241, 245, 249',
  primaryLight: '#cbd5e1', // Slate 200
  primaryDark: '#ffffff', 
  background: '#0f172a', // Slate 900
  surface: '#1e293b', // Slate 800
  text: '#f1f5f9', // Slate 100
  textSecondary: '#94a3b8', // Slate 400
  textTertiary: '#64748b', // Slate 500
  border: '#334155', // Slate 700
  success: '#10b981', // Emerald 500
  warning: '#f59e0b', // Amber 500
  error: '#ef4444', // Red 500
  white: '#ffffff',
  glass: 'rgba(30, 41, 59, 0.7)',
  glassBorder: 'rgba(255, 255, 255, 0.1)',
  gradientStart: '#0f172a',
  gradientEnd: '#1e293b',
};

interface ThemeContextType {
  theme: 'light' | 'dark';
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => Promise<void>;
  colors: typeof LIGHT_COLORS;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Track instances for debugging
let instanceCount = 0;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const deviceColorScheme = useDeviceColorScheme();
  const [preference, _setPreference] = useState<ThemePreference>('system');
  const [isLoaded, setIsLoaded] = useState(false);
  const [instanceId] = useState(() => ++instanceCount);

  useEffect(() => {
    async function loadPreference() {
      try {
        const stored = await appStorage.getThemePreference();
        console.log(`[Theme ${instanceId}] Loaded from storage:`, stored);
        if (stored === 'light' || stored === 'dark' || stored === 'system') {
          _setPreference(stored);
        }
      } catch (error) {
        console.error(`[Theme ${instanceId}] Failed to load:`, error);
      } finally {
        setIsLoaded(true);
      }
    }
    loadPreference();
  }, [instanceId]);

  const setPreference = async (pref: ThemePreference) => {
    console.log(`[Theme ${instanceId}] Changing preference to:`, pref);
    _setPreference(pref);
    try {
      await appStorage.setThemePreference(pref);
      console.log(`[Theme ${instanceId}] Saved to storage`);
    } catch (error) {
      console.error(`[Theme ${instanceId}] Failed to save:`, error);
    }
  };

  const theme = useMemo((): 'light' | 'dark' => {
    if (preference === 'dark') return 'dark';
    if (preference === 'light') return 'light';
    const fallback = deviceColorScheme === 'dark' ? 'dark' : 'light';
    return fallback;
  }, [preference, deviceColorScheme]);

  const colors = useMemo(() => {
    return theme === 'dark' ? DARK_COLORS : LIGHT_COLORS;
  }, [theme]);

  const isDark = theme === 'dark';

  // Log summary on every state change
  useEffect(() => {
    console.log(`[Theme ${instanceId}] Render state: pref=${preference}, theme=${theme}, device=${deviceColorScheme}`);
  }, [preference, theme, deviceColorScheme, instanceId]);

  if (!isLoaded) return null;

  return (
    <ThemeContext.Provider value={{ theme, preference, setPreference, colors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, Dimensions, Platform } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react-native';
import { useTheme } from './ThemeContext';

type ToastType = 'success' | 'error' | 'info';

interface ToastContextType {
  show: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Static holder for non-hook usage
export const toast = {
  show: (message: string, type: ToastType = 'success') => {
    console.warn('Toast not yet initialized');
  }
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [activeToast, setActiveToast] = useState<{ message: string, type: ToastType } | null>(null);
  const { colors, theme } = useTheme();
  const timerRef = useRef<any>(null);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setActiveToast({ message, type });
    timerRef.current = setTimeout(() => setActiveToast(null), 3000);
  }, []);

  // Set static reference for non-component usage
  useEffect(() => {
    toast.show = show;
  }, [show]);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {activeToast && (
        <Animated.View 
          entering={FadeInUp.springify().damping(15)} 
          exiting={FadeOutUp} 
          style={styles.toastWrapper}
        >
          <BlurView intensity={80} tint={theme === 'dark' ? 'dark' : 'light'} style={[styles.toastContainer, { borderColor: colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: activeToast.type === 'success' ? '#22c55e20' : activeToast.type === 'error' ? '#ef444420' : colors.primary + '20' }]}>
              {activeToast.type === 'success' && <CheckCircle2 size={18} color="#22c55e" />}
              {activeToast.type === 'error' && <AlertCircle size={18} color="#ef4444" />}
              {activeToast.type === 'info' && <Info size={18} color={colors.primary} />}
            </View>
            <Text style={[styles.toastText, { color: colors.text }]}>{activeToast.message}</Text>
          </BlurView>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within a ToastProvider');
  return context;
};

const styles = StyleSheet.create({
  toastWrapper: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 40,
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  toastContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  toastText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
});

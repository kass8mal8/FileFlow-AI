import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<{ message: string, type: ToastType } | null>(null);
  const { colors, theme } = useTheme();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const show = useCallback((message: string, type: ToastType = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setToast({ message, type });
    timerRef.current = setTimeout(() => setToast(null), 3000);
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast && (
        <Animated.View 
          entering={FadeInUp.springify().damping(15)} 
          exiting={FadeOutUp} 
          style={styles.toastWrapper}
        >
          <BlurView intensity={80} tint={theme === 'dark' ? 'dark' : 'light'} style={[styles.toastContainer, { borderColor: colors.border }]}>
            <View style={[styles.iconContainer, { backgroundColor: toast.type === 'success' ? '#22c55e20' : toast.type === 'error' ? '#ef444420' : colors.primary + '20' }]}>
              {toast.type === 'success' && <CheckCircle2 size={18} color="#22c55e" />}
              {toast.type === 'error' && <AlertCircle size={18} color="#ef4444" />}
              {toast.type === 'info' && <Info size={18} color={colors.primary} />}
            </View>
            <Text style={[styles.toastText, { color: colors.text }]}>{toast.message}</Text>
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

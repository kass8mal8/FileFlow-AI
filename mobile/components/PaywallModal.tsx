import React from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Platform, Dimensions } from 'react-native';
import { BlurView } from 'expo-blur';
import { X } from 'lucide-react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import PaywallContent from './PaywallContent';

const { height } = Dimensions.get('window');

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string;
  userEmail?: string;
}

export default function PaywallModal({ visible, onClose, feature, userEmail }: PaywallModalProps) {
  const { colors, theme } = useTheme();

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <BlurView 
        intensity={Platform.OS === 'ios' ? 40 : 100} 
        tint={theme === 'dark' ? 'dark' : 'light'} 
        style={styles.overlay}
      >
        <Animated.View 
          entering={FadeInUp.springify().damping(15)}
          style={[styles.container, { backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff' }]}
        >
          <View style={styles.header}>
            <TouchableOpacity 
              onPress={onClose} 
              style={[styles.closeButton, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}
            >
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          
          <PaywallContent 
            onSuccess={onClose} 
            onClose={onClose}
            feature={feature}
            isModal={true}
            userEmail={userEmail}
          />
        </Animated.View>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  container: { height: height * 0.92, borderTopLeftRadius: 32, borderTopRightRadius: 32, overflow: 'hidden' },
  header: { padding: 16, paddingRight: 24, alignItems: 'flex-end', position: 'absolute', top: 0, right: 0, zIndex: 10 },
  closeButton: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
});

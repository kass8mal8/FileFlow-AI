import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Dimensions, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Sparkles, MessageSquare, FileSearch, Zap, X, Camera } from 'lucide-react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AIActionSheetProps {
  visible: boolean;
  onClose: () => void;
  onAction: (action: string) => void;
}

export const AIActionSheet: React.FC<AIActionSheetProps> = ({ visible, onClose, onAction }) => {
  const actions = [
    { id: 'chat', label: 'Global AI Chat', icon: MessageSquare, description: 'Ask questions about any file or email', color: '#8B5CF6' },
    { id: 'summarize', label: 'Summarize Today', icon: Zap, description: 'Get a quick recap of recent activity', color: '#F59E0B' },
    { id: 'scan', label: 'Scan & Analyze', icon: Camera, description: 'Process new documents with AI', color: '#10B981' },
    { id: 'search', label: 'Deep Search', icon: FileSearch, description: 'Find specific info buried in files', color: '#3B82F6' },
  ];

  if (!visible) return null;

  return (
    <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
      <Animated.View 
        entering={FadeIn} 
        exiting={FadeOut}
        style={styles.overlay}
      >
        <TouchableOpacity style={styles.dismissArea} onPress={onClose} activeOpacity={1} />
        
        <Animated.View 
          entering={SlideInDown.springify().damping(15)} 
          exiting={SlideOutDown}
          style={styles.sheetContainer}
        >
          <BlurView intensity={90} tint="dark" style={styles.blurBg}>
            <View style={styles.content}>
              <View style={styles.header}>
                <View style={styles.sparkleIcon}>
                  <Sparkles size={20} color="#8B5CF6" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.title}>AI Command Center</Text>
                  <Text style={styles.subtitle}>Supercharge your workflow</Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <X size={20} color="#94A3B8" />
                </TouchableOpacity>
              </View>

              <View style={styles.actionGrid}>
                {actions.map((action) => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.actionCard}
                    onPress={() => {
                        onAction(action.id);
                        onClose();
                    }}
                    activeOpacity={0.7}
                  >
                    <LinearGradient
                      colors={[`${action.color}20`, `${action.color}05`]}
                      style={styles.cardGradient}
                    >
                      <View style={[styles.iconBox, { backgroundColor: `${action.color}30` }]}>
                        <action.icon size={24} color={action.color} />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.actionLabel}>{action.label}</Text>
                        <Text style={styles.actionDesc}>{action.description}</Text>
                      </View>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </BlurView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  dismissArea: {
    flex: 1,
  },
  sheetContainer: {
    width: '100%',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    overflow: 'hidden',
    backgroundColor: '#0F172A', // Slate 900
    borderTopWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  blurBg: {
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  content: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    gap: 12,
  },
  sparkleIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: 'rgba(139, 92, 246, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#F8FAFC',
  },
  subtitle: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '600',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionGrid: {
    gap: 12,
  },
  actionCard: {
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  cardGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F1F5F9',
  },
  actionDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
    fontWeight: '500',
  },
});

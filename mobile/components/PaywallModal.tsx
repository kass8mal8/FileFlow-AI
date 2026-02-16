import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, Dimensions, Platform, Alert, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { X, Check, Crown, Zap, Search, Link2, Cloud, Bell, Sparkles, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInUp, useSharedValue, useAnimatedStyle, withSpring, withTiming, withRepeat, withSequence } from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import subscriptionService from '../services/SubscriptionService';
import PaymentService from '../services/PaymentService';

const { width, height } = Dimensions.get('window');

interface PaywallModalProps {
  visible: boolean;
  onClose: () => void;
  feature?: string; // The feature that triggered the paywall
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function PaywallModal({ visible, onClose, feature }: PaywallModalProps) {
  const { colors, theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState<string>('free');

  useEffect(() => {
    if (visible) {
      setCurrentTier(subscriptionService.getTier());
    }
  }, [visible]);

  const handlePayment = async () => {
    if (!phoneNumber) {
      Alert.alert('Phone Number Required', 'Please enter your M-Pesa phone number to proceed.');
      return;
    }

    setLoading(true);
    try {
      const success = await PaymentService.initiateSTKPush(phoneNumber, 50);
      if (success) {
        Alert.alert('Payment Initiated', 'Please check your phone to complete the M-Pesa payment.');
        await subscriptionService.upgradeToPro('pro_monthly', 'mpesa');
        onClose();
      }
    } catch (error) {
       console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure you want to cancel your Pro subscription?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            await subscriptionService.updateTier('free' as any);
            onClose();
          }
        }
      ]
    );
  };

  const features = [
    { icon: Zap, title: 'Unlimited AI', description: 'No daily limits on summaries or replies' },
    { icon: Sparkles, title: 'Premium Models', description: 'GPT-4o & Gemini 1.5 Pro access' },
    { icon: Search, title: 'Semantic Search', description: 'Find anything with natural language' },
    { icon: Link2, title: 'Cross-Sender Linking', description: 'Connect related emails across senders' },
    { icon: Cloud, title: 'Drive Integration', description: 'Link Google Drive & Dropbox files' },
    { icon: Bell, title: 'Priority Notifications', description: 'AI-filtered urgent alerts only' },
  ];

  // Royal Violet Theme Colors
  const royalViolet = '#7c3aed';
  const violetLight = '#8b5cf6';
  const gold = '#fbbf24';

  return (
    <Modal visible={visible} animationType="fade" transparent>
      <BlurView intensity={Platform.OS === 'ios' ? 40 : 100} tint={theme === 'dark' ? 'dark' : 'light'} style={styles.overlay}>
        <Animated.View 
          entering={FadeInUp.springify().damping(15)}
          style={[styles.container, { backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff' }]}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={[styles.closeButton, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }]}>
              <X size={20} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Hero */}
            <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.heroContainer}>
              <LinearGradient
                colors={[royalViolet, '#6d28d9', '#4c1d95']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.hero}
              >
                <View style={styles.heroBackgroundCircle} />
                <View style={styles.heroIconCircle}>
                  <Crown size={36} color="#FFFFFF" strokeWidth={2} />
                </View>
                <Text style={styles.heroTitle}>
                  {currentTier === 'pro' ? 'You are a Pro!' : 'Upgrade to Pro'}
                </Text>
                <Text style={styles.heroSubtitle}>
                  {currentTier === 'pro' ? 'Enjoy unlimited access to AI features' : 'Unlock the full power of FileFlow AI'}
                </Text>
              </LinearGradient>
            </Animated.View>

            {feature && (
              <Animated.View entering={FadeInDown.delay(200)} style={[styles.featureCallout, { backgroundColor: theme === 'dark' ? '#1e293b' : '#f8fafc', borderColor: royalViolet }]}>
                <Sparkles size={16} color={royalViolet} style={{ marginRight: 8 }} />
                <Text style={[styles.featureCalloutText, { color: colors.text }]}>
                  <Text style={{ fontWeight: '700', color: royalViolet }}>{feature}</Text> requires Pro access
                </Text>
              </Animated.View>
            )}

            {/* Features */}
            <View style={styles.featuresSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>What you get:</Text>
              {features.map((item, index) => (
                <Animated.View 
                  key={index} 
                  entering={FadeInDown.delay(300 + (index * 50)).springify()}
                  style={[styles.featureItem, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc' }]}
                >
                  <View style={[styles.featureIcon, { backgroundColor: royalViolet + '15' }]}>
                    <item.icon size={20} color={royalViolet} />
                  </View>
                  <View style={styles.featureText}>
                    <Text style={[styles.featureTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{item.description}</Text>
                  </View>
                  <Check size={18} color={royalViolet} strokeWidth={2.5} />
                </Animated.View>
              ))}
            </View>

            {/* Pricing */}
            {currentTier !== 'pro' && (
            <Animated.View entering={FadeInDown.delay(600).springify()} style={styles.pricingSection}>
              <TouchableOpacity
                onPress={() => setSelectedPlan('annual')}
                activeOpacity={0.9}
                style={[
                  styles.pricingCard,
                  { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', borderColor: selectedPlan === 'annual' ? royalViolet : colors.border },
                  selectedPlan === 'annual' && styles.selectedCard
                ]}
              >
                {selectedPlan === 'annual' && (
                  <View style={[styles.selectedIndicator, { backgroundColor: royalViolet }]}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                )}
                <View style={styles.saveBadge}>
                  <Text style={styles.saveText}>SAVE 33%</Text>
                </View>
                <Text style={[styles.planName, { color: colors.text }]}>Annual</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[styles.planPrice, { color: colors.text }]}>$79.99</Text>
                  <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>/yr</Text>
                </View>
                <Text style={[styles.planDetail, { color: royalViolet, fontWeight: '600' }]}>$6.67/month</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setSelectedPlan('monthly')}
                activeOpacity={0.9}
                style={[
                  styles.pricingCard,
                  { backgroundColor: theme === 'dark' ? '#1e293b' : '#ffffff', borderColor: selectedPlan === 'monthly' ? royalViolet : colors.border },
                  selectedPlan === 'monthly' && styles.selectedCard
                ]}
              >
                {selectedPlan === 'monthly' && (
                   <View style={[styles.selectedIndicator, { backgroundColor: royalViolet }]}>
                    <Check size={12} color="#fff" strokeWidth={3} />
                  </View>
                )}
                <Text style={[styles.planName, { color: colors.text }]}>Monthly</Text>
                 <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 2 }}>
                  <Text style={[styles.planPrice, { color: colors.text }]}>$9.99</Text>
                  <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>/mo</Text>
                </View>
                <Text style={[styles.planDetail, { color: colors.textSecondary }]}>Flexible</Text>
              </TouchableOpacity>
            </Animated.View>
            )}

            {/* Payment Method Selection */}
            {currentTier !== 'pro' && (
              <Animated.View entering={FadeInDown.delay(700)}>
                <View style={[styles.paymentContainer, { backgroundColor: theme === 'dark' ? '#1e293b' : '#f8fafc' }]}>
                  <Text style={[styles.sectionHeaderLabel, { color: colors.text }]}>Select Payment Method</Text>
                  
                  <View style={styles.paymentMethodsRow}>
                    <TouchableOpacity 
                      onPress={() => setPaymentMethod('mpesa')}
                      style={[
                        styles.paymentMethodCard, 
                        { borderColor: paymentMethod === 'mpesa' ? '#22c55e' : colors.border },
                        paymentMethod === 'mpesa' && { backgroundColor: '#22c55e10' }
                      ]}
                    >
                      <View style={[styles.paymentIconContainer, { backgroundColor: '#22c55e20' }]}>
                         <Text style={{ fontSize: 18 }}>📱</Text>
                      </View>
                      <View>
                        <Text style={[styles.methodText, { color: colors.text }]}>M-Pesa</Text>
                        <Text style={[styles.methodSubtext, { color: colors.textSecondary }]}>Instant</Text>
                      </View>
                      {paymentMethod === 'mpesa' && <View style={styles.radioSelected} />}
                    </TouchableOpacity>
                  </View>
                  
                  {paymentMethod === 'mpesa' && (
                     <View style={styles.inputContainer}>
                        <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>M-Pesa Number</Text>
                        <TextInput
                          style={[styles.input, { backgroundColor: theme === 'dark' ? '#0f172a' : '#ffffff', borderColor: colors.border, color: colors.text }]}
                          placeholder="e.g., 0712345678"
                          placeholderTextColor={colors.textTertiary}
                          keyboardType="phone-pad"
                          value={phoneNumber}
                          onChangeText={setPhoneNumber}
                        />
                      </View>
                  )}
                </View>
              </Animated.View>
            )}

            {/* CTA */}
            {currentTier === 'pro' ? (
              <Animated.View entering={FadeInDown.delay(500)}>
                <TouchableOpacity onPress={handleCancelSubscription}>
                  <View style={[styles.ctaButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.error }]}>
                    <Text style={[styles.ctaText, { color: colors.error }]}>Cancel Subscription</Text>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeInDown.delay(800)} style={styles.bottomCtaContainer}>
                <TouchableOpacity onPress={handlePayment} disabled={loading} activeOpacity={0.8}>
                  <LinearGradient
                    colors={[royalViolet, '#6d28d9']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.ctaButton, { opacity: loading ? 0.8 : 1 }]}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Text style={styles.ctaText}>Start Pro Membership</Text>
                        <ChevronRight size={20} color="#fff" />
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
                  Cancel anytime. Secure payment via M-Pesa.
                </Text>
              </Animated.View>
            )}
            
            <View style={{ height: 40 }} />
          </ScrollView>
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
  content: { paddingHorizontal: 24, paddingTop: 60 },
  
  heroContainer: { marginBottom: 24, borderRadius: 24, shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.2, shadowRadius: 20, elevation: 10 },
  hero: { borderRadius: 24, padding: 24, paddingVertical: 40, alignItems: 'center', overflow: 'hidden', position: 'relative' },
  heroBackgroundCircle: { position: 'absolute', top: -50, right: -50, width: 150, height: 150, borderRadius: 75, backgroundColor: 'rgba(255,255,255,0.1)' },
  heroIconCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginTop: 8, letterSpacing: -0.5, textAlign: 'center' },
  heroSubtitle: { fontSize: 15, color: 'rgba(255,255,255,0.9)', marginTop: 8, textAlign: 'center', maxWidth: '80%', lineHeight: 22 },
  
  featureCallout: { flexDirection: 'row', padding: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1, marginBottom: 24, alignItems: 'center', justifyContent: 'center' },
  featureCalloutText: { fontSize: 13, textAlign: 'center' },
  
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  featuresSection: { gap: 12, marginBottom: 32 },
  featureItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 16, gap: 12 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '600' },
  featureDescription: { fontSize: 13, marginTop: 2 },
  
  pricingSection: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  pricingCard: { flex: 1, padding: 16, paddingVertical: 20, borderRadius: 20, borderWidth: 1.5, alignItems: 'center', position: 'relative', justifyContent: 'center' },
  selectedCard: { shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8, elevation: 4 },
  selectedIndicator: { position: 'absolute', top: -10, borderRadius: 12, width: 24, height: 24, alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  saveBadge: { position: 'absolute', top: -10, backgroundColor: '#22c55e', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  saveText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  planName: { fontSize: 16, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  planPrice: { fontSize: 22, fontWeight: '900' },
  planPeriod: { fontSize: 13, fontWeight: '600', marginBottom: 3 },
  planDetail: { fontSize: 12, marginTop: 6 },
  
  paymentContainer: { padding: 16, borderRadius: 20, marginBottom: 24 },
  sectionHeaderLabel: { fontSize: 15, fontWeight: '600', marginBottom: 12 },
  paymentMethodsRow: { marginBottom: 16 },
  paymentMethodCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 12 },
  paymentIconContainer: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  radioSelected: { width: 20, height: 20, borderRadius: 10,  borderWidth: 6, borderColor: '#22c55e', marginLeft: 'auto' },
  methodText: { fontWeight: '600', fontSize: 14 },
  methodSubtext: { fontSize: 12 },
  inputContainer: { marginTop: 8 },
  inputLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginLeft: 4 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  
  bottomCtaContainer: { marginTop: 8 },
  ctaButton: { padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center', shadowColor: "#7c3aed", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 8 },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: 'bold' },
  disclaimer: { textAlign: 'center', fontSize: 12, marginTop: 16 },
});

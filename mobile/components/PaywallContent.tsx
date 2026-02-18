import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, Platform, Alert, TextInput, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Crown, Zap, Sparkles, Smartphone, Shield, ChevronRight } from 'lucide-react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme } from './ThemeContext';
import subscriptionService from '../services/SubscriptionService';
import PaymentService from '../services/PaymentService';

const { height } = Dimensions.get('window');

interface PaywallContentProps {
  onSuccess?: () => void;
  onClose?: () => void;
  feature?: string;
  isModal?: boolean;
  userEmail?: string;
}

export default function PaywallContent({ onSuccess, onClose, feature, isModal = false, userEmail }: PaywallContentProps) {
  const { colors, theme } = useTheme();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual'>('annual');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState<string>('free');
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'polling' | 'success' | 'failed' | 'timeout'>('idle');
  const [email, setEmail] = useState<string | undefined>(userEmail);

  useEffect(() => {
    setCurrentTier(subscriptionService.getTier());
    
    // Fetch email from storage if not provided as prop
    const fetchEmail = async () => {
      if (!email) {
        const { appStorage } = await import('../utils/storage');
        const userInfo = await appStorage.getUserInfo();
        if (userInfo?.email) {
          setEmail(userInfo.email);
        }
      }
    };
    fetchEmail();
  }, []);

  const handlePayment = async () => {
    if (!phoneNumber) {
      Alert.alert('Phone Number Required', 'Please enter your M-Pesa phone number to proceed.');
      return;
    }

    if (!email) {
      Alert.alert('Email Required', 'Please sign in to continue with payment.');
      return;
    }

    setLoading(true);
    setPaymentStatus('polling');
    const amount = selectedPlan === 'annual' ? 1000 : 100;
    
    try {
      const checkoutRequestId = await PaymentService.initiateSTKPush(phoneNumber, amount, email);
      if (checkoutRequestId) {
        let attempts = 0;
        const maxAttempts = 12; // 1 minute (5s intervals)
        
        const poll = setInterval(async () => {
          attempts++;
          const result = await PaymentService.pollPaymentStatus(checkoutRequestId);
          
          if (result.status === 'COMPLETED' || result.status === 'SUCCESS') {
            clearInterval(poll);
            setPaymentStatus('success');
            await subscriptionService.upgradeToPro(selectedPlan === 'annual' ? 'pro_annual' : 'pro_monthly', 'mpesa');
            
            // Sync with server directly if email is present
            if (email) {
                await subscriptionService.syncWithServer(email);
            }
            
            setLoading(false);
            
            setTimeout(() => {
              if (onSuccess) onSuccess();
              setPaymentStatus('idle');
            }, 3000);
          } else if (result.status === 'FAILED' || result.status === 'CANCELLED') {
            clearInterval(poll);
            setPaymentStatus('failed');
            setLoading(false);
            Alert.alert('Payment Failed', 'The transaction was cancelled or failed. Please try again.');
          } else if (attempts >= maxAttempts) {
            clearInterval(poll);
            setPaymentStatus('timeout');
            setLoading(false);
            Alert.alert('Payment Timeout', 'We couldn\'t confirm your payment in time.');
          }
        }, 5000);
      } else {
        setPaymentStatus('failed');
        setLoading(false);
      }
    } catch (error) {
       console.error(error);
       setPaymentStatus('failed');
       setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    Alert.alert(
      "Cancel Subscription",
      "Are you sure?",
      [
        { text: "No", style: "cancel" },
        { 
          text: "Yes, Cancel", 
          style: "destructive",
          onPress: async () => {
            await subscriptionService.updateTier('free' as any);
            if (onClose) onClose();
          }
        }
      ]
    );
  };

  const features = [
    { icon: Zap, title: 'Unlimited AI Summaries', description: 'Deep-dive analysis for any document' },
    { icon: Smartphone, title: 'Auto-Sync to Drive', description: 'All attachments organized instantly' },
    { icon: Sparkles, title: 'Smart Replies', description: 'AI-generated context-aware responses' },
    { icon: Shield, title: 'Premium Security', description: 'Bank-grade encryption for your data' },
  ];

  const royalViolet = '#7c3aed';

  return (
    <View style={styles.container}>
      {/* Status Overlay */}
      {paymentStatus !== 'idle' && (
        <View style={[styles.statusOverlay, { backgroundColor: theme === 'dark' ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255, 255, 255, 0.95)' }]}>
          {paymentStatus === 'polling' && (
            <Animated.View entering={FadeInDown} style={styles.statusContent}>
              <ActivityIndicator size="large" color={royalViolet} />
              <Text style={[styles.statusTitle, { color: colors.text }]}>Waiting for Payment</Text>
              <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>Confirm the M-Pesa prompt on your phone.</Text>
            </Animated.View>
          )}
          {paymentStatus === 'success' && (
            <Animated.View entering={FadeInDown} style={styles.statusContent}>
              <View style={[styles.successIconCircle, { backgroundColor: '#22c55e' }]}>
                <Check size={40} color="#fff" strokeWidth={3} />
              </View>
              <Text style={[styles.statusTitle, { color: colors.text }]}>Success!</Text>
            </Animated.View>
          )}
          {paymentStatus === 'failed' && (
            <Animated.View entering={FadeInDown} style={styles.statusContent}>
              <TouchableOpacity onPress={() => setPaymentStatus('idle')} style={[styles.retryButton, { backgroundColor: royalViolet }]}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            </Animated.View>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={[styles.content, !isModal && { paddingTop: 20 }]} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroContainer}>
          <LinearGradient
            colors={[royalViolet, '#6d28d9', '#4c1d95']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
          >
            <Crown size={36} color="#FFFFFF" />
            <Text style={styles.heroTitle}>{currentTier === 'pro' ? 'You are a Pro!' : 'Upgrade to Pro'}</Text>
            <Text style={styles.heroSubtitle}>Unlock the full power of FileFlow AI</Text>
          </LinearGradient>
        </View>

        {feature && currentTier !== 'pro' && (
          <View style={[styles.featureCallout, { backgroundColor: theme === 'dark' ? '#1e293b' : '#f8fafc', borderColor: royalViolet }]}>
            <Sparkles size={16} color={royalViolet} />
            <Text style={[styles.featureCalloutText, { color: colors.text }]}>{feature} requires Pro access</Text>
          </View>
        )}

        {/* Features */}
        <View style={styles.featuresSection}>
          {features.map((item, index) => (
            <View key={index} style={[styles.featureItem, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : '#f8fafc' }]}>
              <View style={[styles.featureIcon, { backgroundColor: royalViolet + '15' }]}>
                <item.icon size={20} color={royalViolet} />
              </View>
              <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{item.title}</Text>
                <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>{item.description}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing */}
        {currentTier !== 'pro' && (
          <View style={styles.pricingSection}>
            <TouchableOpacity
              onPress={() => setSelectedPlan('annual')}
              activeOpacity={0.9}
              style={[
                styles.pricingCard,
                styles.annualCard,
                { 
                  borderColor: selectedPlan === 'annual' ? royalViolet : colors.border,
                  backgroundColor: selectedPlan === 'annual' ? (theme === 'dark' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(124, 58, 237, 0.05)') : undefined,
                  transform: [{ scale: selectedPlan === 'annual' ? 1.05 : 1 }]
                }
              ]}
            >
              <View style={styles.bestValueBadge}>
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </View>
              <Text style={[styles.planName, { color: colors.text }]}>Annual</Text>
              <Text style={[styles.planPrice, { color: royalViolet }]}>KES 1,000</Text>
              <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>per year</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedPlan('monthly')}
              activeOpacity={0.9}
              style={[
                styles.pricingCard, 
                { 
                  borderColor: selectedPlan === 'monthly' ? royalViolet : colors.border,
                  marginTop: 12 // Visual offset to make annual pop
                }
              ]}
            >
              <Text style={[styles.planName, { color: colors.text }]}>Monthly</Text>
              <Text style={[styles.planPrice, { color: colors.text }]}>KES 100</Text>
              <Text style={[styles.planPeriod, { color: colors.textSecondary }]}>per month</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* M-Pesa Input */}
        {currentTier !== 'pro' && (
          <View style={styles.paymentContainer}>
            <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>M-Pesa Number</Text>
            <TextInput
              style={[styles.input, { color: colors.text, borderColor: '#22c55e', backgroundColor: theme === 'dark' ? 'rgba(34, 197, 94, 0.05)' : '#fff' }]}
              placeholder="0712345678"
              keyboardType="phone-pad"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
            />
          </View>
        )}

        {/* CTA */}
        {currentTier === 'pro' ? (
          <TouchableOpacity onPress={handleCancelSubscription} style={styles.ctaButton}>
            <Text style={{ color: colors.error }}>Cancel Subscription</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={handlePayment} style={[styles.ctaButton, { backgroundColor: royalViolet }]}>
            <Text style={styles.ctaText}>Start Pro Membership</Text>
          </TouchableOpacity>
        )}
        
        {/* Restore Purchases / Sync */}
        <TouchableOpacity 
           onPress={async () => {
             if (email) {
                setLoading(true);
                await subscriptionService.syncWithServer(email);
                setLoading(false);
                setCurrentTier(subscriptionService.getTier());
                Alert.alert("Sync Complete", "Your subscription status has been updated.");
             } else {
                Alert.alert("Sign In Required", "Please sign in to restore purchases.");
             }
           }}
           style={{ alignSelf: 'center', marginTop: 16 }}
        >
           <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Restore Purchases</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 24 },
  statusOverlay: { ...StyleSheet.absoluteFillObject, zIndex: 100, alignItems: 'center', justifyContent: 'center' },
  statusContent: { alignItems: 'center', gap: 16 },
  statusTitle: { fontSize: 24, fontWeight: '900' },
  statusSubtitle: { textAlign: 'center' },
  successIconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center' },
  retryButton: { padding: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: 'bold' },
  heroContainer: { marginBottom: 24 },
  hero: { borderRadius: 24, padding: 32, alignItems: 'center' },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginTop: 12 },
  heroSubtitle: { color: '#fff', opacity: 0.8 },
  featureCallout: { flexDirection: 'row', padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 24, alignItems: 'center', gap: 8 },
  featureCalloutText: { fontSize: 13 },
  featuresSection: { gap: 12, marginBottom: 32 },
  featureItem: { flexDirection: 'row', padding: 12, borderRadius: 16, gap: 12 },
  featureIcon: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  featureText: { flex: 1 },
  featureTitle: { fontSize: 15, fontWeight: '600' },
  featureDescription: { fontSize: 13 },
  pricingSection: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  pricingCard: { flex: 1, padding: 16, borderRadius: 20, borderWidth: 1.5, alignItems: 'center' },
  planName: { fontSize: 16, fontWeight: '700' },
  planPrice: { fontSize: 20, fontWeight: '900' },
  paymentContainer: { padding: 16, borderRadius: 20, marginBottom: 24 },
  inputLabel: { fontSize: 12, marginBottom: 4 },
  input: { height: 48, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16 },
  ctaButton: { padding: 18, borderRadius: 16, alignItems: 'center' },
  ctaText: { color: '#fff', fontSize: 17, fontWeight: 'bold' },
  annualCard: {
    borderWidth: 2,
    zIndex: 10,
  },
  bestValueBadge: {
    position: 'absolute',
    top: -12,
    backgroundColor: '#FBBF24',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestValueText: {
    color: '#000',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  planPeriod: { fontSize: 12, marginTop: 4 },
});

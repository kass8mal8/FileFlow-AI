
import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Dimensions, TextInput, Alert, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Check, Crown, Zap, Search, Link2, Cloud, Bell, Sparkles, ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../components/ThemeContext'; // Adjusted import path
import subscriptionService from '../services/SubscriptionService';
import PaymentService from '../services/PaymentService';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

 export default function SubscriptionScreen() {
  const { colors, theme } = useTheme();
  const router = useRouter();
  const [selectedPlan, setSelectedPlan] = useState<'monthly' | 'annual' | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'mpesa' | 'card'>('mpesa');
  const [phoneNumber, setPhoneNumber] = useState('');
  
  const features = [
    { icon: <Zap size={20} color="#FFD700" />, title: 'Unlimited Smart Replies' },
    { icon: <Sparkles size={20} color="#FFD700" />, title: 'Advanced AI Summaries' },
    { icon: <Cloud size={20} color="#FFD700" />, title: 'Cloud Sync & Backup' },
  ];
  const [loading, setLoading] = useState(false);
  const [currentTier, setCurrentTier] = useState<string>('free');

  React.useEffect(() => {
    setCurrentTier(subscriptionService.getTier());
  }, []);

  const handlePayment = async () => {
    if (!phoneNumber) {
      Alert.alert('Phone Number Required', 'Please enter your M-Pesa phone number to proceed.');
      return;
    }

    setLoading(true);
    try {
      const amount = selectedPlan === 'annual' ? 1000 : 10;
      const result = await PaymentService.initiateSTKPush(phoneNumber, amount);
      
      if (result && result.CheckoutRequestID) {
        Alert.alert('Payment Initiated', 'Please check your phone and enter your PIN to complete the payment. Waiting for confirmation...');
        
        // Poll for status
        const checkoutRequestId = result.CheckoutRequestID;
        let attempts = 0;
        const maxAttempts = 20; // 40 seconds timeout (2s interval)
        
        const pollInterval = setInterval(async () => {
            attempts++;
            const statusData = await PaymentService.pollPaymentStatus(checkoutRequestId);
            
            if (statusData.status === 'COMPLETED') {
                clearInterval(pollInterval);
                setLoading(false);
                await subscriptionService.upgradeToPro(selectedPlan === 'annual' ? 'pro_annual' : 'pro_monthly', 'mpesa');
                Alert.alert("Success", "Payment confirmed! You are now a Pro user.");
                router.back();
            } else if (statusData.status === 'FAILED') {
                clearInterval(pollInterval);
                setLoading(false);
                Alert.alert("Payment Failed", statusData.data?.resultDesc || "Transaction was not completed.");
            } else if (attempts >= maxAttempts) {
                clearInterval(pollInterval);
                setLoading(false);
                Alert.alert("Timeout", "Payment confirmation timed out. If you paid, please contact support.");
            }
        }, 2000);
      } else {
        setLoading(false);
        Alert.alert("Error", "Failed to initiate payment. Please try again.");
      }
    } catch (error) {
       console.error(error);
       setLoading(false);
       Alert.alert("Error", "An unexpected error occurred.");
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
            router.back();
          }
        }
      ]
    );
  };



  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface }]}>
                <ChevronLeft size={24} color={colors.text} />
            </TouchableOpacity>
        </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.heroContainer}>
            <LinearGradient
            colors={['#FFD700', '#FFA500', '#FF6B35']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.hero}
            >
            <View style={styles.heroIconCircle}>
                <Crown size={32} color="#FFFFFF" strokeWidth={2.5} />
            </View>
            <Text style={styles.heroTitle}>
                {currentTier === 'pro' ? 'You are a Pro!' : 'Upgrade to Pro'}
            </Text>
            <Text style={styles.heroSubtitle}>
                {currentTier === 'pro' ? 'Enjoy unlimited access to AI features' : 'Unlock the full power of AI'}
            </Text>
            </LinearGradient>
        </View>

        {/* Features List - Minimalist Version */}
        <View style={styles.featuresSection}>
            {features.map((item, index) => (
            <View key={index} style={[styles.featureItem, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.featureIcon, { backgroundColor: 'rgba(255, 215, 0, 0.1)' }]}>
                {item.icon}
                </View>
                <View style={styles.featureText}>
                <Text style={[styles.featureTitle, { color: colors.text }]}>{item.title}</Text>
                </View>
            </View>
            ))}
        </View>

        {/* Pricing */}
        <View style={styles.pricingSection}>
            <TouchableOpacity
            onPress={() => setSelectedPlan('annual')}
            style={[
                styles.pricingCard,
                { backgroundColor: colors.surface, borderColor: selectedPlan === 'annual' ? '#FFA500' : colors.border },
                selectedPlan === 'annual' && styles.selectedCard
            ]}
            >
            <View style={styles.saveBadge}>
                <Text style={styles.saveText}>BEST VALUE</Text>
            </View>
            <Text style={[styles.planName, { color: colors.text }]}>Annual</Text>
            <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                <Text style={[styles.planPrice, { color: colors.text }]}>KES 1,000</Text>
                <Text style={[styles.planPeriod, { color: colors.textSecondary, marginBottom: 4 }]}>/year</Text>
            </View>
            <Text style={[styles.planDetail, { color: colors.textSecondary }]}>Just KES 83/month</Text>
            </TouchableOpacity>

            <TouchableOpacity
            onPress={() => setSelectedPlan('monthly')}
            style={[
                styles.pricingCard,
                { backgroundColor: colors.surface, borderColor: selectedPlan === 'monthly' ? '#FFA500' : colors.border },
                selectedPlan === 'monthly' && styles.selectedCard
            ]}
            >
            <Text style={[styles.planName, { color: colors.text }]}>Monthly</Text>
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 4 }}>
                <Text style={[styles.planPrice, { color: colors.text }]}>KES 10</Text>
                <Text style={[styles.planPeriod, { color: colors.textSecondary, marginBottom: 4 }]}>/month</Text>
            </View>
            <Text style={[styles.planDetail, { color: colors.textSecondary }]}>Flexible billing</Text>
            </TouchableOpacity>
        </View>

        {/* Payment Method Selection - Only show if plan is selected AND user is not Pro */}
        {currentTier !== 'pro' && selectedPlan && (
            <View style={styles.paymentContainer}>
            <Text style={[styles.sectionHeaderLabel, { color: colors.text }]}>Select Payment Method</Text>
            <View style={styles.paymentMethodsRow}>
                <TouchableOpacity 
                onPress={() => setPaymentMethod('mpesa')}
                style={[
                    styles.paymentMethodCard, 
                    { backgroundColor: colors.surface, borderColor: paymentMethod === 'mpesa' ? '#22c55e' : colors.border },
                    paymentMethod === 'mpesa' && { borderWidth: 2, backgroundColor: '#22c55e' + '10' }
                ]}
                >
                <View style={styles.paymentIconContainer}>
                    <Image 
                      source={require('../assets/images/mpesa-logo.png')} 
                      style={{ width: 80, height: 40 }} 
                      resizeMode="contain" 
                    />
                </View>
                {paymentMethod === 'mpesa' && <View style={styles.checkIcon}><Check size={12} color="#fff" /></View>}
                </TouchableOpacity>
                
                <TouchableOpacity 
                onPress={() => {
                    Alert.alert("Coming Soon", "Card payments are coming soon.");
                }}
                style={[
                    styles.paymentMethodCard, 
                    { backgroundColor: colors.surface, borderColor: colors.border, opacity: 0.6 }
                ]}
                >
                <View style={styles.paymentIconContainer}>
                    <Text style={{ fontSize: 18 }}>💳</Text>
                </View>
                <Text style={[styles.methodText, { color: colors.text }]}>Card</Text>
                </TouchableOpacity>
            </View>
            </View>
        )}

        {/* Payment Input Section - Only show if not already Pro and Plan Selected */}
        {currentTier !== 'pro' && selectedPlan && paymentMethod === 'mpesa' && (
            <View style={styles.paymentSection}>
            <Text style={[styles.inputLabel, { color: colors.text }]}>M-Pesa Phone Number</Text>
            <TextInput
                style={[styles.input, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g., 0712345678"
                placeholderTextColor={colors.textTertiary}
                keyboardType="phone-pad"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
            />
            </View>
        )}

        {/* CTA */}
        {currentTier === 'pro' ? (
            <TouchableOpacity onPress={handleCancelSubscription}>
            <View style={[styles.ctaButton, { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border }]}>
                <Text style={[styles.ctaText, { color: colors.error }]}>Cancel Subscription</Text>
            </View>
            </TouchableOpacity>
        ) : selectedPlan ? (
            <TouchableOpacity onPress={handlePayment} disabled={loading}>
            <LinearGradient
                colors={['#22c55e', '#16a34a']} // Green for M-Pesa
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[styles.ctaButton, { opacity: loading ? 0.7 : 1 }]}
            >
                {loading ? (
                <ActivityIndicator color="#fff" />
                ) : (
                <Text style={styles.ctaText}>
                    Pay KES {selectedPlan === 'monthly' ? '10' : '1,000'} with M-Pesa
                </Text>
                )}
            </LinearGradient>
            </TouchableOpacity>
        ) : null}

        <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
            Cancel anytime. No commitment required.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingTop: 40, paddingHorizontal: 24 }, // Reduced Safe Area padding
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  content: { paddingHorizontal: 24, paddingBottom: 60 },
  
  heroContainer: { marginBottom: 24, paddingVertical: 10 },
  hero: { borderRadius: 24, padding: 24, paddingVertical: 32, alignItems: 'center', overflow: 'hidden' },
  heroIconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  heroTitle: { fontSize: 32, fontWeight: '900', color: '#FFFFFF', marginTop: 8, letterSpacing: -0.5 },
  heroSubtitle: { fontSize: 16, color: '#FFFFFF', opacity: 0.95, marginTop: 4, textAlign: 'center' },
  
  featuresSection: { gap: 12, marginBottom: 32 },
  
  pricingSection: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  pricingCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1, alignItems: 'center', position: 'relative', minHeight: 140, justifyContent: 'center' },
  selectedCard: { borderWidth: 2, transform: [{ scale: 1.02 }] },
  saveBadge: { position: 'absolute', top: -12, backgroundColor: '#22c55e', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  saveText: { color: '#FFFFFF', fontSize: 10, fontWeight: '800' },
  planName: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  planPrice: { fontSize: 24, fontWeight: '900' },
  planPeriod: { fontSize: 14, fontWeight: '600' },
  planDetail: { fontSize: 12, marginTop: 4 },
  
  paymentContainer: { marginBottom: 24 },
  sectionHeaderLabel: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  paymentMethodsRow: { flexDirection: 'row', gap: 12 },
  paymentMethodCard: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, borderWidth: 1, gap: 12, position: 'relative' },

  paymentIconContainer: { alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  checkIcon: { position: 'absolute', top: 8, right: 8, width: 16, height: 16, borderRadius: 8, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center' },
  
  ctaButton: { padding: 18, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#FFFFFF', fontSize: 17, fontWeight: '900' },
  disclaimer: { textAlign: 'center', fontSize: 12, marginTop: 12 },
  paymentSection: { marginBottom: 24 },
  inputLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  input: { height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 16, fontSize: 16 },
  
  // Feature List Styles

  featureItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, gap: 12 }, // More compact padding
  featureIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }, // Smaller icon container
  featureText: { flex: 1 },
  featureTitle: { fontSize: 14, fontWeight: '600' }, // Slightly smaller font
  featureDescription: { fontSize: 13, marginTop: 2 },
  
  // Method Text Style
  methodText: { fontWeight: '600', fontSize: 14 },
});

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTheme } from '../components/ThemeContext';
import { GlassCard } from './GlassCard';
import { CreditCard, Calendar, FileText, ArrowRight, CheckCircle, AlertCircle } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface SmartHeaderProps {
  intent: 'INVOICE' | 'MEETING' | 'CONTRACT' | 'INFO';
  data: any; // Dynamic data based on intent
  confidence: number;
}

export const SmartHeader: React.FC<SmartHeaderProps> = ({ intent, data, confidence }) => {
  const { colors, isDark } = useTheme();
  const router = useRouter();

  if (confidence < 0.7 || intent === 'INFO') return null;

  const handleAction = () => {
    switch (intent) {
      case 'INVOICE':
        if (data.paybill_number && data.amount) {
           // Navigate to M-Pesa paybill screen or pre-fill
           // For now, we can mock or link
           console.log("Pay Invoice", data);
           // Could deep link or nav to a payment modal
        }
        break;
      case 'MEETING':
        // Add to calendar logic
        console.log("Add to Calendar", data);
        break;
    }
  };

  const renderContent = () => {
    switch (intent) {
      case 'INVOICE':
        return (
          <>
            <View style={styles.iconContainer}>
              <CreditCard size={24} color="#10b981" />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.text }]}>Invoice Detected</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {data.currency || 'KES'} {data.amount?.toLocaleString()} • Due {data.due_date || 'Soon'}
              </Text>
            </View>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#10b981' }]} onPress={handleAction}>
              <Text style={styles.actionText}>Pay Now</Text>
              <ArrowRight size={16} color="#fff" />
            </TouchableOpacity>
          </>
        );
      case 'MEETING':
        return (
          <>
            <View style={styles.iconContainer}>
              <Calendar size={24} color="#3b82f6" />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.text }]}>Meeting Invite</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {data.date} @ {data.time} • {data.platform}
              </Text>
            </View>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#3b82f6' }]} onPress={handleAction}>
              <Text style={styles.actionText}>Add</Text>
              <ArrowRight size={16} color="#fff" />
            </TouchableOpacity>
          </>
        );
       case 'CONTRACT':
        return (
          <>
            <View style={styles.iconContainer}>
              <FileText size={24} color="#f59e0b" />
            </View>
            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: colors.text }]}>Contract Review</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Effective: {data.effective_date}
              </Text>
            </View>
            <TouchableOpacity style={[styles.actionButton, { backgroundColor: '#f59e0b' }]} onPress={handleAction}>
              <Text style={styles.actionText}>Review</Text>
              <ArrowRight size={16} color="#fff" />
            </TouchableOpacity>
          </>
        );
      default:
        return null;
    }
  };

  return (
    <GlassCard style={styles.container} intensity={40}>
      <View style={styles.content}>
        {renderContent()}
      </View>
    </GlassCard>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
    borderRadius: 16,
    overflow: 'hidden',
    marginTop: -10 // Pull up slightly
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  textContainer: {
    flex: 1
  },
  title: {
    fontSize: 16,
    fontWeight: '700'
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    gap: 6
  },
  actionText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 13
  }
});

import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking } from 'react-native';
import { useTheme } from '../components/ThemeContext';
import { GlassCard } from './GlassCard';
import { CreditCard, Calendar, FileText, ArrowRight, CheckCircle, AlertCircle, Users, Clock, ExternalLink, DollarSign, Sparkles } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import subscriptionService from '../services/SubscriptionService';
import * as CalendarAPI from 'expo-calendar';
import ProBadge from './ProBadge';

interface SmartHeaderProps {
  intent: 'INVOICE' | 'MEETING' | 'CONTRACT' | 'INFO';
  data: any;
  confidence: number;
  onPaywallTrigger?: (feature: string) => void;
}

export const SmartHeader: React.FC<SmartHeaderProps> = ({ intent, data, confidence, onPaywallTrigger }) => {
  const { colors, theme } = useTheme();
  const [timeUntilMeeting, setTimeUntilMeeting] = useState<string>('');
  const [isOverdue, setIsOverdue] = useState(false);

  // Calculate time until meeting
  useEffect(() => {
    if (intent === 'MEETING' && data.date && data.time) {
      const updateCountdown = () => {
        try {
          const meetingDateTime = new Date(`${data.date} ${data.time}`);
          const now = new Date();
          const diff = meetingDateTime.getTime() - now.getTime();
          
          if (diff < 0) {
            setTimeUntilMeeting('Started');
          } else if (diff < 3600000) { // Less than 1 hour
            const minutes = Math.floor(diff / 60000);
            setTimeUntilMeeting(`in ${minutes}m`);
          } else if (diff < 86400000) { // Less than 24 hours
            const hours = Math.floor(diff / 3600000);
            setTimeUntilMeeting(`in ${hours}h`);
          } else {
            const days = Math.floor(diff / 86400000);
            setTimeUntilMeeting(`in ${days}d`);
          }
        } catch (e) {
          setTimeUntilMeeting('');
        }
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 60000); // Update every minute
      return () => clearInterval(interval);
    }
  }, [intent, data]);

  // Check if invoice is overdue
  useEffect(() => {
    if (intent === 'INVOICE' && data.due_date) {
      try {
        const dueDate = new Date(data.due_date);
        const now = new Date();
        setIsOverdue(dueDate < now);
      } catch (e) {
        setIsOverdue(false);
      }
    }
  }, [intent, data]);

  if (confidence < 0.4) return null;

  const handlePayInvoice = () => {
    if (!subscriptionService.isPro()) {
      onPaywallTrigger?.('Invoice Payment');
      return;
    }
    // TODO: Implement payment flow
    console.log('Pay Invoice', data);
  };

  const handleAddToCalendar = async () => {
    try {
      const { status } = await CalendarAPI.requestCalendarPermissionsAsync();
      if (status !== 'granted') return;

      const calendars = await CalendarAPI.getCalendarsAsync(CalendarAPI.EntityTypes.EVENT);
      const defaultCalendar = calendars.find(cal => cal.allowsModifications) || calendars[0];
      
      if (!defaultCalendar) return;

      const meetingDate = new Date(`${data.date} ${data.time}`);
      await CalendarAPI.createEventAsync(defaultCalendar.id, {
        title: data.title || 'Meeting',
        startDate: meetingDate,
        endDate: new Date(meetingDate.getTime() + 60 * 60 * 1000),
        notes: data.agenda || '',
      });
    } catch (error) {
      console.error('Calendar error:', error);
    }
  };

  const handleJoinMeeting = () => {
    if (data.meeting_link) {
      Linking.openURL(data.meeting_link);
    }
  };

  const getGradientColors = () => {
    switch (intent) {
      case 'INVOICE':
        return ['#7c3aed', '#3b82f6'];
      case 'MEETING':
        return ['#f97316', '#ef4444'];
      case 'CONTRACT':
        return ['#64748b', '#475569'];
      default:
        return [colors.primary, colors.primaryLight];
    }
  };

  const renderInvoiceCard = () => (
    <LinearGradient
      colors={getGradientColors()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardGradient}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <DollarSign size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Invoice Payment</Text>
          <Text style={styles.cardSubtitle}>{data.vendor || 'Payment Required'}</Text>
        </View>
        {isOverdue && (
          <View style={styles.urgencyBadge}>
            <AlertCircle size={14} color="#fff" />
            <Text style={styles.urgencyText}>Overdue</Text>
          </View>
        )}
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Amount Due</Text>
          <Text style={styles.infoValue}>{data.currency || 'KES'} {data.amount?.toLocaleString()}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Due Date</Text>
          <Text style={styles.infoValue}>{data.due_date || 'N/A'}</Text>
        </View>
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={styles.primaryAction}
          onPress={handlePayInvoice}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryActionText}>Pay Now</Text>
          {!subscriptionService.isPro() && <ProBadge mini style={{ marginLeft: 6 }} />}
          <ArrowRight size={16} color="#fff" />
        </TouchableOpacity>
        {data.invoice_link && (
          <TouchableOpacity style={styles.secondaryAction} onPress={() => Linking.openURL(data.invoice_link)}>
            <ExternalLink size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );

  const renderMeetingCard = () => (
    <LinearGradient
      colors={getGradientColors()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardGradient}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <Calendar size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Meeting Scheduled</Text>
          <Text style={styles.cardSubtitle}>{data.title || 'Upcoming Meeting'}</Text>
        </View>
        {timeUntilMeeting && (
          <View style={styles.urgencyBadge}>
            <Clock size={14} color="#fff" />
            <Text style={styles.urgencyText}>{timeUntilMeeting}</Text>
          </View>
        )}
      </View>

      <View style={styles.infoGrid}>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Date & Time</Text>
          <Text style={styles.infoValue}>{data.date} @ {data.time}</Text>
        </View>
        <View style={styles.infoItem}>
          <Text style={styles.infoLabel}>Platform</Text>
          <Text style={styles.infoValue}>{data.platform || 'N/A'}</Text>
        </View>
      </View>

      {data.participants && (
        <View style={styles.participantsRow}>
          <Users size={14} color="rgba(255,255,255,0.8)" />
          <Text style={styles.participantsText}>{data.participants}</Text>
        </View>
      )}

      <View style={styles.actionRow}>
        {data.meeting_link && (
          <TouchableOpacity 
            style={styles.primaryAction}
            onPress={handleJoinMeeting}
            activeOpacity={0.8}
          >
            <Text style={styles.primaryActionText}>Join Meeting</Text>
            <ExternalLink size={16} color="#fff" />
          </TouchableOpacity>
        )}
        <TouchableOpacity 
          style={data.meeting_link ? styles.secondaryAction : styles.primaryAction}
          onPress={handleAddToCalendar}
          activeOpacity={0.8}
        >
          <Calendar size={16} color="#fff" />
          {!data.meeting_link && <Text style={styles.primaryActionText}>Add to Calendar</Text>}
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderContractCard = () => (
    <LinearGradient
      colors={getGradientColors()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardGradient}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <FileText size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>Legal Document</Text>
          <Text style={styles.cardSubtitle}>{data.document_type || 'Contract Review'}</Text>
        </View>
      </View>

      <View style={styles.infoGrid}>
        {data.parties && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Parties</Text>
            <Text style={styles.infoValue} numberOfLines={1}>{data.parties}</Text>
          </View>
        )}
        {data.effective_date && (
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Effective Date</Text>
            <Text style={styles.infoValue}>{data.effective_date}</Text>
          </View>
        )}
      </View>

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={styles.primaryAction}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryActionText}>Review Terms</Text>
          <ArrowRight size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderInfoCard = () => (
    <LinearGradient
      colors={getGradientColors()}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.cardGradient}
    >
      <View style={styles.cardHeader}>
        <View style={styles.iconBadge}>
          <Sparkles size={20} color="#fff" />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.cardTitle}>{data.title || 'Information Summary'}</Text>
          <Text style={styles.cardSubtitle}>{data.category || 'General Info'}</Text>
        </View>
        {data.reading_time_minutes && (
          <View style={styles.urgencyBadge}>
            <Clock size={14} color="#fff" />
            <Text style={styles.urgencyText}>{data.reading_time_minutes} min read</Text>
          </View>
        )}
      </View>

      {data.key_points && Array.isArray(data.key_points) && (
        <View style={styles.infoGrid}>
          <View style={[styles.infoItem, { backgroundColor: 'rgba(255,255,255,0.1)' }]}>
            {data.key_points.slice(0, 2).map((point: string, idx: number) => (
              <View key={idx} style={{ flexDirection: 'row', gap: 6, marginBottom: idx === 0 ? 4 : 0 }}>
                <CheckCircle size={12} color="rgba(255,255,255,0.8)" style={{ marginTop: 2 }} />
                <Text style={[styles.infoValue, { fontSize: 13, fontWeight: '600' }]} numberOfLines={1}>
                  {point}
                </Text>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.actionRow}>
        <TouchableOpacity 
          style={styles.primaryAction}
          activeOpacity={0.8}
        >
          <Text style={styles.primaryActionText}>View Full Summary</Text>
          <ArrowRight size={16} color="#fff" />
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );

  const renderContent = () => {
    switch (intent) {
      case 'INVOICE':
        return renderInvoiceCard();
      case 'MEETING':
        return renderMeetingCard();
      case 'CONTRACT':
        return renderContractCard();
      case 'INFO':
        return renderInfoCard();
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  cardGradient: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: -0.5,
  },
  cardSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
    marginTop: 2,
    fontWeight: '600',
  },
  urgencyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    textTransform: 'uppercase',
  },
  infoGrid: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  infoItem: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.15)',
    padding: 12,
    borderRadius: 12,
  },
  infoLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  participantsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  participantsText: {
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  primaryAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  primaryActionText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  secondaryAction: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
});

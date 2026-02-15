import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  Alert,
  StatusBar,
  Platform,
  Linking,
} from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { 
  Mail, 
  Sparkles, 
  ChevronLeft, 
  ExternalLink, 
  Send,
  FileText
} from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import gmailService from '../../services/gmail';
import aiService from '../../services/AIService';
import { ProcessedFile, UnreadEmail, SyncStatus } from '../../types';
import { appStorage } from '../../utils/storage';
import { useTheme } from '@/components/ThemeContext';
import Skeleton from '@/components/Skeleton';
import { useToast } from '@/components/Toast';

const { width } = Dimensions.get('window');

export default function EmailDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string, type: 'file' | 'email' }>();
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [item, setItem] = useState<ProcessedFile | UnreadEmail | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [replies, setReplies] = useState<string[]>([]);
  const [body, setBody] = useState<string>('');
  const { theme, colors } = useTheme();
  const toast = useToast();

  useEffect(() => {
    loadContent();
  }, [id, type]);

  const loadContent = async () => {
    try {
      setLoading(true);
      setAiLoading(true);
      let content: ProcessedFile | UnreadEmail | null = null;
      let emailId = id;

      if (type === 'file') {
        const files = await appStorage.getProcessedFiles();
        content = files.find(f => f.id === id) || null;
        if (content) emailId = (content as ProcessedFile).messageId;
      } else {
        const unread = await gmailService.fetchRecentUnreadEmails();
        content = unread.find(e => e.id === id) || null;
      }

      if (!content) {
        Alert.alert("Error", "Content not found.");
        router.back();
        return;
      }

      setItem(content);
      setLoading(false); // Show shell

      // Fetch body for AI
      const fullBody = await gmailService.getMessageBody(emailId);
      setBody(fullBody);

      // AI Analysis
      const [aiSummary, aiReplies] = await Promise.all([
        aiService.generateSummary(fullBody || ''),
        aiService.generateReplies(fullBody || '')
      ]);

      setSummary(typeof aiSummary === 'string' ? aiSummary : '');
      setReplies(Array.isArray(aiReplies) ? aiReplies : []);
    } catch (error) {
      console.error("Error loading email detail:", error);
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  };

  const handleSmartReply = async (reply: string) => {
    if (drafting) return;
    try {
      setDrafting(reply);
      const emailId = type === 'file' ? (item as ProcessedFile).messageId : (item as UnreadEmail).id;
      const threadId = type === 'file' ? (item as ProcessedFile).threadId : (item as UnreadEmail).threadId;
      const from = type === 'file' ? (item as ProcessedFile).emailFrom : (item as UnreadEmail).from;
      const subject = type === 'file' ? (item as ProcessedFile).emailSubject : (item as UnreadEmail).subject;

      await gmailService.createDraft(
        threadId!,
        from!,
        subject!,
        reply
      );

      toast.show("Draft saved to Gmail!");
    } catch (error) {
      console.error("Error creating draft:", error);
      toast.show("Failed to create draft", "error");
    } finally {
      setDrafting(null);
    }
  };

  if (loading && !item) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          <ChevronLeft color={colors.text} size={20} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
          {type === 'file' ? (item as ProcessedFile).filename : (item as UnreadEmail).subject}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Attachment Card if applicable */}
        {type === 'file' && (item as ProcessedFile).status === SyncStatus.Success && (
          <Animated.View entering={FadeInDown.delay(100)} style={styles.attachmentCard}>
            <LinearGradient
              colors={theme === 'dark' ? ['#1e293b', '#0f172a'] : ["#f5f3ff", "#ede9fe"]}
              style={styles.attachmentGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.attachmentIconContainer, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.6)' }]}>
                <FileText color={theme === 'dark' ? colors.primary : "#7c3aed"} size={20} />
              </View>
              <View style={styles.attachmentInfo}>
                <Text style={[styles.attachmentName, { color: colors.text }]}>{(item as ProcessedFile).filename}</Text>
                <Text style={[styles.attachmentMeta, { color: theme === 'dark' ? colors.primaryLight : "#7c3aed" }]}>{(item as ProcessedFile).category} • {((item as ProcessedFile).size / 1024).toFixed(1)} KB</Text>
              </View>
              <TouchableOpacity 
                style={[styles.viewBadge, { backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(124, 58, 237, 0.1)' }]}
                onPress={() => {
                  const url = (item as ProcessedFile).driveUrl;
                  if (url) Linking.openURL(url);
                }}
              >
                <ExternalLink size={14} color={theme === 'dark' ? colors.text : "#7c3aed"} />
                <Text style={[styles.viewBadgeText, { color: theme === 'dark' ? colors.text : "#7c3aed" }]}>View</Text>
              </TouchableOpacity>
            </LinearGradient>
          </Animated.View>
        )}

        {/* AI Summary Card */}
        <Animated.View entering={FadeInDown.delay(200)} style={styles.summarySection}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sparkleContainer, { backgroundColor: colors.primary + '20' }]}>
              <Sparkles size={16} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>AI Insights</Text>
          </View>
          
          {aiLoading ? (
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Skeleton height={18} width="90%" style={{ marginBottom: 8 }} variant="rounded" />
              <Skeleton height={18} width="95%" style={{ marginBottom: 8 }} variant="rounded" />
              <Skeleton height={18} width="60%" variant="rounded" />
            </View>
          ) : (
            <BlurView intensity={60} tint={theme === 'dark' ? 'dark' : 'light'} style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryText, { color: colors.text }]}>{summary}</Text>
            </BlurView>
          )}
        </Animated.View>

        {/* Smart Replies */}
        <Animated.View entering={FadeInDown.delay(300)} style={styles.repliesSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 16 }]}>Recommended Actions</Text>
          <View style={styles.repliesContainer}>
            {aiLoading ? (
              Array(3).fill(0).map((_, i) => (
                <View key={i} style={[styles.replyButton, { backgroundColor: colors.surface, borderColor: colors.border, paddingVertical: 20 }]}>
                  <Skeleton width="70%" height={16} variant="rounded" />
                  <Skeleton width={16} height={16} variant="circle" />
                </View>
              ))
            ) : (
              replies.map((reply, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.replyButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleSmartReply(reply)}
                  disabled={!!drafting}
                >
                  <Text style={[styles.replyButtonText, { color: colors.primary }]}>{reply}</Text>
                  {drafting === reply ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <Send size={14} color={colors.primary} />
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </Animated.View>

        {/* Original Content */}
        <Animated.View entering={FadeInDown.delay(400)} style={styles.contentSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Context</Text>
          <View style={[styles.contentCard, { backgroundColor: colors.surface + '80', borderColor: colors.border }]}>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              {type === 'file' ? (item as ProcessedFile).emailSubject : (item as UnreadEmail).snippet}
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  loadingText: { marginTop: 16, fontSize: 14, fontWeight: '600' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: Platform.OS === 'ios' ? 44 : 12, paddingBottom: 12, paddingHorizontal: 16, borderBottomWidth: 1 },
  headerTitle: { fontSize: 18, fontWeight: '800', flex: 1, textAlign: 'center', marginHorizontal: 16, letterSpacing: -0.5 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1 },
  scrollContent: { padding: 24, paddingBottom: 40 },
  attachmentCard: { marginBottom: 24, borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', elevation: 2 },
  attachmentGradient: { padding: 20, flexDirection: 'row', alignItems: 'center' },
  attachmentIconContainer: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  attachmentInfo: { marginLeft: 16, flex: 1 },
  attachmentName: { fontSize: 16, fontWeight: '800' },
  attachmentMeta: { fontSize: 12, marginTop: 2, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  viewBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  viewBadgeText: { fontSize: 12, fontWeight: 'bold' },
  summarySection: { marginBottom: 32 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, gap: 10 },
  sparkleContainer: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  summaryCard: { borderRadius: 24, padding: 22, borderWidth: 1, overflow: 'hidden', elevation: 2 },
  summaryText: { fontSize: 15, lineHeight: 24, fontWeight: '500' },
  repliesSection: { marginBottom: 32 },
  repliesContainer: { gap: 10 },
  replyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, paddingHorizontal: 20, paddingVertical: 18, borderRadius: 16, elevation: 2 },
  replyButtonText: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 12 },
  contentSection: { marginTop: 12 },
  contentCard: { padding: 20, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed' },
  bodyText: { fontSize: 14, lineHeight: 22, fontWeight: '500' }
});

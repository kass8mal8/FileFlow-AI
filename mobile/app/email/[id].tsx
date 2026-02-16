import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView, TouchableOpacity, Alert, Platform, ActivityIndicator, StatusBar, Linking } from 'react-native';
import { useLocalSearchParams, router, Stack } from 'expo-router';
import { BlurView } from 'expo-blur';
import { Mail, ArrowLeft, Send, Sparkles, CheckSquare, Clock, Shield, Briefcase, User, Calendar, Paperclip, ChevronRight, FileText, Link, Database, ChevronLeft, ExternalLink } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, FadeInRight } from 'react-native-reanimated';
import gmailService from '../../services/gmail';
import aiService from '../../services/AIService';
import linkageService from '../../services/LinkageService';
import subscriptionService from '../../services/SubscriptionService';
import { ProcessedFile, UnreadEmail, SyncStatus } from '../../types';
import { appStorage } from '../../utils/storage';
import { useTheme } from '@/components/ThemeContext';
import Skeleton from '@/components/Skeleton';
import { useToast } from '@/components/Toast';
import ProBadge from '@/components/ProBadge';
import PaywallModal from '@/components/PaywallModal';

const { width } = Dimensions.get('window');

export default function EmailDetailScreen() {
  const { id, type } = useLocalSearchParams<{ id: string, type: 'file' | 'email' }>();
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [item, setItem] = useState<ProcessedFile | UnreadEmail | null>(null);
  const [summary, setSummary] = useState<string>('');
  const [replies, setReplies] = useState<string[]>([]);
  const [todoList, setTodoList] = useState<string>('');
  const [relatedData, setRelatedData] = useState<{ files: ProcessedFile[], threads: any[] }>({ files: [], threads: [] });
  const [body, setBody] = useState<string>('');
  const { theme, colors } = useTheme();
  const toast = useToast();
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState<string>('');

  // Navigation handlers
  const handleOpenRelatedFile = (file: ProcessedFile) => {
    router.push(`/email/${file.id}?type=file`);
  };

  const handleOpenRelatedThread = (thread: any) => {
    router.push(`/email/${thread.id}?type=email`);
  };

  useEffect(() => {
    subscriptionService.initialize();
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

      // Fetch user info for personalization
      const userInfo = await appStorage.getUserInfo();
      const userName = userInfo?.name || 'User';

      // Fetch body for AI
      const fullBody = await gmailService.getMessageBody(emailId);
      setBody(fullBody);

      // AI Analysis (Sequential or Parallel - Parallel for replies, streaming for others)
      const fetchReplies = async () => {
        // Check quota
        const quota = await subscriptionService.canUseAI('reply');
        if (!quota.allowed) {
          setPaywallFeature('Smart Replies');
          setShowPaywall(true);
          return;
        }
        
        const aiReplies = await aiService.generateReplies(fullBody || '', userName);
        setReplies(Array.isArray(aiReplies) ? aiReplies : []);
        await subscriptionService.incrementUsage('reply');
      };

      // Summary Streaming
      const fetchSummary = async () => {
        // Check quota
        const quota = await subscriptionService.canUseAI('summary');
        if (!quota.allowed) {
          setPaywallFeature('AI Summaries');
          setShowPaywall(true);
          setSummary(`You've reached your daily limit of ${quota.limit} AI summaries. Upgrade to Pro for unlimited access.`);
          setAiLoading(false);
          return;
        }
        
        await aiService.generateSummary(fullBody || '', (text) => {
          setSummary(text.replace(/\[Your Name\]/g, userName));
          setAiLoading(false); // Stop summary skeleton as soon as text starts
        });
      };

      // Todo Streaming
      const fetchTodo = async () => {
        await aiService.extractTodo(fullBody || '', (text) => {
          setTodoList(text);
        });
      };

      // Linkage Fetching
      const fetchLinkage = async () => {
        const fromEmail = type === 'file' 
          ? (content as ProcessedFile).emailFrom 
          : (content as UnreadEmail).from;
        
        if (fromEmail) {
          const data = await linkageService.getRelatedKnowledge(fromEmail, content?.id);
          setRelatedData(data);
        }
      };

      await Promise.all([fetchReplies(), fetchSummary(), fetchTodo(), fetchLinkage()]);
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
          
          {summary.length === 0 ? (
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Skeleton height={20} width="90%" style={{ marginBottom: 16 }} variant="rounded" />
              <Skeleton height={20} width="60%" variant="rounded" />
            </View>
          ) : (
            <BlurView intensity={80} tint={theme === 'dark' ? 'dark' : 'light'} style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Text style={[styles.summaryText, { color: colors.text }]}>{summary}</Text>
            </BlurView>
          )}
        </Animated.View>

        {/* Action Items (To-Do List) */}
        <Animated.View entering={FadeInDown.delay(250)} style={styles.todoSection}>
          <View style={styles.sectionHeader}>
            <View style={[styles.todoIconContainer, { backgroundColor: colors.primary + '20' }]}>
              <CheckSquare size={16} color={colors.primary} />
            </View>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Action Items</Text>
          </View>
          
          {todoList.length === 0 ? (
            <View style={[styles.summaryCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <Skeleton height={16} width="80%" style={{ marginBottom: 12 }} variant="rounded" />
              <Skeleton height={16} width="70%" style={{ marginBottom: 12 }} variant="rounded" />
              <Skeleton height={16} width="85%" variant="rounded" />
            </View>
          ) : (
            <View style={[styles.todoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <View style={styles.todoContent}>
                {todoList.split('\n').filter(l => l.trim()).map((line, i) => {
                  const cleanLine = line.replace(/^-\s*\[\s*\]\s*/, '▫️ ').replace(/^-\s*\[x\]\s*/, '✅ ').replace(/^\*\s*/, '• ');
                  return (
                    <Animated.View key={i} entering={FadeInRight.delay(300 + i * 50)} style={styles.todoItemRow}>
                      <Text style={[styles.todoText, { color: colors.text }]}>
                        {cleanLine.split(' ').map((word, wi) => (
                          <Text key={wi} style={word.includes('[High]') ? { color: '#FF4C4C', fontWeight: '700' } : word.includes('(Due:') ? { color: colors.primary, fontStyle: 'italic' } : {}}>
                            {word}{' '}
                          </Text>
                        ))}
                      </Text>
                    </Animated.View>
                  );
                })}
              </View>
            </View>
          )}
        </Animated.View>

        {/* Document Linkage Sidebar (Related Items) */}
        {(relatedData.files.length > 0 || relatedData.threads.length > 0) && (
          <Animated.View entering={FadeInDown.delay(350)} style={styles.linkageSection}>
            <View style={styles.sectionHeader}>
              <View style={[styles.todoIconContainer, { backgroundColor: colors.primary + '20' }]}>
                <Database size={16} color={colors.primary} />
              </View>
              <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Related Knowledge</Text>
              {!subscriptionService.isPro() && <ProBadge size="small" />}
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.relatedScroll}>
              {relatedData.files.map((file, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={[styles.relatedItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleOpenRelatedFile(file)}
                >
                  <FileText size={16} color={colors.primary} />
                  <Text style={[styles.relatedItemText, { color: colors.text }]} numberOfLines={1}>{file.filename}</Text>
                </TouchableOpacity>
              ))}
              {relatedData.threads.map((thread, idx) => (
                <TouchableOpacity 
                  key={`t-${idx}`} 
                  style={[styles.relatedItem, { backgroundColor: colors.surface, borderColor: colors.border }]}
                  onPress={() => handleOpenRelatedThread(thread)}
                >
                  <Link size={16} color={colors.primary} />
                  <Text style={[styles.relatedItemText, { color: colors.text }]} numberOfLines={1}>{thread.subject}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Animated.View>
        )}

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

      {/* Paywall Modal */}
      <PaywallModal 
        visible={showPaywall} 
        onClose={() => setShowPaywall(false)}
        feature={paywallFeature}
      />
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
  todoSection: { marginBottom: 32 },
  todoIconContainer: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', textTransform: 'uppercase', letterSpacing: 1.5 },
  summaryCard: { borderRadius: 24, padding: 22, borderWidth: 1, overflow: 'hidden', elevation: 2 },
  summaryText: { fontSize: 15, lineHeight: 24, fontWeight: '500' },
  todoCard: { borderRadius: 16, padding: 20, borderWidth: 1, overflow: 'hidden' },
  todoContent: { gap: 12 },
  todoItemRow: { flexDirection: 'row', alignItems: 'flex-start' },
  todoText: { fontSize: 14, lineHeight: 24, fontWeight: '500', letterSpacing: 0.2 },
  linkageSection: { marginBottom: 32 },
  relatedScroll: { marginTop: 12, paddingBottom: 8 },
  relatedItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderRadius: 16, borderWidth: 1, marginRight: 12, gap: 8, maxWidth: 200, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 1 },
  relatedItemText: { fontSize: 13, fontWeight: '600', flex: 1 },
  repliesSection: { marginBottom: 32 },
  repliesContainer: { gap: 10 },
  replyButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, paddingHorizontal: 20, paddingVertical: 18, borderRadius: 16, elevation: 2 },
  replyButtonText: { fontSize: 14, fontWeight: '700', flex: 1, marginRight: 12 },
  contentSection: { marginTop: 12 },
  contentCard: { padding: 20, borderRadius: 22, borderWidth: 1, borderStyle: 'dashed' },
  bodyText: { fontSize: 14, lineHeight: 22, fontWeight: '500' }
});

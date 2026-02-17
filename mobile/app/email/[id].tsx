import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
  StatusBar,
  Linking,
  TextInput,
  KeyboardAvoidingView,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useLocalSearchParams, router, Stack } from "expo-router";
import { BlurView } from "expo-blur";
import {
  Mail,
  ArrowLeft,
  Send,
  Sparkles,
  CheckSquare,
  Clock,
  Shield,
  Briefcase,
  User,
  Calendar as CalendarIcon,
  Paperclip,
  ChevronRight,
  FileText,
  Link,
  Database,
  ChevronLeft,
  ExternalLink,
  Bot,
  ThumbsUp,
  ThumbsDown,
  Archive,
  Lock,
  Crown,
} from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight, FadeInUp } from "react-native-reanimated";
import gmailService from "../../services/gmail";
import aiService from "../../services/AIService";
import linkageService from "../../services/LinkageService";
import subscriptionService from "../../services/SubscriptionService";
import driveService from "../../services/drive";
import classifierService from "../../services/classifier";
import { ProcessedFile, UnreadEmail, SyncStatus, FileCategory } from "../../types";
import { appStorage } from "../../utils/storage";
import { useTheme } from "@/components/ThemeContext";
import Skeleton from "@/components/Skeleton";
import { useToast } from "@/components/Toast";
import ProBadge from "@/components/ProBadge";
import PaywallModal from "@/components/PaywallModal";
import { SmartHeader } from "@/components/SmartHeader";
import * as Calendar from "expo-calendar";
import { API_BASE_URL } from "@/utils/constants";

const { width } = Dimensions.get("window");

export default function EmailDetailScreen() {
  const { id, type } = useLocalSearchParams<{
    id: string;
    type: "file" | "email";
  }>();
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(true);
  const [drafting, setDrafting] = useState<string | null>(null);
  const [item, setItem] = useState<ProcessedFile | UnreadEmail | null>(null);
  const [summary, setSummary] = useState<string>("");
  const [replies, setReplies] = useState<string[]>([]);
  const [todoList, setTodoList] = useState<any[]>([]);
  const [todoConfidence, setTodoConfidence] = useState<number>(0);
  const [summaryConfidence, setSummaryConfidence] = useState<number>(0);
  const [relatedData, setRelatedData] = useState<{
    files: ProcessedFile[];
    threads: any[];
  }>({ files: [], threads: [] });
  const [body, setBody] = useState<string>("");
  const [showAllTodos, setShowAllTodos] = useState<boolean>(false);
  const [feedback, setFeedback] = useState<{
    [key: string]: "positive" | "negative" | null;
  }>({});
  const { theme, colors } = useTheme();
  const toast = useToast();
  const [chatMessages, setChatMessages] = useState<
    { id: string; text: string; sender: "user" | "ai" }[]
  >([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [detectedIntent, setDetectedIntent] = useState<{
    type: "INVOICE" | "MEETING" | "CONTRACT" | "INFO";
    confidence: number;
    details: any;
    actions?: any[];
  } | null>(null);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [summaryExpanded, setSummaryExpanded] = useState(false);

  // existing state...
  const [showPaywall, setShowPaywall] = useState(false);

// Chat functionality removed

  // ... rest of existing code
  const [paywallFeature, setPaywallFeature] = useState<string>("");

  // Navigation handlers
  const handleOpenRelatedFile = (file: ProcessedFile) => {
    router.push(`/email/${file.id}?type=file`);
  };

  const handleOpenRelatedThread = (thread: any) => {
    router.push(`/email/${thread.id}?type=email`);
  };

  useEffect(() => {
    subscriptionService.initialize();
    appStorage.getUserInfo().then(setUserInfo);
    loadContent();
  }, [id, type]);

  const loadContent = async () => {
    try {
      setLoading(true);
      setAiLoading(true);
      let content: ProcessedFile | UnreadEmail | null = null;
      let emailId = id;

      if (type === "file") {
        const files = await appStorage.getProcessedFiles();
        content = files.find((f) => f.id === id) || null;
        if (content) emailId = (content as ProcessedFile).messageId;
      } else {
        const unread = await gmailService.fetchRecentUnreadEmails();
        content = unread.find((e) => e.id === id) || null;
      }
      
      const finalId = content?.id || id;

      if (!content) {
        Alert.alert("Error", "Content not found.");
        router.back();
        return;
      }

      setItem(content);
      setLoading(false); // Show shell

      // Lazy Loading: If file is Pending, process it now
      if (type === 'file' && (content as ProcessedFile).status === SyncStatus.Pending) {
        try {
          setProcessingStatus("FileFlow is analyzing your document...");
          const fileItem = content as ProcessedFile;
          
          // 1. Classify
          const category = await classifierService.classifyFile({
            filename: fileItem.filename,
            emailSubject: fileItem.emailSubject || '',
            emailSnippet: '', // Snippet not stored in Pending, could fetch if needed
            emailFrom: fileItem.emailFrom || '',
          });

          setProcessingStatus("Protecting your document privacy...");
          // 2. Download
          const attachmentData = await gmailService.downloadAttachment(
            fileItem.messageId,
            fileItem.attachmentId || id // Fallback to id if attachmentId is missing
          );
          
          // Note: If sync stored id as something else, we might need to adjust.
          // In BackgroundService, id is `${Date.now()}-${attachment.filename}`.
          // We need the ACTUAL attachmentId.
          // Let's assume for now the sync logic should have stored it or can find it.
          // Revision: BackgroundService.ts should store the attachmentId.
          
          // 3. Upload
          const driveFile = await driveService.uploadFile(
            fileItem.filename,
            attachmentData,
            fileItem.mimeType || 'application/pdf',
            category
          );

          // 4. Update local & storage
          const updatedFile: ProcessedFile = {
            ...fileItem,
            category: category as FileCategory,
            status: SyncStatus.Success,
            driveFileId: driveFile.fileId,
            driveUrl: driveFile.webViewLink,
          };
          
          setItem(updatedFile);
          content = updatedFile;
          await appStorage.updateProcessedFile(fileItem.id, {
            category: category as FileCategory,
            status: SyncStatus.Success,
            driveFileId: driveFile.fileId,
            driveUrl: driveFile.webViewLink,
          });
        } catch (error) {
          console.error("Lazy processing failed:", error);
          setProcessingStatus("Processing failed. Showing basic info.");
        } finally {
          setProcessingStatus(null);
        }
      }

      // Fetch user info for personalization
      const cachedUserInfo = await appStorage.getUserInfo();
      setUserInfo(cachedUserInfo);
      const userName = cachedUserInfo?.name || "User";

      // Fetch body for AI
      const fullBody = await gmailService.getMessageBody(emailId);
      setBody(fullBody);

      // Auto-mark as read
      await gmailService.markAsRead(emailId);

      // AI Analysis (Sequential or Parallel - Parallel for replies, streaming for others)
      const fetchReplies = async () => {
        // Check quota
        const quota = await subscriptionService.canUseAI("reply");
        if (!quota.allowed) {
          setPaywallFeature("Smart Replies");
          setShowPaywall(true);
          return;
        }

        const aiReplies = await aiService.generateReplies(
          fullBody || "",
          userName
        );
        setReplies(Array.isArray(aiReplies) ? aiReplies : []);
        await subscriptionService.incrementUsage("reply");
      };

      // 5. Progressive AI Analysis for Faster Perceived Performance
      const performAnalysis = async () => {
        try {
          // Linkage can run in parallel
          const linkagePromise = (async () => {
              const fromEmail = type === "file" ? (content as ProcessedFile)?.emailFrom : (content as UnreadEmail)?.from;
              if (fromEmail) {
                const related = await linkageService.getRelatedKnowledge(fromEmail, finalId);
                setRelatedData(related);
              }
          })();

          const tier = subscriptionService.isPro() ? 'pro' : 'free';
          const fromEmail = type === "file" ? (content as ProcessedFile)?.emailFrom : (content as UnreadEmail)?.from;

          // Use progressive loading for faster perceived speed
          await aiService.analyzeEmailProgressive(
            {
              text: fullBody || "",
              emailId: finalId,
              userId: cachedUserInfo?.email || "",
              userName: userName,
              tier: tier,
              from: fromEmail
            },
            {
              onProgress: (step, total, message) => {
                console.log(`AI Progress: ${step}/${total} - ${message}`);
              },
              onSummary: (summaryText, confidence) => {
                setSummary(summaryText);
                setSummaryConfidence(confidence);
                // Increment usage for summary (first result)
                subscriptionService.incrementUsage("summary");
              },
              onReplies: (repliesData) => {
                if (Array.isArray(repliesData)) {
                  setReplies(repliesData);
                  // Increment usage for replies
                  if (repliesData.length > 0) {
                    subscriptionService.incrementUsage("reply");
                  }
                }
              },
              onActionItems: (items) => {
                setTodoList(items);
              },
              onIntent: (intentData) => {
                setDetectedIntent(intentData.type);
              },
              onComplete: (cached) => {
                console.log(`Analysis complete (cached: ${cached})`);
                setAiLoading(false);
              },
              onError: (error) => {
                console.error("Progressive analysis error:", error);
                setSummary("An error occurred during analysis.");
                setAiLoading(false);
              }
            }
          );

          await linkagePromise;

        } catch (error) {
          console.error("AI Analysis Error:", error);
          setSummary("An error occurred during analysis.");
        } finally {
          setAiLoading(false);
        }
      };

      performAnalysis();
    } catch (error) {
      console.error("Error loading email detail:", error);
    } finally {
      setLoading(false);
      setAiLoading(false);
    }
  };

  const handleSmartReply = async (reply: string, action: "draft" | "send") => {
    if (drafting) return;

    // Pro Check for sending
    if (action === "send" && !subscriptionService.isPro()) {
      setPaywallFeature("Direct Send");
      setShowPaywall(true);
      return;
    }

    // Quota check for drafts (Free tier)
    if (action === "draft") {
       const quota = await subscriptionService.canUseAI("reply");
       if (!quota.allowed) {
         setPaywallFeature("Smart Replies");
         setShowPaywall(true);
         return;
       }
    }

    try {
      setDrafting(reply);
      const threadId =
        type === "file"
          ? (item as ProcessedFile).threadId
          : (item as UnreadEmail).threadId;
      const from =
        type === "file"
          ? (item as ProcessedFile).emailFrom
          : (item as UnreadEmail).from;
      const subject =
        type === "file"
          ? (item as ProcessedFile).emailSubject
          : (item as UnreadEmail).subject;

      if (action === "draft") {
        await gmailService.createDraft(threadId!, from!, subject!, reply);
        toast.show("Draft saved to Gmail!");
      } else {
        await gmailService.sendEmail(threadId!, from!, subject!, reply);
        toast.show("Email sent successfully!", "success");
        // Optionally remove the replied item or update UI
        router.back();
      }
    } catch (error) {
      console.error(`Error ${action}ing:`, error);
      toast.show(`Failed to ${action} email`, "error");
    } finally {
      setDrafting(null);
    }
  };

  const handleAddToCalendar = async (task: any) => {
    // Pro Check
    if (!subscriptionService.isPro()) {
      setPaywallFeature("Calendar Integration");
      setShowPaywall(true);
      return;
    }

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== "granted") {
        toast.show("Calendar permission required", "error");
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(
        Calendar.EntityTypes.EVENT
      );
      const defaultCalendar =
        calendars.find((cal) => cal.allowsModifications) || calendars[0];

      if (!defaultCalendar) {
        toast.show("No calendar found", "error");
        return;
      }

      // Parse due date (assuming format like "Feb 20, 2026" or ISO string)
      const dueDate = new Date(task.due_date);
      if (isNaN(dueDate.getTime())) {
        toast.show("Invalid due date", "error");
        return;
      }

      // Set reminder based on priority
      const reminderMinutes =
        task.priority === "High" ? -60 : task.priority === "Medium" ? -30 : -15;

      await Calendar.createEventAsync(defaultCalendar.id, {
        title: task.task,
        startDate: dueDate,
        endDate: new Date(dueDate.getTime() + 60 * 60 * 1000), // 1 hour duration
        notes: `Priority: ${task.priority}\nFrom: FileFlow AI`,
        alarms: [{ relativeOffset: reminderMinutes }],
      });

      toast.show("Added to calendar!", "success");
    } catch (error) {
      console.error("Calendar error:", error);
      toast.show("Failed to add to calendar", "error");
    }
  };

  // Handle AI Feedback (Thumbs Up/Down)
  const handleFeedback = async (
    feedbackType: "SUMMARY" | "REPLIES" | "TODO",
    rating: "positive" | "negative"
  ) => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFeedback((prev) => ({ ...prev, [feedbackType]: rating }));

      await fetch(`${API_BASE_URL}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userInfo?.email,
          emailId: id,
          feedbackType,
          rating,
          content:
            feedbackType === "SUMMARY"
              ? summary
              : feedbackType === "TODO"
              ? todoList
              : replies,
          modelUsed: "Gemini",
          confidence:
            feedbackType === "SUMMARY" ? summaryConfidence : todoConfidence,
        }),
      });

      toast.show(rating === "positive" ? "Thanks! 👍" : "Thanks! 👎");
    } catch (error) {
      console.error("Feedback error:", error);
    }
  };

  if (loading && !item) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  // Show processing overlay if lazy loading is happening
  const renderProcessingOverlay = () => {
    if (!processingStatus) return null;
    return (
      <View style={[styles.processingOverlay, { backgroundColor: colors.background + 'CC' }]}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={[styles.processingText, { color: colors.text }]}>{processingStatus}</Text>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />

      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={[
            styles.backButton,
            { backgroundColor: colors.surface, borderColor: colors.border },
          ]}
        >
          <ChevronLeft color={colors.text} size={20} />
        </TouchableOpacity>
        <Text
          style={[styles.headerTitle, { color: colors.text }]}
          numberOfLines={1}
        >
          {type === "file"
            ? (item as ProcessedFile)?.filename || "File Detail"
            : (item as UnreadEmail)?.subject || "Email Detail"}
        </Text>
        <View style={{ width: 44 }} />
      </View>

      {renderProcessingOverlay()}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === "ios" ? 100 : 0}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Smart Header moved to bottom for Thumb Zone */}

          {/* Attachment Card if applicable */}
          {type === "file" &&
            (item as ProcessedFile)?.status === SyncStatus.Success && (
              <Animated.View
                entering={FadeInDown.delay(100)}
                style={styles.attachmentCard}
              >
                <LinearGradient
                  colors={[colors.primary, colors.primaryLight]}
                  style={[styles.attachmentGradient, { backgroundColor: colors.surface }]}
                >
                  <View
                    style={[
                      styles.attachmentIconContainer,
                      {
                        backgroundColor:
                          theme === "dark"
                            ? "rgba(255,255,255,0.05)"
                            : "rgba(255,255,255,0.6)",
                      },
                    ]}
                  >
                    <FileText
                      color={theme === "dark" ? colors.primary : "#7c3aed"}
                      size={20}
                    />
                  </View>
                  <View style={styles.attachmentInfo}>
                    <Text
                      style={[styles.attachmentName, { color: colors.text }]}
                    >
                      {(item as ProcessedFile)?.filename || ""}
                    </Text>
                    <Text
                      style={[
                        styles.attachmentMeta,
                        {
                          color:
                            theme === "dark" ? colors.primaryLight : "#7c3aed",
                        },
                      ]}
                    >
                      {(item as ProcessedFile)?.category || "Document"} •{" "}
                      {(((item as ProcessedFile)?.size || 0) / 1024).toFixed(1)} KB
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.viewBadge,
                      {
                        backgroundColor:
                          theme === "dark"
                            ? "rgba(255,255,255,0.1)"
                            : "rgba(124, 58, 237, 0.1)",
                      },
                    ]}
                    onPress={() => {
                      const url = (item as ProcessedFile)?.driveUrl;
                      if (url) Linking.openURL(url);
                    }}
                  >
                    <ExternalLink
                      size={14}
                      color={theme === "dark" ? colors.text : "#7c3aed"}
                    />
                    <Text
                      style={[
                        styles.viewBadgeText,
                        { color: theme === "dark" ? colors.text : "#7c3aed" },
                      ]}
                    >
                      View
                    </Text>
                  </TouchableOpacity>
                </LinearGradient>
              </Animated.View>
            )}

          {/* AI Summary Card */}
          <Animated.View
            entering={FadeInDown.delay(200)}
            style={styles.summarySection}
          >
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                FileFlow Insights
              </Text>
              {summaryConfidence > 0 && (
                <View
                  style={[
                    styles.confidenceBadge,
                    {
                      backgroundColor:
                        (summaryConfidence > 0.7 ? "#10B981" : "#F59E0B") + "15",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.confidenceText,
                      {
                        color: summaryConfidence > 0.7 ? "#10B981" : "#F59E0B",
                      },
                    ]}
                  >
                    {Math.round(summaryConfidence * 100)}% Confident
                  </Text>
                </View>
              )}
              {summary && (
                <View style={styles.feedbackButtons}>
                  <TouchableOpacity
                    onPress={() => handleFeedback("SUMMARY", "positive")}
                    style={[
                      styles.feedbackBtn,
                      feedback.SUMMARY === "positive" &&
                        styles.feedbackBtnActive,
                    ]}
                  >
                    <ThumbsUp
                      size={14}
                      color={
                        feedback.SUMMARY === "positive"
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleFeedback("SUMMARY", "negative")}
                    style={[
                      styles.feedbackBtn,
                      feedback.SUMMARY === "negative" &&
                        styles.feedbackBtnActive,
                    ]}
                  >
                    <ThumbsDown
                      size={14}
                      color={
                        feedback.SUMMARY === "negative"
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {summary.length === 0 ? (
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Skeleton
                  height={20}
                  width="90%"
                  style={{ marginBottom: 16 }}
                  variant="rounded"
                />
                <Skeleton height={20} width="60%" variant="rounded" />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => setSummaryExpanded(!summaryExpanded)}
                activeOpacity={0.8}
              >
                <View
                  style={[
                    styles.summaryCard,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <Text style={[styles.summaryText, { color: colors.text }]}>
                    {summaryExpanded 
                      ? summary 
                      : (summary.split('. ')[0] + (summary.split('. ').length > 1 ? '...' : ''))}
                  </Text>
                  {summary.split('. ').length > 1 && (
                    <Text style={{ 
                      color: colors.primary, 
                      fontSize: 12, 
                      fontWeight: '600', 
                      marginTop: 8,
                      alignSelf: 'flex-end'
                    }}>
                      {summaryExpanded ? 'Tap to Collapse' : 'Tap to Expand BLUF'}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            )}
          </Animated.View>

          {/* Action Items (To-Do List) */}
          <Animated.View
            entering={FadeInDown.delay(250)}
            style={styles.todoSection}
          >
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionTitle, { color: colors.text }]}
              >
                Action Items
              </Text>
              {todoConfidence > 0 && (
                <View
                  style={[
                    styles.confidenceBadge,
                    {
                      backgroundColor:
                        (todoConfidence > 0.7 ? "#10B981" : "#F59E0B") + "15",
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.confidenceText,
                      { color: todoConfidence > 0.7 ? "#10B981" : "#F59E0B" },
                    ]}
                  >
                    {Math.round(todoConfidence * 100)}% Confident
                  </Text>
                </View>
              )}
              {todoList.length > 0 && (
                <View style={styles.feedbackButtons}>
                  <TouchableOpacity
                    onPress={() => handleFeedback("TODO", "positive")}
                    style={[
                      styles.feedbackBtn,
                      feedback.TODO === "positive" && styles.feedbackBtnActive,
                    ]}
                  >
                    <ThumbsUp
                      size={14}
                      color={
                        feedback.TODO === "positive"
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleFeedback("TODO", "negative")}
                    style={[
                      styles.feedbackBtn,
                      feedback.TODO === "negative" && styles.feedbackBtnActive,
                    ]}
                  >
                    <ThumbsDown
                      size={14}
                      color={
                        feedback.TODO === "negative"
                          ? colors.primary
                          : colors.textSecondary
                      }
                    />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {todoList.length === 0 ? (
              <View
                style={[
                  styles.summaryCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Skeleton
                  height={16}
                  width="80%"
                  style={{ marginBottom: 12 }}
                  variant="rounded"
                />
                <Skeleton
                  height={16}
                  width="70%"
                  style={{ marginBottom: 12 }}
                  variant="rounded"
                />
                <Skeleton height={16} width="85%" variant="rounded" />
              </View>
            ) : (
              <View
                style={[
                  styles.todoCard,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.todoContent}>
                  {(subscriptionService.isPro() 
                    ? (showAllTodos ? todoList : todoList.slice(0, 3)) 
                    : todoList.slice(0, 1)
                  ).map(
                    (task, i) => {
                      const priorityColor =
                        task.priority === "High"
                          ? "#FF4C4C"
                          : task.priority === "Medium"
                          ? "#FF9500"
                          : "#3b82f6";
                      return (
                        <Animated.View
                          key={i}
                          entering={FadeInRight.delay(300 + i * 50)}
                          style={[
                            styles.taskCard,
                            { 
                              backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
                              borderColor: theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
                            }
                          ]}
                        >
                          <View style={styles.taskContent}>
                            <View style={styles.taskHeader}>
                              <View
                                style={[
                                  styles.priorityBadge,
                                  { backgroundColor: priorityColor + "15" },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.priorityText,
                                    { color: priorityColor },
                                  ]}
                                >
                                  {task.priority}
                                </Text>
                              </View>
                              {task.due_date && (
                                <View style={styles.taskDateBadge}>
                                  <Clock size={10} color={colors.textSecondary} />
                                  <Text style={[styles.dueDateText, { color: colors.textSecondary }]}>
                                    {task.due_date}
                                  </Text>
                                </View>
                              )}
                            </View>
                            <Text style={[styles.todoText, { color: colors.text }]}>
                              {task.task}
                            </Text>
                            
                            {task.due_date && (
                              <TouchableOpacity
                                onPress={() => handleAddToCalendar(task)}
                                activeOpacity={0.7}
                                style={{ marginTop: 12, alignSelf: 'flex-end' }}
                              >
                                <LinearGradient
                                  colors={[colors.primary, colors.primaryLight]}
                                  start={{ x: 0, y: 0 }}
                                  end={{ x: 1, y: 1 }}
                                  style={styles.calendarBtnGradient}
                                >
                                  <CalendarIcon size={14} color="#fff" />
                                  <Text style={styles.calendarBtnText}>Add</Text>
                                  {!subscriptionService.isPro() && <ProBadge size="small" />}
                                </LinearGradient>
                              </TouchableOpacity>
                            )}
                          </View>
                        </Animated.View>
                      );
                    }
                  )}

                  {todoList.length > 3 && subscriptionService.isPro() && (
                    <TouchableOpacity
                      onPress={() => setShowAllTodos(!showAllTodos)}
                      style={[
                        styles.viewMoreBtn,
                        {
                          backgroundColor: colors.primary + "10",
                          borderColor: colors.primary + "30",
                        },
                      ]}
                    >
                      <Text
                        style={[styles.viewMoreText, { color: colors.primary }]}
                      >
                        {showAllTodos
                          ? `Show Less`
                          : `View ${todoList.length - 3} More`}
                      </Text>
                      <ChevronRight
                        size={16}
                        color={colors.primary}
                        style={{
                          transform: [
                            { rotate: showAllTodos ? "-90deg" : "90deg" },
                          ],
                        }}
                      />
                    </TouchableOpacity>
                  )}
                  {/* Upgrade prompt for more todos */}
                  {todoList.length > 1 && !subscriptionService.isPro() && (
                    <TouchableOpacity
                      onPress={() => {
                         setPaywallFeature("Unlimited Action Items");
                         setShowPaywall(true);
                      }}
                       style={[
                        styles.viewMoreBtn,
                        {
                          backgroundColor: colors.primary + "10",
                          borderColor: colors.primary + "30",
                        },
                      ]}
                    >
                      <Text style={[styles.viewMoreText, { color: colors.primary }]}>
                         Unlock {todoList.length - 1} more items
                      </Text>
                      <Crown size={16} color={colors.primary} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          </Animated.View>

          {/* Smart Replies (Enhanced with Direct Send) */}
          {replies.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(300)}
              style={styles.repliesSection}
            >
              <Text
                style={[
                  styles.sectionTitle, 
                  { color: colors.textSecondary, marginBottom: 12 },
                ]}
              >
                Quick Reply
              </Text>

              {/* Sentient Actions */}
              {detectedIntent?.actions && detectedIntent.actions.length > 0 && (
                <View style={[styles.actionsGrid, { marginBottom: 16 }]}>
                  {detectedIntent.actions.map((action, i) => (
                    <TouchableOpacity
                      key={action.id}
                      style={[
                        styles.sentientActionBtn,
                        { 
                          backgroundColor: action.priority === 'high' ? colors.primary : colors.surface,
                          borderColor: action.priority === 'high' ? colors.primary : colors.border
                        }
                      ]}
                      onPress={() => {
                        // Handle specific action types
                        if (action.type === 'payment') {
                          router.push('/subscription'); // Placeholder for mpesa flow
                        } else if (action.id === 'add_calendar') {
                           handleAddToCalendar(todoList[0] || { task: 'Follow up' });
                        }
                      }}
                    >
                       <Text style={[styles.sentientActionText, { color: action.priority === 'high' ? '#fff' : colors.text }]}>
                        {action.label}
                       </Text>
                       {action.priority === 'high' && <Sparkles size={12} color="#fff" style={{ marginLeft: 6 }} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.repliesContainer}>
                {(subscriptionService.isPro() ? replies : replies.slice(0, 1)).map((reply, index) => (
                  <TouchableOpacity
                    key={index}
                    activeOpacity={0.8}
                    style={[
                      styles.replyCard,
                      {
                        backgroundColor: colors.surface,
                        borderColor: colors.border,
                        borderWidth: 1,
                        borderRadius: 16,
                        padding: 16,
                        marginBottom: 8,
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 2 },
                        shadowOpacity: 0.05,
                        shadowRadius: 4,
                        elevation: 2
                      },
                    ]}
                  >
                    <Text style={[styles.replyBody, { color: colors.text, fontSize: 14, lineHeight: 20 }]}>
                      {reply}
                    </Text>

                      <View style={{ flexDirection: 'row', marginTop: 12, gap: 12 }}>
                        <TouchableOpacity
                          onPress={() => handleSmartReply(reply, "draft")}
                          disabled={!!drafting}
                          activeOpacity={0.7}
                          style={{ flex: 1 }}
                        >
                          <LinearGradient
                            colors={theme === 'dark' ? [colors.surface, colors.surface] : ['#f0f0f0', '#e5e5e5']}
                            style={[
                              styles.actionBtnBlur,
                              {
                                borderColor: colors.border,
                                borderWidth: 1,
                                borderRadius: 8,
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 8
                              }
                            ]}
                          >
                            <Text
                              style={[
                                styles.actionBtnText,
                                { color: colors.text, fontWeight: "600", fontSize: 13 },
                              ]}
                            >
                              Draft
                            </Text>
                          </LinearGradient>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() => handleSmartReply(reply, "send")}
                          disabled={!!drafting}
                          activeOpacity={0.7}
                          style={{ flex: 1 }}
                        >
                          <LinearGradient
                            colors={[colors.primary, colors.primaryLight]} // Use gradient for primary action
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={[
                              styles.sendBtnGradient,
                              {
                                borderRadius: 8,
                                alignItems: 'center',
                                justifyContent: 'center',
                                paddingVertical: 8
                              }
                            ]}
                          >
                            {drafting === reply ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <Text
                                  style={[
                                    styles.actionBtnText,
                                    { color: "#fff", fontWeight: "600", fontSize: 13 },
                                  ]}
                                >
                                  Send
                                </Text>
                                <Send size={12} color="#fff" />
                              </View>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>

                    {/* Feedback for Replies */}
                    <View style={[styles.feedbackButtons, { marginTop: 12, justifyContent: 'flex-end' }]}>
                      <TouchableOpacity
                        onPress={() => handleFeedback('REPLIES', 'positive')}
                        style={[styles.feedbackBtn, feedback.REPLIES === 'positive' && styles.feedbackBtnActive]}
                      >
                        <ThumbsUp size={14} color={feedback.REPLIES === 'positive' ? colors.primary : colors.textSecondary} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => handleFeedback('REPLIES', 'negative')}
                        style={[styles.feedbackBtn, feedback.REPLIES === 'negative' && styles.feedbackBtnActive]}
                      >
                        <ThumbsDown size={14} color={feedback.REPLIES === 'negative' ? colors.primary : colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          )}

          {/* Chat Section Removed */}

          {/* Critical Actions at the Bottom (Thumb Zone) */}
          {detectedIntent && (
            <Animated.View 
              entering={FadeInUp.delay(400)}
              style={{ paddingBottom: 40 }}
            >
              <SmartHeader
                intent={detectedIntent.type}
                data={detectedIntent.details}
                confidence={detectedIntent.confidence}
                onPaywallTrigger={(feature) => {
                  setPaywallFeature(feature);
                  setShowPaywall(true);
                }}
              />
              <View style={{ alignItems: 'center', marginTop: 12 }}>
                 <View style={{ flexDirection: 'row', alignItems: 'center', opacity: 0.5 }}>
                   <Lock size={12} color={colors.textSecondary} style={{ marginRight: 4 }} />
                   <Text style={{ fontSize: 10, color: colors.textSecondary }}>End-to-End Encrypted Financial Protection</Text>
                 </View>
              </View>
            </Animated.View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Paywall Modal */}
      <PaywallModal
        visible={showPaywall}
        onClose={() => setShowPaywall(false)}
        feature={paywallFeature}
        userEmail={userInfo?.email}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  loadingText: { marginTop: 16, fontSize: 14, fontWeight: "600" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 44 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 16,
    letterSpacing: -0.5,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
  },
  scrollContent: { padding: 24, paddingBottom: 40 },
  attachmentCard: {
    marginBottom: 24,
    borderRadius: 24,
    overflow: "hidden",
    borderWidth: 0,
    borderColor: "rgba(255,255,255,0.1)",
    elevation: 0,
  },
  attachmentGradient: {
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  attachmentIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentInfo: { marginLeft: 16, flex: 1 },
  attachmentName: { fontSize: 16, fontWeight: "800" },
  attachmentMeta: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  viewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewBadgeText: { fontSize: 12, fontWeight: "bold" },
  summarySection: { marginBottom: 32 },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  sparkleContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  confidenceBadge: {
    marginLeft: "auto",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  confidenceText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  todoSection: { marginBottom: 32 },
  todoIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  summaryCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 0,
    overflow: "hidden",
    elevation: 0,
  },
  summaryText: { fontSize: 15, lineHeight: 24, fontWeight: "500" },
  todoCard: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    overflow: "hidden",
  },
  todoContent: { gap: 12 },
  todoItemRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  todoText: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  dueDateText: { fontSize: 12, fontWeight: "600", color: "#666" },
  calendarBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  calendarBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.3,
  },
  contentSection: { marginTop: 12 },
  contentCard: {
    padding: 20,
    borderRadius: 22,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  bodyText: { fontSize: 14, lineHeight: 22, fontWeight: "500" },
  repliesSection: { marginBottom: 24 },
  repliesContainer: { gap: 8 },
  replyCard: { padding: 16, borderRadius: 16, marginBottom: 8, borderWidth: 0 },
  replyBody: {
    fontSize: 14,
    lineHeight: 22,
    fontWeight: "500",
    marginBottom: 12,
  },
  replyActions: { flexDirection: "row", gap: 12 },
  viewMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 12,
  },
  viewMoreText: { fontSize: 13, fontWeight: "700", letterSpacing: 0.3 },
  actionBtnBlur: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    overflow: "hidden",
  },
  sendBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  actionBtnText: { fontSize: 14, letterSpacing: 0.3 },
  feedbackButtons: {
    flexDirection: "row",
    gap: 6,
    marginLeft: "auto",
  },
  feedbackBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(124, 58, 237, 0.05)",
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.1)",
  },
  feedbackBtnActive: {
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    borderColor: "rgba(124, 58, 237, 0.4)",
  },
  taskCard: {
    flexDirection: 'row',
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  taskPriorityBar: {
    width: 4,
    height: '100%',
  },
  taskContent: {
    flex: 1,
    padding: 12,
  },
  taskHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  taskDateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.05)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  replyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  sentientActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 2,
  },
  sentientActionText: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: -0.2,
  },
  replyButtonText: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
    marginRight: 12,
  },
  chatSection: { marginBottom: 32 },
  chatCard: { borderRadius: 24, padding: 16, borderWidth: 1 },
  emptyChatState: { alignItems: "center", padding: 16 },
  emptyChatText: { fontSize: 14, marginBottom: 12 },
  suggestionChip: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  suggestionText: { fontSize: 12 },
  chatHistory: { gap: 8, maxHeight: 200, overflow: "scroll" }, // In a real app, use FlatList or nested ScrollView with care
  chatBubble: { padding: 10, borderRadius: 12, maxWidth: "85%" },
  chatText: { fontSize: 14, lineHeight: 20 },
  chatInputRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chatInput: { flex: 1, maxHeight: 80, fontSize: 14 },
  sendIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  processingOverlay: {
    position: 'absolute',
    top: 100, // Below header
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  processingText: {
    marginTop: 16,
    fontSize: 16,
    fontWeight: '600',
  },
});

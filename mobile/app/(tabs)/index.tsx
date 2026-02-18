import backgroundService from "@/services/background";
import gmailService from "@/services/gmail";
import { FileCategory, ProcessedFile, SyncStatus, UnreadEmail } from "@/types";
import { appStorage } from "@/utils/storage";
import {
  CircleCheck,
  AlertCircle,
  Clock,
  FileText,
  Mail,
  RefreshCw,
  Inbox,
  Bot,
  Sparkles,
  AlertTriangle,
  Archive,
} from "lucide-react-native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Skeleton from "@/components/Skeleton";
import { SmartRecapWidget } from "@/components/SmartRecapWidget";
import { useIntelligence } from "@/hooks/useIntelligence";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Platform,
} from "react-native";
import { API_BASE_URL } from "@/utils/constants";
import Animated, { FadeInDown, Layout } from "react-native-reanimated";
import { useTheme } from "@/components/ThemeContext";
import subscriptionService from "@/services/SubscriptionService";
import { useRouter } from "expo-router";
import {
  Swipeable,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import { triggerHaptic } from "@/utils/haptics";
import { LinearGradient } from "expo-linear-gradient";

const Logo = require("@/assets/images/logo.png");

const formatDate = (dateString?: string) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

import { GlassCard } from "@/components/GlassCard";
import ProBadge from "@/components/ProBadge";

const FileCard = ({ file, colors }: { file: ProcessedFile; colors: any }) => {
  const { typography } = useTheme();
  const handlePress = () => {
    router.push({
      pathname: "/email/[id]",
      params: { id: file.id, type: "file" },
    });
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <GlassCard style={styles.card} variant="elevated">
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <View style={styles.cardIconContainer}>
            <View
              style={[
                styles.cardIconBg,
                { backgroundColor: colors.background },
              ]}
            >
              <FileText size={20} color={colors.primary} />
            </View>
          </View>
          <View style={styles.cardContent}>
            <Text
              style={[styles.fileName, typography.title, { color: colors.text }]}
              numberOfLines={1}
            >
              {file.filename || "Untitled Document"}
            </Text>
            <View style={styles.cardMeta}>
              <Text
                style={[styles.metaDetail, { color: colors.textSecondary }]}
              >
                {file.category}
              </Text>
              <Text
                style={[styles.metaDetail, { color: colors.textSecondary }]}
              >
                {(file.size / 1024).toFixed(0)} KB
              </Text>
              <View
                style={[
                  styles.metaDivider,
                  { backgroundColor: colors.textTertiary },
                ]}
              />
              <Text
                style={[styles.metaDetail, { color: colors.textSecondary }]}
              >
                {formatDate(file.emailDate || file.uploadedAt)}
              </Text>
            </View>
          </View>
          <View style={styles.statusIcon}>
            {file.status === SyncStatus.Success && (
              <CircleCheck size={18} color={colors.success} />
            )}
            {file.status === SyncStatus.Error && (
              <AlertCircle size={18} color={colors.error} />
            )}
            {file.status === SyncStatus.Pending && (
              <Clock size={18} color={colors.textTertiary} />
            )}
          </View>
        </View>
      </GlassCard>
    </TouchableOpacity>
  );
};

const EmailItem = ({
  email,
  colors,
  onRead,
  onArchive,
}: {
  email: UnreadEmail;
  colors: any;
  onRead: (id: string) => void;
  onArchive: (id: string) => void;
}) => {
  const handlePress = () => {
    triggerHaptic("selection");
    router.push({
      pathname: "/email/[id]",
      params: { id: email.id, type: "email" },
    });
  };

  const renderRightActions = () => {
    return (
      <TouchableOpacity
        onPress={() => onRead(email.id)}
        style={[
          styles.swipeAction,
          { backgroundColor: colors.success, marginRight: 0, marginLeft: 10 },
        ]}
      >
        <CircleCheck size={24} color="#fff" />
        <Text style={styles.swipeText}>Read</Text>
      </TouchableOpacity>
    );
  };

  const renderLeftActions = () => {
    return (
      <TouchableOpacity
        onPress={() => onArchive(email.id)}
        style={[
          styles.swipeAction,
          { backgroundColor: "#64748b", marginLeft: 0, marginRight: 10 },
        ]}
      >
        <Archive size={24} color="#fff" />
        <Text style={styles.swipeText}>Archive</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      renderRightActions={renderRightActions}
      renderLeftActions={renderLeftActions}
      overshootRight={false}
      overshootLeft={false}
      onSwipeableWillOpen={(direction) => {
        triggerHaptic("medium");
      }}
    >
      <TouchableOpacity onPress={handlePress} activeOpacity={0.8}>
        <GlassCard style={styles.card} variant="elevated">
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.cardIconContainer}>
              <View
                style={[
                  styles.cardIconBg,
                  { backgroundColor: colors.background },
                ]}
              >
                <Mail size={20} color={colors.primary} />
              </View>
            </View>
            <View style={styles.cardContent}>
              <Text
                style={[styles.fileName, { color: colors.text }]}
                numberOfLines={1}
              >
                {email.subject || "(No Subject)"}
              </Text>
              <Text
                style={[styles.emailFrom, { color: colors.textSecondary }]}
                numberOfLines={1}
              >
                {email.from}
              </Text>
              <Text style={[styles.emailDate, { color: colors.textTertiary }]}>
                {formatDate(email.date)}
              </Text>
            </View>
            <View style={styles.statusIcon}>
              <View
                style={[
                  styles.aiBadge,
                  { backgroundColor: colors.primary + "20" },
                ]}
              >
                <Text style={[styles.aiBadgeText, { color: colors.primary }]}>
                  AI Ready
                </Text>
              </View>
            </View>
          </View>
        </GlassCard>
      </TouchableOpacity>
    </Swipeable>
  );
};

export default function DashboardScreen() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [unreadEmails, setUnreadEmails] = useState<UnreadEmail[]>([]);
  const [activeTab, setActiveTab] = useState<"files" | "action">("files");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { theme, preference, setPreference, colors, typography } = useTheme();
  const [isPro, setIsPro] = useState(false);
  const [tier, setTier] = useState<string>("free");
  const [serverBriefing, setServerBriefing] = useState<string>("");

  const filteredFiles = useMemo(() => {
    let result = [...files];
    if (searchQuery) {
      result = result.filter(
        (f) =>
          f.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
          f.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    // Sort by date (newest first)
    return result.sort((a, b) => {
      const dateA = new Date(a.emailDate || a.uploadedAt).getTime();
      const dateB = new Date(b.emailDate || b.uploadedAt).getTime();
      return dateB - dateA;
    });
  }, [files, searchQuery]);

  const loadData = useCallback(async () => {
    try {
      setIsSyncing(true);
      
      // Auto-trigger background sync on app open for all users
      await backgroundService.processEmails();
      
      await subscriptionService.initialize();
      setIsPro(subscriptionService.isPro());
      setTier(subscriptionService.getTier());

      const [storedFiles, syncTime, unread] = await Promise.all([
        appStorage.getProcessedFiles(),
        appStorage.getLastSyncTime(),
        gmailService.fetchRecentUnreadEmails(),
      ]);
      setFiles(storedFiles || []);
      setLastSync(syncTime);

      // Filter emails (exclude noreply) and sort by date
      const filteredUnread = (unread || [])
        .filter(email => {
          const from = (email.from || '').toLowerCase();
          return !from.includes('noreply') && !from.includes('no-reply');
        })
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setUnreadEmails(filteredUnread);

      // Fetch Server Recap
      const userInfo = await appStorage.getUserInfo();
      if (userInfo?.email && (filteredUnread?.length > 0 || storedFiles?.length > 0)) {
        try {
          const response = await fetch(`${API_BASE_URL}/recap`, {
            method: "POST",
            headers: { 
              "Content-Type": "application/json",
              "ngrok-skip-browser-warning": "true"
            },
            body: JSON.stringify({
              userId: userInfo.email,
              items: [...filteredUnread, ...storedFiles].slice(0, 5),
            }),
          });
          const data = await response.json();
          if (data.recap) setServerBriefing(data.recap);
        } catch (e) {
          console.warn("Failed to fetch server recap", e);
        }
      }
    } catch (error) {
      console.error("Dashboard data load failed:", error);
    } finally {
      setLoading(false);
      setIsSyncing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const stats = useMemo(() => {
    const total = files.length;
    const success = files.filter((f) => f.status === SyncStatus.Success).length;
    return { total, success };
  }, [files]);

  const intelligence = useIntelligence(files, unreadEmails, serverBriefing);

  const handleManualSync = async () => {
    if (isSyncing) return;
    try {
      setIsSyncing(true);
      await backgroundService.processEmails();
      await loadData();
    } catch (error) {
      Alert.alert("Sync Failed", "An error occurred.");
    } finally {
      setIsSyncing(false);
    }
  };

  if (loading) {
    return (
      <View
        style={[
          styles.container,
          { paddingTop: 48, backgroundColor: colors.background },
        ]}
      >
        <StatusBar
          barStyle={theme === "dark" ? "light-content" : "dark-content"}
        />
        <View style={styles.headerContent}>
          <Skeleton width={120} height={32} variant="rounded" />
          <Skeleton width={44} height={44} variant="rounded" />
        </View>
        <View style={styles.listContent}>
          <View style={styles.searchContainer}>
            <Skeleton height={52} variant="rounded" />
          </View>
          <View style={styles.statsContainer}>
            <Skeleton height={110} variant="rounded" style={{ flex: 1 }} />
            <Skeleton height={110} variant="rounded" style={{ flex: 1 }} />
          </View>
          <View style={{ gap: 12 }}>
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={70} variant="rounded" />
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={theme === "dark" ? "light-content" : "dark-content"}
          key={theme}
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
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <Image
                source={Logo}
                style={{ width: 40, height: 40, borderRadius: 12 }}
              />
              <View>
                {lastSync ? (
                  <Text
                    style={[styles.syncText, { color: colors.textSecondary }]}
                  >
                    Synced{" "}
                    {new Date(lastSync).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                ) : (
                  <Text
                    style={[styles.syncText, { color: colors.textSecondary }]}
                  >
                    Never synced
                  </Text>
                )}
              </View>
            </View>

            <View
              style={{ flexDirection: "row", gap: 8, alignItems: "center" }}
            >
              {tier === "pro" ? (
                <View style={{ marginRight: 8 }}>
                  <ProBadge size="small" />
                </View>
              ) : (
                <TouchableOpacity
                  onPress={() => router.push("/subscription")}
                  style={{ marginRight: 8 }}
                >
                  <ProBadge size="small" />
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={handleManualSync}
                disabled={isSyncing}
                style={[
                  styles.syncButton,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                  isSyncing && styles.syncButtonDisabled,
                ]}
              >
                {isSyncing ? (
                  <ActivityIndicator size="small" />
                ) : (
                  <RefreshCw size={18} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              onPress={() => setActiveTab("files")}
              style={[
                styles.tab,
                activeTab === "files" && { borderBottomColor: colors.primary },
              ]}
            >
              <Text
                style={[
                  styles.tabText,
                  { color: colors.textSecondary },
                  activeTab === "files" && { color: colors.primary },
                ]}
              >
                Files
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setActiveTab("action")}
              style={[
                styles.tab,
                activeTab === "action" && { borderBottomColor: colors.primary },
              ]}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text
                  style={[
                    styles.tabText,
                    { color: colors.textSecondary },
                    activeTab === "action" && { color: colors.primary },
                  ]}
                >
                  Action Required
                </Text>
                {unreadEmails.length > 0 && (
                  <View
                    style={[
                      styles.unreadBadge,
                      { backgroundColor: colors.primary },
                    ]}
                  >
                    <Text style={styles.unreadBadgeText}>
                      {unreadEmails.length}
                    </Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          data={
            activeTab === "files"
              ? (filteredFiles as any[])
              : (unreadEmails as any[])
          }
          keyExtractor={(item) => (item as any).id}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(index * 50)}
              layout={Layout.springify()}
            >
              {activeTab === "files" ? (
                <FileCard file={item as ProcessedFile} colors={colors} />
              ) : (
                <EmailItem
                  email={item as UnreadEmail}
                  colors={colors}
                  onRead={async (id) => {
                    try {
                      await gmailService.markAsRead(id);
                      triggerHaptic("success");
                      setUnreadEmails((prev) =>
                        prev.filter((e) => e.id !== id)
                      );
                    } catch (e) {
                      triggerHaptic("error");
                    }
                  }}
                  onArchive={async (id) => {
                    try {
                      // Assuming gmailService has an archive method or similar
                      await gmailService.markAsRead(id); // Placeholder for archive logic
                      triggerHaptic("success");
                      setUnreadEmails((prev) =>
                        prev.filter((e) => e.id !== id)
                      );
                    } catch (e) {
                      triggerHaptic("error");
                    }
                  }}
                />
              )}
            </Animated.View>
          )}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <View>
              <SmartRecapWidget
                recap={intelligence.recap}
                urgentCount={intelligence.urgentCount}
              />

              <View
                style={[
                  styles.searchContainer,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search files..."
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholderTextColor={colors.textTertiary}
                  underlineColorAndroid="transparent"
                />
              </View>
            </View>
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View
                style={[
                  styles.emptyIconContainer,
                  { backgroundColor: colors.surface },
                ]}
              >
                <Inbox size={48} color={colors.textTertiary} />
              </View>
              <Text style={[typography.headline, styles.emptyTitle, { color: colors.text }]}>
                {activeTab === "files" ? "No Files Yet" : "All Caught Up!"}
              </Text>
              <Text
                style={[
                  styles.emptyDescription,
                  { color: colors.textSecondary },
                ]}
              >
                {activeTab === "files"
                  ? "Your processed files will appear here. Tap the sync button to scan your emails for attachments, or check your sync settings to enable automatic background processing."
                  : "You have no emails requiring action at the moment. New unread emails will appear here when they arrive."}
              </Text>
              {activeTab === "files" && (
                <TouchableOpacity
                  onPress={handleManualSync}
                  disabled={isSyncing}
                  style={{ alignSelf: 'center' }}
                >
                  <LinearGradient
                    colors={[colors.primaryDark, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.emptyActionButton,
                      {
                        shadowColor: colors.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.3,
                        shadowRadius: 8,
                        elevation: 5
                      }
                    ]}
                  >
                    {isSyncing ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <>
                        <RefreshCw size={18} color="#fff" />
                        <Text style={styles.emptyActionText}>Sync Now</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      </View>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 40, borderBottomWidth: 1 },
  headerContent: {
    paddingHorizontal: 24,
    paddingBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  syncText: { fontSize: 12, fontWeight: "500", opacity: 0.8 },
  syncButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  syncButtonDisabled: { opacity: 0.5 },
  tabContainer: { flexDirection: "row", paddingHorizontal: 24, gap: 20 },
  tab: {
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: { fontSize: 14, fontWeight: "600" },
  unreadBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  unreadBadgeText: { color: "#fff", fontSize: 10, fontWeight: "700" },
  listContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 120,
  },
  statsContainer: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  statIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
    borderWidth: 1,
  },
  statValue: { fontSize: 24, fontWeight: "700" },
  statLabel: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  searchContainer: {
    marginBottom: 24,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 16,
    height: 52,
    justifyContent: "center",
  },
  searchInput: {
    fontSize: 15,
    fontWeight: "500",
    ...Platform.select({ web: { outlineStyle: "none" } as any }),
  },
  card: { borderRadius: 16, marginBottom: 12 },
  cardIconContainer: { marginRight: 12 },
  cardIconBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  cardContent: { flex: 1 },
  fileName: { fontSize: 15, fontWeight: "600" },
  cardMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  metaDetail: { fontSize: 13 },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 8,
    opacity: 0.3,
  },
  emailFrom: { fontSize: 13 },
  emailDate: { fontSize: 11, marginTop: 4, fontWeight: "500" },
  aiBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  aiBadgeText: { fontSize: 10, fontWeight: "700" },
  statusIcon: { paddingLeft: 8 },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  emptyActionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyActionText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  swipeAction: {
    width: 80,
    height: "100%",
    borderRadius: 16,
    marginBottom: 12,
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  swipeText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
    marginTop: 2,
  },
});

// Note: PaywallModal should be added to the JSX before the closing </View> tag in the return statement

import backgroundService from "@/services/background";
import gmailService from "@/services/gmail";
import { FileCategory, ProcessedFile, SyncStatus, UnreadEmail } from "@/types";
import { appStorage } from "@/utils/storage";
import {
  Moon, Sun, Monitor, CircleCheck, AlertCircle, Clock, FileText, Mail, RefreshCw,
} from "lucide-react-native";
import { router } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import Skeleton from "@/components/Skeleton";
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
import Animated, {
  FadeInDown,
  Layout,
} from "react-native-reanimated";
import { useTheme } from "@/components/ThemeContext";

const Logo = require("@/assets/images/logo.png");
 
const formatDate = (dateString?: string) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
};

const FileCard = ({ file, colors }: { file: ProcessedFile, colors: any }) => {
  const handlePress = () => {
    router.push({
      pathname: "/email/[id]",
      params: { id: file.id, type: 'file' }
    });
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
      disabled={file.status === SyncStatus.Pending}
    >
      <View style={styles.cardIconContainer}>
        <View style={[styles.cardIconBg, { backgroundColor: colors.background }]}>
          <FileText size={20} color={colors.primary} />
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
          {file.filename || "Untitled Document"}
        </Text>
        <View style={styles.cardMeta}>
          <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
            {file.category}
          </Text>
          <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
            {(file.size / 1024).toFixed(0)} KB
          </Text>
          <View style={[styles.metaDivider, { backgroundColor: colors.textTertiary }]} />
          <Text style={[styles.metaDetail, { color: colors.textSecondary }]}>
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
    </TouchableOpacity>
  );
};

const EmailItem = ({ email, colors }: { email: UnreadEmail, colors: any }) => {
  const handlePress = () => {
    router.push({
      pathname: "/email/[id]",
      params: { id: email.id, type: 'email' }
    });
  };

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={styles.cardIconContainer}>
        <View style={[styles.cardIconBg, { backgroundColor: colors.background }]}>
          <Mail size={20} color={colors.primary} />
        </View>
      </View>
      <View style={styles.cardContent}>
        <Text style={[styles.fileName, { color: colors.text }]} numberOfLines={1}>
          {email.subject || "(No Subject)"}
        </Text>
        <Text style={[styles.emailFrom, { color: colors.textSecondary }]} numberOfLines={1}>
          {email.from}
        </Text>
        <Text style={[styles.emailDate, { color: colors.textTertiary }]}>
          {formatDate(email.date)}
        </Text>
      </View>
      <View style={styles.statusIcon}>
        <View style={[styles.aiBadge, { backgroundColor: colors.primary + '20' }]}>
          <Text style={[styles.aiBadgeText, { color: colors.primary }]}>AI Ready</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function DashboardScreen() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [unreadEmails, setUnreadEmails] = useState<UnreadEmail[]>([]);
  const [activeTab, setActiveTab] = useState<'files' | 'action'>('files');
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const { theme, preference, setPreference, colors } = useTheme();

  const toggleTheme = () => {
    const nextPref = theme === 'dark' ? 'light' : 'dark';
    console.log(`[Dashboard] Toggling theme. Current theme: ${theme}, Next preference: ${nextPref}`);
    setPreference(nextPref);
  };

  const filteredFiles = useMemo(() => {
    if (!searchQuery) return files;
    return files.filter(f => 
      f.filename.toLowerCase().includes(searchQuery.toLowerCase()) ||
      f.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [files, searchQuery]);

  const loadData = useCallback(async () => {
    try {
      const [storedFiles, syncTime, unread] = await Promise.all([
        appStorage.getProcessedFiles(),
        appStorage.getLastSync(),
        gmailService.fetchRecentUnreadEmails()
      ]);
      setFiles(storedFiles);
      setLastSync(syncTime);
      setUnreadEmails(unread);
    } catch (error) {
      console.error("Error loading dashboard data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const stats = useMemo(() => {
    const total = files.length;
    const success = files.filter((f) => f.status === SyncStatus.Success).length;
    return { total, success };
  }, [files]);

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
      <View style={[styles.container, { paddingTop: 48, backgroundColor: colors.background }]}>
        <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
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
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} height={70} variant="rounded" />
            ))}
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} key={theme} />

      <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerContent}>
          <View style={styles.headerLeft}>
            <Image source={Logo} style={{ width: 40, height: 40, borderRadius: 12 }} />
            <View>
              {lastSync ? (
                <Text style={[styles.syncText, { color: colors.textSecondary }]}>
                  Synced {new Date(lastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </Text>
              ) : (
                <Text style={[styles.syncText, { color: colors.textSecondary }]}>Never synced</Text>
              )}
            </View>
          </View>
          
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ backgroundColor: colors.surface, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 4 }}>
               <Text style={{ fontSize: 8, color: colors.textSecondary, fontWeight: 'bold' }}>{theme.toUpperCase()}</Text>
            </View>
            <TouchableOpacity onPress={toggleTheme} style={[styles.syncButton, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              {theme === 'dark' ? <Sun size={18} color={colors.primary} /> : <Moon size={18} color={colors.primary} />}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleManualSync}
              disabled={isSyncing}
              style={[styles.syncButton, { backgroundColor: colors.surface, borderColor: colors.border }, isSyncing && styles.syncButtonDisabled]}
            >
              {isSyncing ? <ActivityIndicator size="small" /> : <RefreshCw size={18} color={colors.textSecondary} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.tabContainer}>
          <TouchableOpacity 
            onPress={() => setActiveTab('files')}
            style={[styles.tab, activeTab === 'files' && { borderBottomColor: colors.primary }]}
          >
            <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'files' && { color: colors.primary }]}>Files</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            onPress={() => setActiveTab('action')}
            style={[styles.tab, activeTab === 'action' && { borderBottomColor: colors.primary }]}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={[styles.tabText, { color: colors.textSecondary }, activeTab === 'action' && { color: colors.primary }]}>Action Required</Text>
              {unreadEmails.length > 0 && (
                <View style={[styles.unreadBadge, { backgroundColor: colors.primary }]}>
                  <Text style={styles.unreadBadgeText}>{unreadEmails.length}</Text>
                </View>
              )}
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={activeTab === 'files' ? (filteredFiles as any[]) : (unreadEmails as any[])}
        keyExtractor={(item) => (item as any).id}
        renderItem={({ item, index }) => (
          <Animated.View entering={FadeInDown.delay(index * 50)} layout={Layout.springify()}>
            {activeTab === 'files' ? <FileCard file={item as ProcessedFile} colors={colors} /> : <EmailItem email={item as UnreadEmail} colors={colors} />}
          </Animated.View>
        )}
        contentContainerStyle={styles.listContent}
        ListHeaderComponent={
          <View>
            <View style={[styles.searchContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search files..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholderTextColor={colors.textTertiary}
                underlineColorAndroid="transparent"
              />
            </View>
            <View style={styles.statsContainer}>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.background, borderColor: colors.border }]}><FileText size={16} color={colors.primary} /></View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Processed</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.background, borderColor: colors.border }]}><CircleCheck size={16} color={colors.success} /></View>
                <Text style={[styles.statValue, { color: colors.text }]}>{stats.success}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Organized</Text>
              </View>
            </View>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { paddingTop: 48, borderBottomWidth: 1 },
  headerContent: { paddingHorizontal: 24, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  syncText: { fontSize: 12, fontWeight: "500", opacity: 0.8 },
  syncButton: { width: 44, height: 44, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  syncButtonDisabled: { opacity: 0.5 },
  tabContainer: { flexDirection: 'row', paddingHorizontal: 24, gap: 20 },
  tab: { paddingVertical: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabText: { fontSize: 14, fontWeight: '600' },
  unreadBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, marginLeft: 6 },
  unreadBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  listContent: { padding: 24, paddingBottom: 100 },
  statsContainer: { flexDirection: "row", gap: 12, marginBottom: 24 },
  statCard: { flex: 1, padding: 16, borderRadius: 16, borderWidth: 1 },
  statIconContainer: { width: 32, height: 32, borderRadius: 8, alignItems: "center", justifyContent: "center", marginBottom: 12, borderWidth: 1 },
  statValue: { fontSize: 24, fontWeight: "700" },
  statLabel: { fontSize: 12, fontWeight: "500", marginTop: 2 },
  searchContainer: { marginBottom: 24, borderRadius: 16, borderWidth: 1, paddingHorizontal: 16, height: 52, justifyContent: "center" },
  searchInput: { fontSize: 15, fontWeight: "500", ...Platform.select({ web: { outlineStyle: "none" } as any }) },
  card: { borderRadius: 16, padding: 12, marginBottom: 12, flexDirection: "row", alignItems: "center", borderWidth: 1 },
  cardIconContainer: { marginRight: 12 },
  cardIconBg: { width: 40, height: 40, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cardContent: { flex: 1 },
  fileName: { fontSize: 15, fontWeight: "600" },
  cardMeta: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  metaDetail: { fontSize: 13 },
  metaDivider: { width: 3, height: 3, borderRadius: 1.5, marginHorizontal: 8, opacity: 0.3 },
  emailFrom: { fontSize: 13 },
  emailDate: { fontSize: 11, marginTop: 4, fontWeight: '500' },
  aiBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  aiBadgeText: { fontSize: 10, fontWeight: '700' },
  statusIcon: { paddingLeft: 8 },
});

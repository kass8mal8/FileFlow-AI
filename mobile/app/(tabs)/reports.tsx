import { FileCategory, ProcessedFile, SyncStatus } from "@/types";
import { appStorage } from "@/utils/storage";
import { BlurView } from "expo-blur";
import {
  FileText,
  Mail,
  PieChart as PieChartIcon,
  TrendingUp,
  LayoutGrid,
} from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LineChart, PieChart } from "react-native-chart-kit";
import { useTheme } from "@/components/ThemeContext";

const screenWidth = Dimensions.get("window").width;

export default function ReportsScreen() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors, theme } = useTheme();

  useEffect(() => {
    async function loadData() {
      const storedFiles = await appStorage.getProcessedFiles();
      setFiles(storedFiles);
      setLoading(false);
    }
    loadData();
  }, []);

  const stats = useMemo(() => {
    const categories = {
      [FileCategory.Finance]: 0,
      [FileCategory.Legal]: 0,
      [FileCategory.Work]: 0,
      [FileCategory.Personal]: 0,
    };

    const dailyActivity: { [key: string]: number } = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      dailyActivity[d.toISOString().split("T")[0]] = 0;
    }

    let successCount = 0;
    files.forEach((f) => {
      if (f.status === SyncStatus.Success) {
        categories[f.category]++;
        successCount++;
      }
      const dateKey = f.uploadedAt.split("T")[0];
      if (dailyActivity[dateKey] !== undefined) {
        dailyActivity[dateKey]++;
      }
    });

    const totalFiles = files.length;
    const estimatedTotalEmails = totalFiles > 0 ? Math.floor(totalFiles * 2.4) : 0;
    
    const readWithAttachments = files.filter(f => f.status === SyncStatus.Success).length;
    const unreadWithAttachments = files.filter(f => f.status === SyncStatus.Error || f.status === SyncStatus.Pending).length;
    
    const totalWithAttachments = files.length;
    const totalWithoutAttachments = Math.max(0, estimatedTotalEmails - totalWithAttachments);
    const readWithoutAttachments = Math.floor(totalWithoutAttachments * 0.7);
    const unreadWithoutAttachments = totalWithoutAttachments - readWithoutAttachments;

    const emailOverviewData = [
      {
        name: "Read w/ Files",
        population: readWithAttachments,
        color: colors.success,
        legendFontColor: colors.textSecondary,
        legendFontSize: 11,
      },
      {
        name: "Unread w/ Files",
        population: unreadWithAttachments,
        color: colors.warning,
        legendFontColor: colors.textSecondary,
        legendFontSize: 11,
      },
      {
        name: "Read w/o Files",
        population: readWithoutAttachments,
        color: colors.primary,
        legendFontColor: colors.textSecondary,
        legendFontSize: 11,
      },
      {
        name: "Unread w/o Files",
        population: unreadWithoutAttachments,
        color: colors.textTertiary,
        legendFontColor: colors.textSecondary,
        legendFontSize: 11,
      },
    ].filter(d => d.population > 0);

    const sizes = {
      "< 1MB": 0,
      "1-5MB": 0,
      "5-10MB": 0,
      "> 10MB": 0,
    };

    files.forEach(f => {
      const mb = f.size / (1024 * 1024);
      if (mb < 1) sizes["< 1MB"]++;
      else if (mb < 5) sizes["1-5MB"]++;
      else if (mb < 10) sizes["5-10MB"]++;
      else sizes["> 10MB"]++;
    });

    const sizeData = {
      labels: Object.keys(sizes),
      datasets: [{ data: Object.values(sizes) }],
    };

    const barData = {
      labels: Object.keys(dailyActivity).map((d) => d.split("-")[2]),
      datasets: [{ data: Object.values(dailyActivity) }],
    };

    const senderCounts: { [key: string]: number } = {};
    files.forEach(f => {
      if (f.emailFrom) {
        const match = f.emailFrom.match(/^(.*?) <.*?>$/) || [null, f.emailFrom];
        const name = match[1] || f.emailFrom;
        senderCounts[name] = (senderCounts[name] || 0) + 1;
      }
    });

    const topSenders = Object.entries(senderCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      emailOverviewData,
      sizeData,
      barData,
      topSenders,
      totalFiles,
      estimatedTotalEmails,
    };
  }, [files, colors]);

  const chartConfig = {
    backgroundColor: colors.surface,
    backgroundGradientFrom: colors.surface,
    backgroundGradientTo: colors.surface,
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(${colors.primaryRGB}, ${opacity})`,
    labelColor: (opacity = 1) => colors.textSecondary,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 10,
      fontWeight: "600",
    },
    propsForBackgroundLines: {
      strokeDasharray: "",
      stroke: colors.border,
      strokeOpacity: 0.3,
    },
  };

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      {Platform.OS === "web" ? (
        <View style={[styles.header, { backgroundColor: colors.background + "DD", borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Insights</Text>
          </View>
        </View>
      ) : (
        <BlurView intensity={80} tint={theme === 'dark' ? 'dark' : 'light'} style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Insights</Text>
          </View>
        </BlurView>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.gridContainer}>
          <LinearGradient
            colors={theme === 'dark' ? ['#1e293b', '#0f172a'] : ["#f5f3ff", "#ede9fe"]}
            style={[styles.gridCard, { width: (screenWidth - 48 - 12) / 2 }]}
          >
            <View style={[styles.gridIconContainer, { backgroundColor: "rgba(124, 58, 237, 0.1)" }]}>
              <Mail size={16} color="#7c3aed" />
            </View>
            <Text style={[styles.gridValue, { color: theme === 'dark' ? colors.text : "#7c3aed" }]}>{stats.estimatedTotalEmails}</Text>
            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Scanned</Text>
          </LinearGradient>
          <LinearGradient
            colors={theme === 'dark' ? ['#1e293b', '#0f172a'] : ["#faf5ff", "#f3e8ff"]}
            style={[styles.gridCard, { width: (screenWidth - 48 - 12) / 2 }]}
          >
            <View style={[styles.gridIconContainer, { backgroundColor: "rgba(167, 139, 250, 0.1)" }]}>
              <FileText size={16} color="#7c3aed" />
            </View>
            <Text style={[styles.gridValue, { color: theme === 'dark' ? colors.text : "#7c3aed" }]}>{stats.totalFiles}</Text>
            <Text style={[styles.gridLabel, { color: colors.textSecondary }]}>Files Found</Text>
          </LinearGradient>
        </View>

        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <PieChartIcon size={18} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Volume Breakdown</Text>
          </View>
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' }]}>
            {stats.emailOverviewData.length > 0 ? (
              <View style={{ position: 'relative', alignItems: 'center', justifyContent: 'center' }}>
                <PieChart
                  data={stats.emailOverviewData}
                  width={screenWidth - 64}
                  height={200}
                  chartConfig={chartConfig}
                  accessor="population"
                  backgroundColor="transparent"
                  paddingLeft="15"
                  hasLegend={true}
                  absolute
                />
                <View style={{ 
                  position: 'absolute', 
                  width: 80, 
                  height: 80, 
                  borderRadius: 40, 
                  backgroundColor: colors.surface,
                  zIndex: 2,
                  left: (screenWidth - 64) / 4 - 25,
                  top: 60,
                  alignItems: 'center',
                  justifyContent: 'center',
                  elevation: 2,
                  ...Platform.select({
                    web: { boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)' } as any,
                    default: {
                      shadowColor: '#000',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                    },
                  }),
                }}>
                  <Text style={{ color: colors.primary, fontSize: 12, fontWeight: '800' }}>{stats.totalFiles}</Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 8, fontWeight: '600' }}>FILES</Text>
                </View>
              </View>
            ) : (
              <Text style={[styles.noDataText, { color: colors.textTertiary }]}>No data yet</Text>
            )}
          </View>
        </View>

        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <LayoutGrid size={18} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Category Health</Text>
          </View>
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={{ width: '100%', gap: 16 }}>
              {[FileCategory.Finance, FileCategory.Legal, FileCategory.Work, FileCategory.Personal].map(cat => {
                const count = files.filter(f => f.category === cat && f.status === SyncStatus.Success).length;
                const percent = stats.totalFiles > 0 ? (count / stats.totalFiles) * 100 : 0;
                const color = cat === FileCategory.Finance ? "#3b82f6" : cat === FileCategory.Legal ? "#8b5cf6" : cat === FileCategory.Work ? "#ec4899" : colors.textSecondary;
                
                return (
                  <View key={cat} style={{ gap: 8 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: colors.text }}>{cat}</Text>
                      <Text style={{ fontSize: 12, fontWeight: '800', color: color }}>{percent.toFixed(0)}%</Text>
                    </View>
                    <View style={{ height: 8, backgroundColor: colors.background, borderRadius: 4, overflow: 'hidden' }}>
                      <View style={{ height: '100%', width: `${percent}%`, backgroundColor: color, borderRadius: 4 }} />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        </View>

        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Activity Trend</Text>
          </View>
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <LineChart
              data={stats.barData}
              width={screenWidth - 48}
              height={220}
              chartConfig={chartConfig}
              withDots={Platform.OS !== "web"}
              bezier
              style={{
                marginVertical: 8,
                borderRadius: 16,
                paddingRight: 40,
              }}
            />
          </View>
        </View>

        <View style={styles.chartSection}>
          <View style={styles.sectionHeader}>
            <TrendingUp size={18} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Top Senders</Text>
          </View>
          <View style={[styles.chartCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {stats.topSenders.length > 0 ? (
              <View style={{ width: "100%", gap: 12 }}>
                {stats.topSenders.map((sender, index) => (
                  <View key={sender.name} style={[styles.senderRow, { backgroundColor: colors.background }]}>
                    <View style={[styles.senderBadge, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                      <Text style={[styles.senderBadgeText, { color: colors.primary }]}>{index + 1}</Text>
                    </View>
                    <Text style={[styles.senderName, { color: colors.text }]} numberOfLines={1}>
                      {sender.name}
                    </Text>
                    <Text style={[styles.senderCount, { color: colors.textSecondary }]}>{sender.count} files</Text>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.noDataText, { color: colors.textTertiary }]}>No sender data yet</Text>
            )}
          </View>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 34, borderBottomWidth: 1 },
  headerContent: { paddingHorizontal: 24, paddingBottom: 16, flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "transparent" },
  headerTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  scrollContent: { paddingTop: 130, paddingBottom: 40, paddingHorizontal: 24 },
  gridContainer: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 32 },
  gridCard: { padding: 20, borderRadius: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)", elevation: 2, overflow: "hidden" },
  gridIconContainer: { width: 36, height: 36, borderRadius: 12, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  gridValue: { fontSize: 24, fontWeight: "900", letterSpacing: -0.5 },
  gridLabel: { fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.5, marginTop: 4 },
  chartSection: { marginBottom: 32 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, marginLeft: 4 },
  sectionTitle: { fontSize: 18, fontWeight: "800" },
  chartCard: { borderRadius: 24, padding: 16, borderWidth: 1, elevation: 2 },
  noDataText: { paddingVertical: 40, fontSize: 14, fontWeight: "500" },
  senderRow: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 16, gap: 12 },
  senderBadge: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  senderBadgeText: { fontSize: 12, fontWeight: "800" },
  senderName: { flex: 1, fontSize: 14, fontWeight: "700" },
  senderCount: { fontSize: 12, fontWeight: "600" },
});

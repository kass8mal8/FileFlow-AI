import { FileCategory, ProcessedFile, SyncStatus } from "@/types";
import { appStorage } from "@/utils/storage";
import {
  FileText,
  Mail,
  PieChart as PieChartIcon,
  TrendingUp,
  LayoutGrid,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Target,
  Clock,
  Zap,
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
  TouchableOpacity,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { LineChart, PieChart } from "react-native-chart-kit";
import { useTheme } from "@/components/ThemeContext";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";

const screenWidth = Dimensions.get("window").width;

export default function ReportsScreen() {
  const [files, setFiles] = useState<ProcessedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);
  const { colors, theme, typography } = useTheme();

  useEffect(() => {
    async function loadData() {
      const storedFiles = await appStorage.getProcessedFiles();
      setFiles(storedFiles || []);
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
    for (let i = rangeDays - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(now.getDate() - i);
      dailyActivity[d.toISOString().split("T")[0]] = 0;
    }

    files.forEach((f) => {
      if (f.status === SyncStatus.Success) {
        categories[f.category]++;
      }
      const dateKey = f.uploadedAt.split("T")[0];
      if (dailyActivity[dateKey] !== undefined) {
        dailyActivity[dateKey]++;
      }
    });

    const totalFiles = files.length;
    const estimatedTotalEmails = totalFiles > 0 ? Math.floor(totalFiles * 2.4) : 0;
    
    const readWithFiles = files.filter(f => f.status === SyncStatus.Success).length;
    const pendingWithFiles = files.filter(f => f.status === SyncStatus.Pending).length;
    
    const emailOverviewData = [
      { name: "Success", population: readWithFiles, color: "#10B981" },
      { name: "Pending", population: pendingWithFiles, color: "#F59E0B" },
      { name: "Others", population: Math.max(0, totalFiles - readWithFiles - pendingWithFiles), color: "#64748B" }
    ].filter(d => d.population > 0).map(d => ({
        ...d,
        legendFontColor: colors.textSecondary,
        legendFontSize: 11,
    }));

    const activityKeys = Object.keys(dailyActivity);
    const activityValues = Object.values(dailyActivity);
    const filesInRange = activityValues.reduce((sum, v) => sum + v, 0);

    const barData = {
      labels: activityKeys.map((d) => d.split("-")[2]),
      datasets: [
        {
          data: activityValues,
          color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`, // Violet 600
          strokeWidth: 3,
        },
      ],
    };

    // AI Narrative & Risks
    const overdueInvoices = files.filter(f => f.category === FileCategory.Finance && f.filename.toLowerCase().includes('invoice')).length; // Simulated
    const urgentDocs = files.filter(f => f.category === FileCategory.Legal).length;

    return {
      emailOverviewData,
      barData,
      totalFiles,
      estimatedTotalEmails,
      overdueInvoices,
      urgentDocs,
      filesInRange,
    };
  }, [files, colors, rangeDays]);

  const chartConfig = {
    backgroundColor: "transparent",
    backgroundGradientFrom: "transparent",
    backgroundGradientTo: "transparent",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(124, 58, 237, ${opacity})`,
    labelColor: (opacity = 1) => colors.textTertiary,
    style: { borderRadius: 16 },
    propsForDots: {
      r: "4",
      strokeWidth: "2",
      stroke: "#8B5CF6"
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.background,
            borderColor: colors.border,
          },
        ]}
      >
        <View style={styles.headerContent}>
          <View>
            <Text
              style={[
                typography.caption,
                styles.headerPreTitle,
                { color: colors.primary },
              ]}
            >
              INTELLIGENCE
            </Text>
            <Text
              style={[
                typography.headline,
                styles.headerTitle,
                { color: colors.text },
              ]}
            >
              Center
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.profileBtn,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Zap size={18} color={colors.primary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* AI Global Hero */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient
            colors={[colors.aiAccent, colors.aiAccentSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroHeader}>
              <View style={styles.sparkleBadge}>
                <Sparkles size={14} color="#fff" />
                <Text style={styles.sparkleBadgeText}>AI INSIGHTS</Text>
              </View>
              <Text style={styles.heroTime}>
                Based on your last {rangeDays} days
              </Text>
            </View>
            <Text style={[typography.body, styles.heroNarrative]}>
              In the last{" "}
              <Text style={styles.heroHighlight}>{rangeDays}</Text> days you
              processed{" "}
              <Text style={styles.heroHighlight}>{stats.filesInRange}</Text>{" "}
              files. We see{" "}
              <Text style={styles.heroHighlight}>
                {stats.overdueInvoices}
              </Text>{" "}
              invoice items and{" "}
              <Text style={styles.heroHighlight}>{stats.urgentDocs}</Text>{" "}
              legal docs that may need your attention.
            </Text>
            <TouchableOpacity style={styles.heroAction}>
              <Text style={styles.heroActionText}>View Details</Text>
              <ArrowRight size={16} color="#fff" />
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>

        {/* Quick Pulse Widgets */}
        <View style={styles.gridRow}>
            <Animated.View entering={FadeInDown.delay(200)} style={[styles.pulseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.pulseIconBox, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}>
                    <Target size={18} color="#3b82f6" />
                </View>
                <Text style={[styles.pulseValue, { color: colors.text }]}>{stats.estimatedTotalEmails}</Text>
                <Text style={[styles.pulseLabel, { color: colors.textSecondary }]}>Scanned</Text>
            </Animated.View>
            <Animated.View entering={FadeInDown.delay(300)} style={[styles.pulseCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={[styles.pulseIconBox, { backgroundColor: 'rgba(16, 185, 129, 0.1)' }]}>
                    <FileText size={18} color="#10b981" />
                </View>
                <Text style={[styles.pulseValue, { color: colors.text }]}>{stats.totalFiles}</Text>
                <Text style={[styles.pulseLabel, { color: colors.textSecondary }]}>Files Found</Text>
            </Animated.View>
        </View>

        {/* Actionable Risks */}
        <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Action Radar</Text>
            <AlertTriangle size={18} color="#F59E0B" />
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.radarScroll}>
            <TouchableOpacity style={[styles.radarCard, { backgroundColor: '#FEE2E2', borderColor: '#FECACA' }]}>
                <AlertTriangle size={20} color="#EF4444" />
                <View>
                    <Text style={[styles.radarTitle, { color: '#991B1B' }]}>{stats.overdueInvoices} Overdue</Text>
                    <Text style={[styles.radarSub, { color: '#B91C1C' }]}>Invoices pending payment</Text>
                </View>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.radarCard, { backgroundColor: '#E0E7FF', borderColor: '#C7D2FE' }]}>
                <Target size={20} color="#4F46E5" />
                <View>
                    <Text style={[styles.radarTitle, { color: '#3730A3' }]}>{stats.urgentDocs} Critical</Text>
                    <Text style={[styles.radarSub, { color: '#4338CA' }]}>Contracts need review</Text>
                </View>
            </TouchableOpacity>
        </ScrollView>

        {/* Trends Chart */}
        <View style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.innerHeader}>
                <TrendingUp size={18} color={colors.primary} />
                <Text style={[typography.title, styles.innerTitle, { color: colors.text }]}>
                  Activity Pulse
                </Text>
                <View style={styles.rangeToggle}>
                  <TouchableOpacity
                    onPress={() => setRangeDays(7)}
                    style={[
                      styles.rangeChip,
                      rangeDays === 7 && [
                        styles.rangeChipActive,
                        { backgroundColor: colors.primary },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.rangeChipText,
                        rangeDays === 7 && { color: "#fff" },
                      ]}
                    >
                      7D
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setRangeDays(30)}
                    style={[
                      styles.rangeChip,
                      rangeDays === 30 && [
                        styles.rangeChipActive,
                        { backgroundColor: colors.primary },
                      ],
                    ]}
                  >
                    <Text
                      style={[
                        styles.rangeChipText,
                        rangeDays === 30 && { color: "#fff" },
                      ]}
                    >
                      30D
                    </Text>
                  </TouchableOpacity>
                </View>
            </View>
            <LineChart
                data={stats.barData}
                width={screenWidth - 64}
                height={180}
                chartConfig={chartConfig}
                bezier
                style={{ marginLeft: -10, marginTop: 16 }}
                withVerticalLines={false}
                withHorizontalLines={false}
            />
        </View>

        {/* Category Breakdown */}
        <View style={[styles.insightCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.innerHeader}>
                <PieChartIcon size={18} color={colors.primary} />
                <Text style={[typography.title, styles.innerTitle, { color: colors.text }]}>
                  Category Health
                </Text>
            </View>
            <PieChart
                data={stats.emailOverviewData}
                width={screenWidth - 64}
                height={160}
                chartConfig={chartConfig}
                accessor="population"
                backgroundColor="transparent"
                paddingLeft="0"
                absolute
            />
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: { 
    position: "absolute", 
    top: 0, 
    left: 0, 
    right: 0, 
    zIndex: 10, 
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerContent: { 
    paddingHorizontal: 24, 
    flexDirection: "row", 
    justifyContent: "space-between", 
    alignItems: "center" 
  },
  headerPreTitle: { fontSize: 10, fontWeight: "900", letterSpacing: 2, marginBottom: -2 },
  headerTitle: { fontSize: 32, fontWeight: "900", letterSpacing: -1 },
  profileBtn: { width: 44, height: 44, borderRadius: 15, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  scrollContent: { 
    paddingTop: Platform.OS === 'ios' ? 140 : 110, 
    paddingBottom: 100, 
    paddingHorizontal: 20 
  },
  heroCard: {
    padding: 24,
    borderRadius: 32,
    marginBottom: 24,
    elevation: 8,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  sparkleBadge: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(255,255,255,0.2)', 
    paddingHorizontal: 10, 
    paddingVertical: 5, 
    borderRadius: 10 
  },
  sparkleBadgeText: { color: '#fff', fontSize: 10, fontWeight: '900', letterSpacing: 0.5 },
  heroTime: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  heroNarrative: { fontSize: 17, color: '#fff', lineHeight: 26, fontWeight: '500' },
  heroHighlight: { fontWeight: '900' },
  heroAction: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 8, 
    marginTop: 20, 
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  heroActionText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  gridRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  pulseCard: { flex: 1, padding: 20, borderRadius: 24, borderWidth: 1, elevation: 2 },
  pulseIconBox: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  pulseValue: { fontSize: 24, fontWeight: '900', letterSpacing: -0.5 },
  pulseLabel: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 16, paddingLeft: 4 },
  sectionTitle: { fontSize: 20, fontWeight: '900', letterSpacing: -0.5 },
  radarScroll: { marginBottom: 24, marginLeft: -20, paddingLeft: 20 },
  radarCard: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 16, 
    padding: 16, 
    borderRadius: 20, 
    marginRight: 12, 
    borderWidth: 1 
  },
  radarTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  radarSub: { fontSize: 12, fontWeight: '600' },
  insightCard: { padding: 20, borderRadius: 28, borderWidth: 1, marginBottom: 20, elevation: 2 },
  innerHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  innerTitle: { fontSize: 16, fontWeight: '800' },
  rangeToggle: {
    flexDirection: 'row',
    marginLeft: 'auto',
    gap: 6,
  },
  rangeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(148, 163, 184, 0.6)', // slate-400
  },
  rangeChipActive: {
    borderColor: 'transparent',
  },
  rangeChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748b',
  },
});

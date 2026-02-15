import authService from "@/services/auth";
import backgroundService from "@/services/background";
import { appStorage } from "@/utils/storage";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { Moon, Sun, Monitor, Shield, Clock, LogOut } from "lucide-react-native";
import {
  Alert,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Image,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/components/ThemeContext";
import React, { useEffect, useState } from "react";

export default function SettingsScreen() {
  const [userInfo, setUserInfo] = useState<any>(null);
  const [isSyncRegistered, setIsSyncRegistered] = useState(false);
  const [syncPeriod, setSyncPeriod] = useState("30d");
  const { preference, setPreference, colors, theme } = useTheme();

  useEffect(() => {
    async function loadSettings() {
      // First load from storage for immediate feedback
      const storedInfo = await appStorage.getUserInfo();
      setUserInfo(storedInfo);

      const registered = await backgroundService.isBackgroundTaskRegistered();
      const period = await appStorage.getSyncPeriod();
      setIsSyncRegistered(registered);
      setSyncPeriod(period);

      // Then fetch fresh info from API to update profile picture etc.
      const freshInfo = await authService.refreshUserInfo();
      if (freshInfo) {
        setUserInfo(freshInfo);
      }
    }
    loadSettings();
  }, []);

  const handleLogout = () => {
    const performLogout = async () => {
      await authService.logout();
      router.replace("/auth/login");
    };

    if (Platform.OS === "web") {
      if (confirm("Are you sure you want to sign out of FileFlow?")) {
        performLogout();
      }
      return;
    }

    Alert.alert("Sign Out", "Are you sure you want to sign out of FileFlow?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: performLogout,
      },
    ]);
  };

  const toggleSync = async (value: boolean) => {
    try {
      if (value) {
        await backgroundService.registerBackgroundTask();
      } else {
        await backgroundService.unregisterBackgroundTask();
      }
      setIsSyncRegistered(value);
    } catch (error) {
      Alert.alert("Error", "Action failed.");
    }
  };

  const updateSyncPeriod = async (period: string) => {
    await appStorage.setSyncPeriod(period);
    setSyncPeriod(period);
    await appStorage.setHistoryId("");
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />

      {Platform.OS === "web" ? (
        <View style={[styles.header, { backgroundColor: colors.background + "DD", borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
          </View>
        </View>
      ) : (
        <BlurView intensity={80} tint={theme === 'dark' ? 'dark' : 'light'} style={[styles.header, { borderBottomColor: colors.border }]}>
          <View style={styles.headerContent}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Settings</Text>
          </View>
        </BlurView>
      )}

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.profileCard}>
            <LinearGradient
              colors={theme === 'dark' ? ["#1e293b", "#0f172a"] : ["#7c3aed", "#5b21b6"]}
              style={styles.profileGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={[styles.avatarContainer, { borderColor: theme === 'dark' ? colors.border : "rgba(255,255,255,0.3)" }]}>
                {userInfo?.picture ? (
                  <Image source={{ uri: userInfo.picture }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>
                    {userInfo?.name?.charAt(0) || "U"}
                  </Text>
                )}
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {userInfo?.name || "Authorized User"}
                </Text>
                <Text style={styles.profileEmail}>
                  {userInfo?.email || "Connected account"}
                </Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Monitor size={16} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.periodContainer}>
              {[
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
                { id: "system", label: "System", icon: Monitor },
              ].map(({ id, label, icon: Icon }) => (
                <TouchableOpacity
                  key={id}
                  style={[
                    styles.periodButton,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    preference === id && { borderColor: colors.primary, backgroundColor: colors.primary + "10" }
                  ]}
                  onPress={() => setPreference(id as any)}
                >
                  <Icon 
                    size={16} 
                    color={preference === id ? colors.primary : colors.textSecondary} 
                    style={{ marginBottom: 4 }}
                  />
                  <Text
                    style={[
                      styles.periodText,
                      { color: colors.textSecondary },
                      preference === id && { color: colors.primary }
                    ]}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Shield size={16} color={colors.textSecondary} />
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Preferences</Text>
          </View>
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <View style={styles.row}>
              <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
                <Shield size={18} color={colors.primary} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Background Sync</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>
                  Organize attachments while app is closed
                </Text>
              </View>
              <Switch
                value={isSyncRegistered}
                onValueChange={toggleSync}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor="#fff"
              />
            </View>

            <View style={[styles.divider, { backgroundColor: colors.border }]} />

            <View style={[styles.row, { marginBottom: 16 }]}>
              <View style={[styles.iconBox, { backgroundColor: colors.background }]}>
                <Clock size={18} color={colors.primary} />
              </View>
              <View style={styles.settingTextContainer}>
                <Text style={[styles.settingTitle, { color: colors.text }]}>Sync Window</Text>
                <Text style={[styles.settingDescription, { color: colors.textSecondary }]}>How far back to scan emails</Text>
              </View>
              <Text style={[styles.valueDisplay, { color: colors.primary, backgroundColor: colors.primary + '10' }]}>{syncPeriod}</Text>
            </View>

            <View style={styles.periodContainer}>
              {["7d", "30d", "90d", "all"].map((period) => (
                <TouchableOpacity
                  key={period}
                  style={[
                    styles.periodButton,
                    { borderColor: colors.border, backgroundColor: colors.background },
                    syncPeriod === period && { borderColor: colors.primary, backgroundColor: colors.primary + '10' }
                  ]}
                  onPress={() => updateSyncPeriod(period)}
                >
                  <Text
                    style={[
                      styles.periodText,
                      { color: colors.textSecondary },
                      syncPeriod === period && { color: colors.primary }
                    ]}
                  >
                    {period}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        <View style={styles.footer}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={18} color="#ef4444" style={{ marginRight: 8 }} />
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>

          <View style={styles.versionContainer}>
            <Text style={[styles.appName, { color: colors.textTertiary }]}>FileFlow Stable</Text>
            <Text style={[styles.tagline, { color: colors.textTertiary }]}>Built for absolute efficiency.</Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 34, borderBottomWidth: 1 },
  headerContent: { paddingHorizontal: 24, paddingBottom: 16, backgroundColor: "transparent" },
  headerTitle: { fontSize: 28, fontWeight: "900", letterSpacing: -1 },
  scrollContent: { paddingTop: 124, paddingBottom: 40 },
  section: { paddingHorizontal: 24, marginBottom: 32, backgroundColor: "transparent" },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16, marginLeft: 4, backgroundColor: "transparent" },
  sectionTitle: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 2 },
  card: { borderRadius: 24, padding: 24, borderWidth: 1, elevation: 2 },
  profileCard: { borderRadius: 24, overflow: "hidden", elevation: 6 },
  profileGradient: { padding: 24, flexDirection: "row", alignItems: "center" },
  avatarContainer: { width: 64, height: 64, borderRadius: 32, backgroundColor: "rgba(255,255,255,0.15)", alignItems: "center", justifyContent: "center", marginRight: 20, borderWidth: 1, overflow: 'hidden' },
  avatarImage: { width: '100%', height: '100%' },
  avatarText: { fontSize: 28, fontWeight: "900", color: "#fff" },
  profileInfo: { flex: 1 },
  profileName: { fontSize: 22, fontWeight: "900", color: "#fff", letterSpacing: -0.5 },
  profileEmail: { fontSize: 14, color: "rgba(255,255,255,0.9)", fontWeight: "600", marginTop: 2 },
  iconBox: { width: 40, height: 40, borderRadius: 12, alignItems: "center", justifyContent: "center", marginRight: 16 },
  valueDisplay: { fontSize: 14, fontWeight: "800", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, textTransform: "uppercase" },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: "transparent" },
  divider: { height: 1, marginVertical: 16 },
  settingTextContainer: { backgroundColor: "transparent", flex: 1, marginRight: 16 },
  settingTitle: { fontSize: 16, fontWeight: "bold" },
  settingDescription: { fontSize: 12, marginTop: 4 },
  periodContainer: { flexDirection: "row", gap: 8, backgroundColor: "transparent" },
  periodButton: { flex: 1, paddingVertical: 12, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  periodText: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 1 },
  footer: { paddingHorizontal: 24, alignItems: "center", marginTop: 16, backgroundColor: "transparent" },
  logoutButton: { width: "100%", backgroundColor: "rgba(239, 68, 68, 0.1)", padding: 16, borderRadius: 16, borderWidth: 1, borderColor: "rgba(239, 68, 68, 0.2)", flexDirection: "row", alignItems: "center", justifyContent: "center" },
  logoutText: { color: "#ef4444", fontWeight: "bold", fontSize: 16 },
  versionContainer: { marginTop: 32, alignItems: "center", backgroundColor: "transparent" },
  appName: { fontSize: 10, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 2, marginBottom: 4 },
  tagline: { fontSize: 10, fontStyle: "italic" },
});

import { Mail } from "lucide-react-native";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import authService from "../../services/auth";
import { useTheme } from "@/components/ThemeContext";

const Logo = require("@/assets/images/logo.png");

export default function LoginScreen() {
  const [loading, setLoading] = useState(false);
  const { colors, theme } = useTheme();

  const handleLogin = async () => {
    try {
      setLoading(true);
      await authService.login();
    } catch (error) {
      console.error("Login error:", error);
      Alert.alert(
        "Connection Error",
        "Could not connect to Google. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <View style={styles.contentContainer}>
        <Animated.View
          entering={FadeInUp.delay(200).duration(800)}
          style={styles.logoContainer}
        >
          <View style={[styles.logoBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Image
              source={Logo}
              style={{
                width: 100,
                height: 100,
                borderRadius: 20,
              }}
              resizeMode="contain"
            />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Absurdly simple file organization.
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Powered by FileFlow AI
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(400).duration(800)}
          style={styles.formContainer}
        >
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }, loading && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <View style={styles.buttonContent}>
                <View style={styles.iconSpacing}>
                  <Mail size={20} color="#fff" />
                </View>
                <Text style={styles.buttonText}>
                  Connect Google Account
                </Text>
              </View>
            )}
          </TouchableOpacity>

          <Text style={[styles.disclaimer, { color: colors.textTertiary }]}>
            FileFlow automatically classifies and organizes your email
            attachments into <Text style={[styles.highlight, { color: colors.textSecondary }]}>Finance</Text>,{" "}
            <Text style={[styles.highlight, { color: colors.textSecondary }]}>Legal</Text>,{" "}
            <Text style={[styles.highlight, { color: colors.textSecondary }]}>Work</Text>, and{" "}
            <Text style={[styles.highlight, { color: colors.textSecondary }]}>Personal</Text> folders.
          </Text>
        </Animated.View>
      </View>

      <Animated.Text
        entering={FadeInDown.delay(600).duration(800)}
        style={[styles.versionText, { color: colors.textTertiary }]}
      >
        FileFlow AI • v1.0.0
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    width: '100%',
    paddingHorizontal: 32,
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoBox: {
    width: 120,
    height: 120,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    borderWidth: 1,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    textAlign: 'center',
    fontWeight: '500',
    marginBottom: 8,
  },
  formContainer: {
    width: '100%',
    maxWidth: 384,
  },
  button: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconSpacing: {
    marginRight: 12,
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 16,
  },
  disclaimer: {
    marginTop: 32,
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: 24,
    fontWeight: '500',
  },
  highlight: {
    fontWeight: '700',
  },
  versionText: {
    position: 'absolute',
    bottom: 32,
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
});

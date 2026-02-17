import React from 'react';
import { View, StyleSheet, TouchableOpacity, SafeAreaView } from 'react-native';
import { ChevronLeft } from 'lucide-react-native';
import { useTheme } from '../components/ThemeContext';
import { useRouter } from 'expo-router';
import PaywallContent from '../components/PaywallContent';

export default function SubscriptionScreen() {
  const { colors } = useTheme();
  const router = useRouter();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={() => router.back()} 
          style={[styles.backButton, { backgroundColor: colors.surface }]}
        >
          <ChevronLeft size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      <PaywallContent 
        onSuccess={() => router.back()} 
        onClose={() => router.back()}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 16, paddingHorizontal: 24, zIndex: 10 },
  backButton: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});

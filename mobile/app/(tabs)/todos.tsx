import { Todo } from "@/types";
import { appStorage } from "@/utils/storage";
import {
  CheckCircle2,
  Circle,
  Trash2,
  Calendar as CalendarIcon,
  Inbox,
  Clock,
  ChevronRight,
  Plus,
} from "lucide-react-native";
import React, { useEffect, useState, useCallback } from "react";
import TodoService from "@/services/TodoService";
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
  RefreshControl,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/components/ThemeContext";
import Animated, { 
  FadeInDown, 
  FadeOut, 
  Layout, 
  SlideInRight 
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";

const screenWidth = Dimensions.get("window").width;

export default function TodosScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { colors, theme, typography } = useTheme();

  const loadData = useCallback(async (isRefreshing = false) => {
    try {
      if (!isRefreshing) setLoading(true);
      
      const userInfo = await appStorage.getUserInfo();
      let email = userInfo?.email;

      // 1. Get local todos first for instant UI
      const localTodos = await appStorage.getTodos();
      if (localTodos.length > 0 && !isRefreshing) {
        setTodos(localTodos);
        setLoading(false);
      }

      // 2. Fetch from server if we have an email
      if (email) {
        const serverTodos = await TodoService.fetchTodos(email);
        if (serverTodos.length > 0) {
          // Merge logic: Keep all server todos, and add any local todos that aren't on server yet
          // (Matching by text and sourceId since IDs might differ between local/server for the same item)
          const merged = [...serverTodos];
          
          localTodos.forEach(localTodo => {
            const existsOnServer = serverTodos.some(s => 
              s.text.trim().toLowerCase() === localTodo.text.trim().toLowerCase() && 
              s.sourceId === localTodo.sourceId
            );
            if (!existsOnServer) {
              merged.unshift(localTodo);
            }
          });

          setTodos(merged);
          // Sync merged back to local cache
          await appStorage.setTodos(merged);
        }
      }
    } catch (error) {
      console.error("Failed to load todos:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadData(true);
  };

  const handleToggle = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await appStorage.toggleTodo(id);
    setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
  };

  const handleDelete = async (id: string) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await appStorage.deleteTodo(id);
    setTodos(prev => prev.filter(t => t.id !== id));
  };

  const completedCount = todos.filter(t => t.completed).length;
  const pendingCount = todos.length - completedCount;

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
              MY TASKS
            </Text>
            <Text
              style={[
                typography.headline,
                styles.headerTitle,
                { color: colors.text },
              ]}
            >
              Priority
            </Text>
          </View>
          <View style={styles.statsContainer}>
            <View style={[styles.statBadge, { backgroundColor: colors.surface }]}>
              <Text style={[styles.statValue, { color: colors.primary }]}>{pendingCount}</Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Pending</Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={styles.scrollContent} 
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        
        {/* Progress Card */}
        <Animated.View entering={FadeInDown.delay(100)}>
          <LinearGradient
            colors={[colors.aiAccent, colors.aiAccentSecondary]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.heroCard}
          >
            <View style={styles.heroHeader}>
              <View style={styles.progressTag}>
                <CalendarIcon size={12} color="#fff" />
                <Text style={styles.progressTagText}>OVERVIEW</Text>
              </View>
              <Text style={styles.heroTime}>
                {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
              </Text>
            </View>
            
            <View style={styles.progressMainContent}>
              <View style={styles.progressBrief}>
                <Text style={styles.progressPercentage}>
                  {todos.length > 0 ? Math.round((completedCount / todos.length) * 100) : 0}%
                </Text>
                <Text style={styles.progressSubtext}>Completed</Text>
              </View>
              
              <Text style={[typography.body, styles.heroNarrative]}>
                {todos.length === 0 
                  ? "Your todo list is empty. Tasks will appear here as they are identified."
                  : `You've completed ${completedCount} of ${todos.length} tasks. ${pendingCount > 0 ? `Keep it up!` : 'Great job!'}`}
              </Text>
            </View>

            {todos.length > 0 && (
              <View style={styles.progressBarWrapper}>
                <View style={styles.progressBarContainer}>
                  <View style={[styles.progressBar, { width: `${(completedCount / todos.length) * 100}%` }]} />
                </View>
              </View>
            )}
          </LinearGradient>
        </Animated.View>

        {todos.length === 0 ? (
          <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyContainer}>
            <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
              <Inbox size={48} color={colors.textTertiary} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>All Clear!</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              New todos will appear here when you or the AI adds them from your emails and files.
            </Text>
          </Animated.View>
        ) : (
          <View style={styles.todoList}>
            {todos.map((todo, index) => (
              <Animated.View 
                key={todo.id || `todo-${index}`} 
                entering={FadeInDown.delay(index * 50)} 
                layout={Layout.springify()}
                style={[
                  styles.todoItem, 
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  todo.completed && styles.todoItemCompleted
                ]}
              >
                <TouchableOpacity 
                  onPress={() => handleToggle(todo.id)}
                  style={styles.itemMain}
                >
                  <View style={styles.checkContainer}>
                    {todo.completed ? (
                      <CheckCircle2 size={24} color={colors.primary} />
                    ) : (
                      <Circle size={24} color={colors.textTertiary} />
                    )}
                  </View>
                  <View style={styles.textContainer}>
                    <Text 
                      style={[
                        styles.todoText, 
                        { color: colors.text },
                        todo.completed && [styles.todoTextCompleted, { color: colors.textSecondary }]
                      ]}
                      numberOfLines={2}
                    >
                      {todo.text}
                    </Text>
                    <View style={styles.sourceRow}>
                      <Clock size={12} color={colors.textTertiary} style={{ marginRight: 4 }} />
                      <Text style={[styles.sourceText, { color: colors.textTertiary }]}>
                        {todo.sourceTitle}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleDelete(todo.id)}
                  style={styles.deleteBtn}
                >
                  <Trash2 size={20} color="#ef4444" />
                </TouchableOpacity>
              </Animated.View>
            ))}
          </View>
        )}
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
  statsContainer: { flexDirection: 'row', gap: 8 },
  statBadge: { 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 12, 
    alignItems: 'center', 
    borderWidth: 1, 
    borderColor: 'rgba(0,0,0,0.05)' 
  },
  statValue: { fontSize: 16, fontWeight: '900' },
  statLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  scrollContent: { 
    paddingTop: Platform.OS === 'ios' ? 140 : 110, 
    paddingBottom: 100, 
    paddingHorizontal: 20 
  },
  heroCard: {
    padding: 24,
    borderRadius: 28,
    marginBottom: 24,
    elevation: 4,
    shadowColor: '#7c3aed',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  heroHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  progressTag: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: 'rgba(255,255,255,0.15)', 
    paddingHorizontal: 8, 
    paddingVertical: 4, 
    borderRadius: 8 
  },
  progressTagText: { color: '#fff', fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  heroTime: { color: 'rgba(255,255,255,0.7)', fontSize: 11, fontWeight: '600' },
  progressMainContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 10,
  },
  progressBrief: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
  },
  progressPercentage: {
    color: '#fff',
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: -1,
  },
  progressSubtext: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginTop: -2,
  },
  heroNarrative: { 
    flex: 1,
    fontSize: 15, 
    color: '#fff', 
    lineHeight: 22, 
    fontWeight: '600' 
  },
  progressBarWrapper: {
    marginTop: 10,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden'
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#fff',
    borderRadius: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '900',
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 20,
  },
  todoList: {
    gap: 12,
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  todoItemCompleted: {
    opacity: 0.7,
  },
  itemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkContainer: {
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  todoText: {
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 20,
    marginBottom: 4,
  },
  todoTextCompleted: {
    textDecorationLine: 'line-through',
  },
  sourceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteBtn: {
    padding: 8,
    marginLeft: 8,
  },
});

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
  Filter,
  SortAsc,
  SortDesc,
  X,
  Send,
} from "lucide-react-native";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import TodoService from "@/services/TodoService";
import { eventEmitter } from "@/utils/eventEmitter";
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
import { useFocusEffect } from "expo-router";
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

type FilterType = 'all' | 'pending' | 'completed';
type SortType = 'date' | 'priority' | 'source';

export default function TodosScreen() {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<FilterType>('all');
  const [sortBy, setSortBy] = useState<SortType>('date');
  const [sortAscending, setSortAscending] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
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
    
    // Listen for changes from other screens
    const handleChanged = () => {
      console.log("Todos changed elsewhere, refreshing...");
      loadData(true);
    };
    
    eventEmitter.on('todos-changed', handleChanged);
    return () => eventEmitter.off('todos-changed', handleChanged);
  }, [loadData]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadData(true);
    }, [loadData])
  );

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

  // Filter and sort todos
  const filteredAndSortedTodos = useMemo(() => {
    let filtered = todos;
    
    // Apply filter
    if (filter === 'pending') {
      filtered = todos.filter(t => !t.completed);
    } else if (filter === 'completed') {
      filtered = todos.filter(t => t.completed);
    }
    
    // Apply sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'date') {
        const dateA = new Date(a.createdAt || 0).getTime();
        const dateB = new Date(b.createdAt || 0).getTime();
        comparison = dateA - dateB;
      } else if (sortBy === 'source') {
        comparison = (a.sourceTitle || '').localeCompare(b.sourceTitle || '');
      } else {
        // Priority sort (completed items go to bottom)
        if (a.completed !== b.completed) {
          comparison = a.completed ? 1 : -1;
        }
      }
      
      return sortAscending ? comparison : -comparison;
    });
    
    return sorted;
  }, [todos, filter, sortBy, sortAscending]);

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
            <TouchableOpacity
              onPress={() => setShowFilters(!showFilters)}
              style={[styles.filterBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
            >
              <Filter size={16} color={colors.text} />
            </TouchableOpacity>
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
        {/* Filter Bar */}
        {showFilters && (
          <Animated.View 
            entering={FadeInDown.delay(50)}
            exiting={FadeOut}
            style={[styles.filterBar, { backgroundColor: colors.surface, borderColor: colors.border }]}
          >
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Filter:</Text>
              {(['all', 'pending', 'completed'] as FilterType[]).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => {
                    setFilter(f);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                  style={[
                    styles.filterChip,
                    {
                      backgroundColor: filter === f ? colors.primary : colors.background,
                      borderColor: filter === f ? colors.primary : colors.border,
                    }
                  ]}
                >
                  <Text style={[
                    styles.filterChipText,
                    { color: filter === f ? '#fff' : colors.text }
                  ]}>
                    {f.charAt(0).toUpperCase() + f.slice(1)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.filterRow}>
              <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Sort:</Text>
              <TouchableOpacity
                onPress={() => {
                  setSortBy('date');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.sortBtn,
                  {
                    backgroundColor: sortBy === 'date' ? colors.primary + '20' : 'transparent',
                    borderColor: sortBy === 'date' ? colors.primary : colors.border,
                  }
                ]}
              >
                <Text style={[
                  styles.sortBtnText,
                  { color: sortBy === 'date' ? colors.primary : colors.text }
                ]}>
                  Date
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSortBy('source');
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.sortBtn,
                  {
                    backgroundColor: sortBy === 'source' ? colors.primary + '20' : 'transparent',
                    borderColor: sortBy === 'source' ? colors.primary : colors.border,
                  }
                ]}
              >
                <Text style={[
                  styles.sortBtnText,
                  { color: sortBy === 'source' ? colors.primary : colors.text }
                ]}>
                  Source
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setSortAscending(!sortAscending);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[
                  styles.sortToggleBtn,
                  { backgroundColor: colors.background, borderColor: colors.border }
                ]}
              >
                {sortAscending ? (
                  <SortAsc size={16} color={colors.text} />
                ) : (
                  <SortDesc size={16} color={colors.text} />
                )}
              </TouchableOpacity>
            </View>
          </Animated.View>
        )}
        
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
            {filteredAndSortedTodos.length === 0 ? (
              <Animated.View entering={FadeInDown.delay(200)} style={styles.emptyContainer}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.surface }]}>
                  <Inbox size={48} color={colors.textTertiary} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No {filter === 'all' ? '' : filter} todos
                </Text>
                <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                  {filter === 'pending' 
                    ? "All your tasks are completed! Great job! 🎉"
                    : filter === 'completed'
                    ? "Complete some tasks to see them here."
                    : "New todos will appear here when you or the AI adds them from your emails and files."}
                </Text>
                {filter !== 'all' && (
                  <TouchableOpacity
                    onPress={() => setFilter('all')}
                    style={[styles.clearFilterBtn, { backgroundColor: colors.primary }]}
                  >
                    <Text style={styles.clearFilterText}>Show All</Text>
                  </TouchableOpacity>
                )}
              </Animated.View>
            ) : (
              filteredAndSortedTodos.map((todo, index) => (
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
            )))}
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
  filterBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginRight: 8,
  },
  filterBar: {
    marginBottom: 20,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginRight: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  sortBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  sortBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  sortToggleBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    marginLeft: 'auto',
  },
  clearFilterBtn: {
    marginTop: 16,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  clearFilterText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },
  todoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
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

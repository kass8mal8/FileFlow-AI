import api from './api';
import { Todo } from '../types';
import { API_BASE_URL } from '../utils/constants';

class TodoService {
  /**
   * Fetch all todos from server
   */
  async fetchTodos(email: string): Promise<Todo[]> {
    try {
      const response = await api.get(`${API_BASE_URL}/todos?email=${encodeURIComponent(email)}`);
      if (response.data.success) {
        return response.data.todos.map((t: any) => ({
          ...t,
          id: t._id || t.id // Ensure we have a valid id for React keys
        }));
      }
      return [];
    } catch (error) {
      console.error('Error fetching todos from server:', error);
      return [];
    }
  }

  /**
   * Sync a todo to the server (Upsert)
   */
  async syncTodo(email: string, todo: Todo): Promise<void> {
    try {
      await api.post(`${API_BASE_URL}/todos/sync`, {
        userEmail: email.toLowerCase(),
        text: todo.text,
        sourceId: todo.sourceId,
        sourceTitle: todo.sourceTitle,
        completed: todo.completed
      });
    } catch (error) {
      console.error('Error syncing todo to server:', error);
    }
  }

  /**
   * Toggle todo completion on server
   */
  async toggleTodo(email: string, todo: Todo): Promise<void> {
    try {
      if (todo.id && !todo.id.startsWith('local-')) {
        await api.patch(`${API_BASE_URL}/todos/${todo.id}`, {
          completed: todo.completed,
          userEmail: email.toLowerCase()
        });
      } else {
        // Fallback to syncTodo (Upsert) if we don't have a server ID yet
        await this.syncTodo(email, todo);
      }
    } catch (error) {
      console.error('Error toggling todo on server:', error);
    }
  }

  /**
   * Delete todo from server
   */
  async deleteTodo(email: string, todo: Todo): Promise<void> {
    try {
      if (todo.id && !todo.id.startsWith('local-')) {
        await api.delete(`${API_BASE_URL}/todos/${todo.id}?userEmail=${encodeURIComponent(email)}`);
      } else {
        const params = new URLSearchParams({
          userEmail: email.toLowerCase(),
          sourceId: todo.sourceId,
          text: todo.text
        }).toString();
        
        await api.delete(`${API_BASE_URL}/todos/sync?${params}`);
      }
    } catch (error) {
      console.error('Error deleting todo from server:', error);
    }
  }
}

export default new TodoService();

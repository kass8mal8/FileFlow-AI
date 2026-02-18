const Todo = require('../models/Todo');

class TodoController {
  /**
   * Get all todos for a user
   */
  async getTodos(req, res) {
    try {
      const { email } = req.query;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const todos = await Todo.find({ userEmail: email.toLowerCase() })
        .sort({ createdAt: -1 });

      res.json({ success: true, todos });
    } catch (error) {
      console.error('Error fetching todos:', error);
      res.status(500).json({ error: 'Failed to fetch todos' });
    }
  }

  /**
   * Create or update a todo (Upsert)
   */
  async syncTodo(req, res) {
    try {
      const { userEmail, text, sourceId, sourceTitle, completed } = req.body;

      if (!userEmail || !text || !sourceId) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const todo = await Todo.findOneAndUpdate(
        { userEmail: userEmail.toLowerCase(), sourceId, text },
        { 
          sourceTitle,
          completed: completed || false,
          updatedAt: new Date()
        },
        { upsert: true, returnDocument: 'after' }
      );

      res.json({ success: true, todo });
    } catch (error) {
      console.error('Error syncing todo:', error);
      res.status(500).json({ error: 'Failed to sync todo' });
    }
  }

  /**
   * Toggle todo completion status
   */
  async toggleTodo(req, res) {
    try {
      const { id } = req.params;
      const { completed, userEmail } = req.body;

      if (!userEmail) {
        return res.status(400).json({ error: 'User email is required for security verification' });
      }

      const todo = await Todo.findOneAndUpdate(
        { _id: id, userEmail: userEmail.toLowerCase() },
        { completed, updatedAt: new Date() },
        { returnDocument: 'after' }
      );

      if (!todo) {
        return res.status(404).json({ error: 'Todo not found or unauthorized' });
      }

      res.json({ success: true, todo });
    } catch (error) {
      console.error('Error toggling todo:', error);
      res.status(500).json({ error: 'Failed to update todo' });
    }
  }

  /**
   * Delete a todo (by ID or identifiers)
   */
  async deleteTodo(req, res) {
    try {
      const { id } = req.params;
      const { userEmail, sourceId, text } = req.query;

      if (!userEmail) {
        return res.status(400).json({ error: 'User email is required for security verification' });
      }

      let todo;
      const normalizedEmail = userEmail.toLowerCase();

      if (id && id !== 'sync') {
        todo = await Todo.findOneAndDelete({ _id: id, userEmail: normalizedEmail });
      } else if (sourceId && text) {
        todo = await Todo.findOneAndDelete({ 
          userEmail: normalizedEmail, 
          sourceId, 
          text 
        });
      }

      if (!todo) {
        return res.status(404).json({ error: 'Todo not found or unauthorized' });
      }

      res.json({ success: true, message: 'Todo deleted' });
    } catch (error) {
      console.error('Error deleting todo:', error);
      res.status(500).json({ error: 'Failed to delete todo' });
    }
  }
}

module.exports = new TodoController();

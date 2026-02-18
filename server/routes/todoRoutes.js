const express = require('express');
const router = express.Router();
const todoController = require('../controllers/todoController');

// GET /api/todos?email=...
router.get('/', todoController.getTodos);

// POST /api/todos/sync (Upsert)
router.post('/sync', todoController.syncTodo);

// PATCH /api/todos/:id
router.patch('/:id', todoController.toggleTodo);

// DELETE /api/todos/:id
router.delete('/:id', todoController.deleteTodo);

module.exports = router;

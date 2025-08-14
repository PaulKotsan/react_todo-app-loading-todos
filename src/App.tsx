/* eslint-disable jsx-a11y/label-has-associated-control */
/* eslint-disable jsx-a11y/control-has-associated-label */
import React, { useState, useEffect, useRef } from 'react';
import { UserWarning } from './UserWarning';
import {
  getTodos,
  addTodo as apiAddTodo,
  deleteTodo as apiDeleteTodo,
  updateTodo as apiUpdateTodo,
  USER_ID,
} from './api/todos';
import { Todo } from './types/Todo';

type Filter = 'all' | 'active' | 'completed';

export const App: React.FC = () => {
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [loading, setLoading] = useState(true);
  const [savingTodoIds, setSavingTodoIds] = useState<number[]>([]);
  const [deletingTodoIds, setDeletingTodoIds] = useState<number[]>([]);
  const [updatingTodoIds, setUpdatingTodoIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Load todos
  useEffect(() => {
    getTodos()
      .then(setTodos)
      .catch(() => setError('Unable to load todos'))
      .finally(() => setLoading(false));
  }, []);

  // Auto-hide errors
  useEffect(() => {
    if (!error) {
      return;
    }

    const timer = setTimeout(() => setError(''), 0);

    return () => clearTimeout(timer);
  }, [error]);

  if (!USER_ID) {
    return <UserWarning />;
  }

  const allCompleted = todos.length > 0 && todos.every(todo => todo.completed);
  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') {
      return !todo.completed;
    }

    if (filter === 'completed') {
      return todo.completed;
    }

    return true;
  });

  const focusInput = () => inputRef.current?.focus();

  // Add Todo
  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    const title = newTodoTitle.trim();

    if (!title) {
      setError('Title should not be empty');

      return;
    }

    const tempId = Date.now();
    const tempTodo: Todo = {
      id: tempId,
      userId: USER_ID,
      title,
      completed: false,
    };

    setTodos(prev => [...prev, tempTodo]);
    setSavingTodoIds(prev => [...prev, tempId]);
    setNewTodoTitle('');

    apiAddTodo(tempTodo)
      .then(newTodos => {
        setTodos(prev =>
          prev.map(t => (t.id === tempId ? newTodos[newTodos.length - 1] : t)),
        );
      })
      .catch(() => {
        setError('Unable to add a todo');
        setTodos(prev => prev.filter(t => t.id !== tempId));
        setNewTodoTitle(title);
        focusInput();
      })
      .finally(() =>
        setSavingTodoIds(prev => prev.filter(id => id !== tempId)),
      );
  };

  // Delete Todo
  const deleteTodo = (id: number) => {
    setDeletingTodoIds(prev => [...prev, id]);

    apiDeleteTodo(id)
      .then(() => setTodos(prev => prev.filter(t => t.id !== id)))
      .catch(() => setError('Unable to delete a todo'))
      .finally(() =>
        setDeletingTodoIds(prev => prev.filter(tid => tid !== id)),
      );
  };

  // Toggle Todo
  const toggleTodo = (id: number) => {
    const todo = todos.find(t => t.id === id);

    if (!todo) {
      return;
    }

    setUpdatingTodoIds(prev => [...prev, id]);

    const updated = { ...todo, completed: !todo.completed };

    setTodos(prev => prev.map(t => (t.id === id ? updated : t)));

    apiUpdateTodo(updated)
      .then(() => {})
      .catch(() => {
        setError('Unable to toggle todo');
        setTodos(prev => prev.map(t => (t.id === id ? todo : t))); // revert
      })
      .finally(() =>
        setUpdatingTodoIds(prev => prev.filter(tid => tid !== id)),
      );
  };

  // Toggle All
  const toggleAll = () => {
    const shouldCompleteAll = !allCompleted;

    todos
      .filter(t => t.completed !== shouldCompleteAll)
      .forEach(t => toggleTodo(t.id));
  };

  // Start editing
  const startEditing = (todo: Todo) => {
    setEditingId(todo.id);
    setEditTitle(todo.title);
  };

  // Cancel editing
  const cancelEditing = () => {
    setEditingId(null);
    setEditTitle('');
  };

  // Save editing
  const saveEditing = (todo: Todo) => {
    const title = editTitle.trim();

    if (!title) {
      deleteTodo(todo.id);
      cancelEditing();

      return;
    }

    setUpdatingTodoIds(prev => [...prev, todo.id]);
    const updated = { ...todo, title };

    setTodos(prev => prev.map(t => (t.id === todo.id ? updated : t)));

    apiUpdateTodo(updated)
      .then(() => {})
      .catch(() => {
        setError('Unable to rename todo');
        setTodos(prev => prev.map(t => (t.id === todo.id ? todo : t))); // revert
      })
      .finally(() => {
        setUpdatingTodoIds(prev => prev.filter(id => id !== todo.id));
        cancelEditing();
      });
  };

  return (
    <div className="todoapp">
      <h1 className="todoapp__title">todos</h1>

      <div className="todoapp__content">
        <header className="todoapp__header">
          <button
            type="button"
            className={`todoapp__toggle-all ${allCompleted ? 'active' : ''}`}
            data-cy="ToggleAllButton"
            onClick={toggleAll}
          />

          <form onSubmit={addTodo}>
            <input
              ref={inputRef}
              data-cy="NewTodoField"
              type="text"
              className="todoapp__new-todo"
              placeholder="What needs to be done?"
              value={newTodoTitle}
              onChange={e => setNewTodoTitle(e.target.value)}
              disabled={savingTodoIds.length > 0}
            />
          </form>
        </header>

        {!loading && filteredTodos.length > 0 && (
          <section className="todoapp__main" data-cy="TodoList">
            {filteredTodos.map(todo => {
              const isSaving = savingTodoIds.includes(todo.id);
              const isDeleting = deletingTodoIds.includes(todo.id);
              const isUpdating = updatingTodoIds.includes(todo.id);
              const isEditing = editingId === todo.id;

              return (
                <div
                  key={todo.id}
                  data-cy="Todo"
                  className={`todo ${todo.completed ? 'completed' : ''} ${
                    isEditing ? 'editing' : ''
                  }`}
                >
                  <label className="todo__status-label">
                    <input
                      data-cy="TodoStatus"
                      type="checkbox"
                      className="todo__status"
                      checked={todo.completed}
                      disabled={isSaving || isDeleting || isUpdating}
                      onChange={() => toggleTodo(todo.id)}
                    />
                  </label>

                  {isEditing ? (
                    <input
                      className="todo__edit"
                      value={editTitle}
                      onChange={e => setEditTitle(e.target.value)}
                      onBlur={() => saveEditing(todo)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          saveEditing(todo);
                        }

                        if (e.key === 'Escape') {
                          cancelEditing();
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span
                      data-cy="TodoTitle"
                      className="todo__title"
                      onDoubleClick={() => startEditing(todo)}
                    >
                      {todo.title}
                    </span>
                  )}

                  <button
                    type="button"
                    className="todo__remove"
                    data-cy="TodoDelete"
                    disabled={isSaving || isDeleting || isUpdating}
                    onClick={() => deleteTodo(todo.id)}
                  >
                    ×
                  </button>

                  {(isSaving || isDeleting || isUpdating) && (
                    <div
                      data-cy="TodoLoader"
                      className="modal overlay is-active"
                    >
                      <div
                        className="
                        modal-background has-background-white-ter"
                      />
                      <div className="loader" />
                    </div>
                  )}
                </div>
              );
            })}
          </section>
        )}

        {!loading && todos.length > 0 && (
          <footer className="todoapp__footer" data-cy="Footer">
            <span className="todo-count" data-cy="TodosCounter">
              {todos.filter(todo => !todo.completed).length} items left
            </span>

            <nav className="filter" data-cy="Filter">
              <a
                href="#/"
                className={`filter__link ${filter === 'all' ? 'selected' : ''}`}
                data-cy="FilterLinkAll"
                onClick={() => setFilter('all')}
              >
                All
              </a>
              <a
                href="#/active"
                className={`filter__link ${filter === 'active' ? 'selected' : ''}`}
                data-cy="FilterLinkActive"
                onClick={() => setFilter('active')}
              >
                Active
              </a>
              <a
                href="#/completed"
                className={`filter__link ${filter === 'completed' ? 'selected' : ''}`}
                data-cy="FilterLinkCompleted"
                onClick={() => setFilter('completed')}
              >
                Completed
              </a>
            </nav>

            <button
              type="button"
              className="todoapp__clear-completed"
              data-cy="ClearCompletedButton"
              disabled={!todos.some(todo => todo.completed)}
              onClick={() =>
                todos
                  .filter(todo => todo.completed)
                  .forEach(t => deleteTodo(t.id))
              }
            >
              Clear completed
            </button>
          </footer>
        )}

        <div
          data-cy="ErrorNotification"
          className={`notification is-danger is-light has-text-weight-normal ${
            error ? '' : 'hidden'
          }`}
        >
          <button
            data-cy="HideErrorButton"
            type="button"
            className="delete"
            onClick={() => setError('')}
          />
          {error}
        </div>
      </div>
    </div>
  );
};

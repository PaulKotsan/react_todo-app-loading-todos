import { Todo } from '../types/Todo';
import { client } from '../utils/fetchClient';

export const USER_ID = 3200;

export const getTodos = () => {
  return client.get<Todo[]>(`/todos?userId=${USER_ID}`);
};

export const addTodo = (title: string) => {
  return client.post<Todo>(`/todos`, {
    userId: USER_ID,
    title,
    completed: false,
  });
};

export const deleteTodo = (id: number) => {
  return client.delete(`/todos/${id}`);
};

export const updateTodo = (todo: Todo) => {
  return client.patch(`/todos/${todo.id}`, todo);
};

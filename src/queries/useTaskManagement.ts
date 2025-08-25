import { writable } from 'svelte/store';
import { useMutation, useQueryClient } from '@tanstack/svelte-query';
import type { Task, TaskId, NewTaskData, NewCommentData } from '$lib/types/types';
import type { TaskFormData } from '$lib/components/kanban/TaskFormFields';
import {
  addTaskToProject,
  updateTaskInProject,
  deleteTaskFromProject,
  addCommentToTask,
} from '$lib/api/firebaseTask';
import { toast } from 'svelte-sonner';

export function useTaskManagement(
  tasks: Task[],
  setTasks: (tasks: Task[]) => void,
  projectId: string,
  currentUserId: string
) {
  const taskToEdit = writable<Task | null>(null);
  const taskToView = writable<Task | null>(null);
  const showDeleteConfirm = writable(false);
  const taskToDeleteId = writable<TaskId | null>(null);
  const queryClient = useQueryClient();

  const addTaskMutation = useMutation<Task, Error, { taskData: TaskFormData; columnId: string }>({
    mutationFn: (variables: { taskData: TaskFormData; columnId: string }) => {
      const newTaskPayload: NewTaskData = {
        ...variables.taskData,
        reporterId: currentUserId,
        order: tasks.filter(task => task.columnId === variables.columnId).length,
        projectId,
        createdAt: new Date().toISOString(),
      };
      return addTaskToProject(projectId, newTaskPayload, variables.columnId);
    },
    onSuccess: (newTask: Task) => {
      setTasks([...tasks, newTask]);
      toast.success(`"${newTask.title}" has been added.`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: Error) => {
      console.error("Error adding task:", error);
      toast.error(error instanceof Error ? error.message : "Could not add task.");
    }
  });

  const handleAddTask = async (taskData: TaskFormData, columnId: string) => {
    await addTaskMutation.mutateAsync({ taskData, columnId });
  };

  const editTaskMutation = useMutation<Task, Error, { taskId: string; taskData: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>> }>({
    mutationFn: ({ taskId, taskData }: { taskId: string; taskData: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>> }) => 
      updateTaskInProject(projectId, taskId, taskData),
    onSuccess: (updatedTask: Task, variables: { taskId: string; taskData: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>> }) => {
      setTasks(tasks.map(task => task.id === variables.taskId ? { ...task, ...updatedTask } : task));
      taskToEdit.set(null);
      toast.success(`"${updatedTask.title}" has been updated.`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: Error) => {
      console.error("Error updating task:", error);
      toast.error(error instanceof Error ? error.message : "Could not update task.");
    }
  });

  const handleEditTask = async (taskId: string, taskData: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>) => {
    await editTaskMutation.mutateAsync({ taskId, taskData });
  };

  const handleUpdateTask = async (taskId: string, updatedFields: Partial<Task>) => {
    try {
      const updatedTask = await updateTaskInProject(projectId, taskId, updatedFields);
      setTasks(tasks.map(task => task.id === taskId ? { ...task, ...updatedTask } : task));
      toast.success(`Task updated.`);
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error(error instanceof Error ? error.message : "Could not update task.");
    }
  };

  const deleteTaskMutation = useMutation<void, Error, TaskId>({
    mutationFn: (taskId: TaskId) => deleteTaskFromProject(projectId, taskId),
    onSuccess: (_: void, taskId: TaskId) => {
      const task = tasks.find(t => t.id === taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      if (task) toast.success(`"${task.title}" has been deleted.`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: (error: Error) => {
      console.error("Error deleting task:", error);
      toast.error(error instanceof Error ? error.message : "Could not delete task.");
    }
  });

  const handleDeleteTask = async (taskId: TaskId) => {
    await deleteTaskMutation.mutateAsync(taskId);
  };

  const handleAddComment = async (taskId: string, commentData: NewCommentData) => {
    try {
      const newComment = await addCommentToTask(projectId, taskId, commentData);
      setTasks(tasks.map(task => {
        if (task.id === taskId) {
          return { ...task, comments: [...(task.comments || []), newComment] };
        }
        return task;
      }));
      toast.success("Comment Added");
    } catch (error) {
      console.error("Error adding comment:", error);
      toast.error(error instanceof Error ? error.message : "Could not add comment.");
    }
  };

  return {
    taskToEdit,
    setTaskToEdit: taskToEdit.set,
    taskToView,
    setTaskToView: taskToView.set,
    showDeleteConfirm,
    setShowDeleteConfirm: showDeleteConfirm.set,
    taskToDeleteId,
    setTaskToDeleteId: taskToDeleteId.set,
    handleAddTask,
    handleEditTask,
    handleUpdateTask,
    handleDeleteTask,
    handleAddComment,
  };
}
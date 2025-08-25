import { writable, get } from 'svelte/store'; // <-- Make sure 'get' is imported
import { createMutation, useQueryClient } from '@tanstack/svelte-query';
import type { Task, TaskId, NewTaskData, NewCommentData, Comment } from '$lib/types/types';
// This assumes you have moved TaskFormData to your types file as discussed
import type { TaskFormData } from '$lib/types/types'; 
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

  const addTaskMutation = createMutation<Task, Error, { taskData: TaskFormData; columnId: string }>({
    mutationFn: (variables) => {
      const newTaskPayload: NewTaskData = {
        ...variables.taskData,
        reporterId: currentUserId,
        order: tasks.filter(task => task.columnId === variables.columnId).length,
        projectId,
        createdAt: new Date().toISOString(),
      };
      return addTaskToProject(projectId, newTaskPayload, variables.columnId);
    },
    onSuccess: (newTask) => {
      setTasks([...tasks, newTask]);
      toast.success(`"${newTask.title}" has been added.`);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: (error) => {
      console.error("Error adding task:", error);
      toast.error(error.message || "Could not add task.");
    }
  });

  const editTaskMutation = createMutation<Task, Error, { taskId: string; taskData: Partial<Task> }>({
    mutationFn: ({ taskId, taskData }) => 
      updateTaskInProject(projectId, taskId, taskData),
    onSuccess: (updatedTask, variables) => {
      setTasks(tasks.map(task => task.id === variables.taskId ? { ...task, ...updatedTask } : task));
      taskToEdit.set(null);
      toast.success(`"${updatedTask.title}" has been updated.`);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: (error) => {
      console.error("Error updating task:", error);
      toast.error(error.message || "Could not update task.");
    }
  });
  
  const deleteTaskMutation = createMutation<void, Error, TaskId>({
    mutationFn: (taskId) => deleteTaskFromProject(projectId, taskId),
    onSuccess: (_, taskId) => {
      const task = tasks.find(t => t.id === taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
      if (task) toast.success(`"${task.title}" has been deleted.`);
      queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
    },
    onError: (error) => {
      console.error("Error deleting task:", error);
      toast.error(error.message || "Could not delete task.");
    }
  });

  const addCommentMutation = createMutation<Comment, Error, { taskId: string; commentData: NewCommentData }>({
      mutationFn: ({ taskId, commentData }) => addCommentToTask(projectId, taskId, commentData),
      onSuccess: (newComment, { taskId }) => {
        setTasks(tasks.map(task => 
            task.id === taskId 
                ? { ...task, comments: [...(task.comments || []), newComment] } 
                : task
        ));
        toast.success("Comment Added");
        queryClient.invalidateQueries({ queryKey: ['tasks', projectId] });
      },
      onError: (error) => {
        console.error("Error adding comment:", error);
        toast.error(error.message || "Could not add comment.");
      }
  });

  // --- Handler Functions ---

  const handleAddTask = async (taskData: TaskFormData, columnId: string) => {
    // Use get() to access the store's value because we are in a .ts file
    await get(addTaskMutation).mutateAsync({ taskData, columnId });
  };

  const handleEditTask = async (taskId: string, taskData: Partial<Task>) => {
    // Use get() to access the store's value
    await get(editTaskMutation).mutateAsync({ taskId, taskData });
  };

  const handleUpdateTask = handleEditTask;

  const handleDeleteTask = async (taskId: TaskId) => {
    // Use get() to access the store's value
    await get(deleteTaskMutation).mutateAsync(taskId);
  };

  const handleAddComment = async (taskId: string, commentData: NewCommentData) => {
    // Use get() to access the store's value
    await get(addCommentMutation).mutateAsync({ taskId, commentData });
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
    addTaskMutation,
    editTaskMutation,
    deleteTaskMutation,
    addCommentMutation,
    handleAddTask,
    handleEditTask,
    handleUpdateTask,
    handleDeleteTask,
    handleAddComment,
  };
}

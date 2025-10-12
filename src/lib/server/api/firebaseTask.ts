import { db } from '$lib/server/firebase';
import type { Task, NewTaskData, ColumnId, ProjectDocument, Comment, NewCommentData, TaskId, UserId, Project, Team } from '$lib/types/types';
import { v4 as uuidv4 } from 'uuid';
import { guardTaskManagement } from '$lib/auth/permissions';
import { getTeam } from '$lib/server/api/firebaseTeam';

// Server-side Task Functions using Firebase Admin SDK
export const addTaskToProject = async (projectId: string, taskData: NewTaskData, columnId: ColumnId, currentUserUid: string): Promise<Task> => {
  const firestore = db();
  if (!firestore) {
    throw new Error("Firebase Firestore not initialized");
  }
  
  if (!currentUserUid) {
    throw new Error("User must be authenticated to add tasks.");
  }

  const projectRef = firestore.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const project = projectDoc.data() as Project;
    
    // Check task management permissions
    let team: Team | undefined;
    if (project.teamId) {
      team = await getTeam(project.teamId) || undefined;
    }
    
    try {
      guardTaskManagement(currentUserUid as UserId, project, team);
    } catch (error) {
      throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot manage tasks in this project'}`);
    }
    
    const newTaskId = uuidv4();

    const newTask: Task = {
      title: taskData.title,
      description: taskData.description === undefined || taskData.description === '' ? null : taskData.description,
      priority: taskData.priority,
      assigneeUids: taskData.assigneeUids === undefined ? [] : taskData.assigneeUids,
      reporterId: taskData.reporterId === undefined ? null : taskData.reporterId,
      dueDate: taskData.dueDate === undefined || taskData.dueDate === '' ? null : taskData.dueDate,
      tags: taskData.tags === undefined ? [] : taskData.tags,
      id: newTaskId,
      projectId: projectId,
      columnId: columnId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      order: 0,
      comments: []
    };

    const projectData = projectDoc.data() as ProjectDocument;
    const currentTasks = projectData.tasks || [];
    
    // Calculate the order for the new task (highest order in the column + 1)
    const tasksInColumn = currentTasks.filter(task => task.columnId === columnId);
    const maxOrder = tasksInColumn.length > 0 ? Math.max(...tasksInColumn.map(task => task.order)) : -1;
    newTask.order = maxOrder + 1;

    // Add the new task to the project
    const updatedTasks = [...currentTasks, { ...newTask, columnId }];
    
    await projectRef.update({
      tasks: updatedTasks
    });

    return newTask;
  } catch (error) {
    console.error('Error adding task to project:', error);
    throw error;
  }
};

export const updateTaskInProject = async (projectId: string, taskId: string, taskUpdateData: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>, currentUserUid: string): Promise<Task> => {
  const firestore = db();
  if (!firestore) {
    throw new Error("Firebase Firestore not initialized");
  }

  if (!currentUserUid) {
    throw new Error("User must be authenticated to update tasks.");
  }

  const projectRef = firestore.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const project = projectDoc.data() as Project;
    const currentTasks = project.tasks || [];

    const taskIndex = currentTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) throw new Error('Task not found');

    // Check task management permissions
    let team: Team | undefined;
    if (project.teamId) {
      team = await getTeam(project.teamId) || undefined;
    }

    try {
      guardTaskManagement(currentUserUid as UserId, project, team);
    } catch (error) {
      throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot manage tasks in this project'}`);
    }

    const existingTask = currentTasks[taskIndex];

    // Create updated task object
    const updatedTask = {
      ...existingTask,
      ...taskUpdateData,
      updatedAt: new Date().toISOString(),
    };

    // Handle array fields to ensure they are empty arrays if undefined
    if (taskUpdateData.assigneeUids !== undefined) {
      updatedTask.assigneeUids = taskUpdateData.assigneeUids || [];
    }
    if (taskUpdateData.tags !== undefined) {
      updatedTask.tags = taskUpdateData.tags || [];
    }

    // Ensure optional string fields are handled properly
    if (taskUpdateData.description === '') updatedTask.description = null;
    if (taskUpdateData.dueDate === '') updatedTask.dueDate = null;
    if (taskUpdateData.reporterId === '') updatedTask.reporterId = null;

    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = updatedTask;

    await projectRef.update({
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });

    return updatedTask;
  } catch (error) {
    console.error('Error updating task in project:', error);
    throw error;
  }
};

export const deleteTaskFromProject = async (projectId: string, taskId: string, currentUserUid: string): Promise<void> => {
  const firestore = db();
  if (!firestore) {
    throw new Error("Firebase Firestore not initialized");
  }

  if (!currentUserUid) {
    throw new Error("User must be authenticated to delete tasks.");
  }

  const projectRef = firestore.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const projectData = projectDoc.data() as ProjectDocument;

    // Check if the current user is the project owner (only project managers can delete tasks)
    if (projectData.ownerId !== currentUserUid) {
      throw new Error('Only the project owner can delete tasks');
    }

    const currentTasks = projectData.tasks || [];

    const updatedTasks = currentTasks.filter(task => task.id !== taskId);

    await projectRef.update({
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting task from project:', error);
    throw error;
  }
};

export const moveTaskInProject = async (projectId: string, taskId: string, newColumnId: ColumnId, newOrder: number, currentUserUid: string): Promise<void> => {
  const firestore = db();
  if (!firestore) {
    throw new Error("Firebase Firestore not initialized");
  }
  
  if (!currentUserUid) {
    throw new Error("User must be authenticated to move tasks.");
  }

  const projectRef = firestore.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const project = projectDoc.data() as Project;
    
    // Check task management permissions
    let team: Team | undefined;
    if (project.teamId) {
      team = await getTeam(project.teamId) || undefined;
    }
    
    try {
      guardTaskManagement(currentUserUid as UserId, project, team);
    } catch (error) {
      throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot manage tasks in this project'}`);
    }
    const taskToMoveIndex = project.tasks.findIndex(t => t.id === taskId);
    if (taskToMoveIndex === -1) throw new Error('Task not found');

    const taskToMove = project.tasks[taskToMoveIndex];

    // Remove task from its current position
    const updatedTasks = project.tasks.filter(t => t.id !== taskId);

    // Adjust order for tasks in the old column that were after the moved task
    updatedTasks.filter(t => t.columnId === taskToMove.columnId && t.order > taskToMove.order)
      .forEach(t => t.order--);

    // Update the moved task's column and order
    taskToMove.columnId = newColumnId;
    taskToMove.order = newOrder;

    // Adjust order for tasks in the new column to make space for the moved task
    updatedTasks.filter(t => t.columnId === newColumnId && t.order >= newOrder)
      .forEach(t => t.order++);

    // Insert the moved task into its new position
    updatedTasks.push(taskToMove);

    await projectRef.update({
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error moving task in project:', error);
    throw error;
  }
};

export const addCommentToTask = async (projectId: string, taskId: TaskId, commentData: NewCommentData, currentUserUid: string): Promise<Comment> => {
  const firestore = db();
  if (!firestore) {
    throw new Error("Firebase Firestore not initialized");
  }
  
  if (!currentUserUid) {
    throw new Error("User must be authenticated to add comments.");
  }

  const projectRef = firestore.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const project = projectDoc.data() as ProjectDocument;
    const taskIndex = project.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) throw new Error('Task not found');

    const newComment: Comment = {
      id: uuidv4(),
      userId: currentUserUid,
      userName: commentData.userName,
      ...(commentData.avatarUrl && { avatarUrl: commentData.avatarUrl }),
      content: commentData.content,
      createdAt: new Date().toISOString(),
    };

    const updatedTasks = [...project.tasks];
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      comments: [...(updatedTasks[taskIndex].comments || []), newComment],
      updatedAt: new Date().toISOString(),
    };

    await projectRef.update({
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
    return newComment;
  } catch (error) {
    console.error('Error adding comment to task:', error);
    throw error;
  }
};

export const updateCommentInTask = async (projectId: string, taskId: TaskId, commentId: string, newContent: string, currentUserUid: string): Promise<void> => {
  const firestore = db();
  if (!firestore) {
    throw new Error("Firebase Firestore not initialized");
  }

  if (!currentUserUid) {
    throw new Error("User must be authenticated to update comments.");
  }

  const projectRef = firestore.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const project = projectDoc.data() as ProjectDocument;
    const taskIndex = project.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) throw new Error('Task not found');

    const task = project.tasks[taskIndex];
    if (!task) throw new Error('Task not found in project tasks array');

    const commentIndex = (task.comments || []).findIndex(c => c.id === commentId);
    if (commentIndex === -1) throw new Error('Comment not found');

    const existingComment = (task.comments || [])[commentIndex];
    if (existingComment.userId !== currentUserUid) {
      throw new Error("Only the comment author can update their comment.");
    }

    // Check if comment is within 5-minute edit window
    const commentTime = new Date(existingComment.createdAt);
    const now = new Date();
    const minutesSinceCreation = Math.floor((now.getTime() - commentTime.getTime()) / (1000 * 60));

    if (minutesSinceCreation > 5) {
      throw new Error('Comments can only be edited within 5 minutes of posting');
    }

    const updatedComment = {
      ...existingComment,
      content: newContent,
      updatedAt: new Date().toISOString(),
    };

    const updatedTasks = [...project.tasks];
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      comments: [
        ...(updatedTasks[taskIndex].comments || []).slice(0, commentIndex),
        updatedComment,
        ...(updatedTasks[taskIndex].comments || []).slice(commentIndex + 1),
      ],
      updatedAt: new Date().toISOString(),
    };

    await projectRef.update({
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating comment in task:', error);
    throw error;
  }
};

export const deleteCommentFromTask = async (projectId: string, taskId: TaskId, commentId: string, currentUserUid: string): Promise<void> => {
  const firestore = db();
  if (!firestore) {
    throw new Error("Firebase Firestore not initialized");
  }
  
  if (!currentUserUid) {
    throw new Error("User must be authenticated to delete comments.");
  }

  const projectRef = firestore.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const project = projectDoc.data() as ProjectDocument;
    const taskIndex = project.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) throw new Error('Task not found');

    const task = project.tasks[taskIndex];
    if (!task) throw new Error('Task not found in project tasks array');

    const commentIndex = (task.comments || []).findIndex(c => c.id === commentId);
    if (commentIndex === -1) throw new Error('Comment not found');

    const existingComment = (task.comments || [])[commentIndex];
    if (existingComment.userId !== currentUserUid) {
      throw new Error("Only the comment author can delete their comment.");
    }

    // Check if comment is within 5-minute delete window
    const commentTime = new Date(existingComment.createdAt);
    const now = new Date();
    const minutesSinceCreation = Math.floor((now.getTime() - commentTime.getTime()) / (1000 * 60));

    if (minutesSinceCreation > 5) {
      throw new Error('Comments can only be deleted within 5 minutes of posting');
    }

    const updatedTasks = [...project.tasks];
    updatedTasks[taskIndex] = {
      ...updatedTasks[taskIndex],
      comments: (task.comments || []).filter(c => c.id !== commentId),
      updatedAt: new Date().toISOString(),
    };

    await projectRef.update({
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting comment from task:', error);
    throw error;
  }
};
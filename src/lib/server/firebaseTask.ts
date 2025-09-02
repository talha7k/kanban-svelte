import { db } from '$lib/server/firebase';
import type { Task, NewTaskData, ColumnId, ProjectDocument, Comment, NewCommentData, TaskId, UserId, Project, Team } from '$lib/types/types';
import { v4 as uuidv4 } from 'uuid';
import { guardTaskManagement } from '$lib/auth/permissions';
import { getTeam } from '$lib/server/firebaseTeam';

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

export const updateTaskInProject = async (projectId: string, taskId: string, taskUpdateData: Partial<Omit<Task, 'id' | 'projectId' | 'createdAt'>>): Promise<Task> => {
  const firestore = db();
  if (!firestore) {
    throw new Error("Firebase Firestore not initialized");
  }

  const projectRef = firestore.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const projectData = projectDoc.data() as ProjectDocument;
    const currentTasks = projectData.tasks || [];
    
    const taskIndex = currentTasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) throw new Error('Task not found');

    const updatedTask = {
      ...currentTasks[taskIndex],
      ...taskUpdateData
    };

    const updatedTasks = [...currentTasks];
    updatedTasks[taskIndex] = updatedTask;
    
    await projectRef.update({
      tasks: updatedTasks
    });

    return updatedTask;
  } catch (error) {
    console.error('Error updating task in project:', error);
    throw error;
  }
};

export const deleteTaskFromProject = async (projectId: string, taskId: string): Promise<void> => {
  const firestore = db();
  if (!firestore) {
    throw new Error("Firebase Firestore not initialized");
  }

  const projectRef = firestore.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const projectData = projectDoc.data() as ProjectDocument;
    const currentTasks = projectData.tasks || [];
    
    const updatedTasks = currentTasks.filter(task => task.id !== taskId);
    
    await projectRef.update({
      tasks: updatedTasks
    });
  } catch (error) {
    console.error('Error deleting task from project:', error);
    throw error;
  }
};
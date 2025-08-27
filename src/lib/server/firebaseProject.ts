import { db } from '$lib/server/firebase';
import type { Project } from '$lib/types/types';
import { v4 as uuidv4 } from 'uuid';

// Server-side Project Functions using Firebase Admin

export const getProjectByIdServer = async (projectId: string): Promise<Project | null> => {
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  try {
    const projectRef = db.collection('projects').doc(projectId);
    const projectSnap = await projectRef.get();
    if (projectSnap.exists) {
      return { id: projectSnap.id, ...projectSnap.data() } as Project;
    }
    return null;
  } catch (error) {
    console.error("Error fetching project by ID:", error);
    throw error;
  }
};

export const addTaskToProjectServer = async (
  projectId: string, 
  taskData: any, 
  columnId: string, 
  currentUserUid: string
): Promise<any> => {
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  
  const projectRef = db.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const project = projectDoc.data();
    const newTaskId = uuidv4();

    const newTask = {
      id: newTaskId,
      title: taskData.title,
      description: taskData.description || null,
      priority: taskData.priority || 'MEDIUM',
      assigneeUids: taskData.assigneeUids || [],
      reporterId: taskData.reporterId || currentUserUid,
      dueDate: taskData.dueDate || null,
      tags: taskData.tags || [],
      dependentTaskTitles: taskData.dependentTaskTitles || [],
      columnId,
      order: project?.tasks?.length || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedTasks = [...(project?.tasks || []), newTask];
    
    await projectRef.update({
      tasks: updatedTasks,
      updatedAt: new Date().toISOString()
    });

    return newTask;
  } catch (error) {
    console.error('Error adding task to project:', error);
    throw error;
  }
};

export const moveTaskInProjectServer = async (
  projectId: string,
  taskId: string,
  newColumnId: string,
  newOrder: number,
  currentUserUid: string
): Promise<void> => {
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  
  const projectRef = db.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
      throw new Error('Project not found');
    }

    const project = projectDoc.data();
    let tasks = [...(project?.tasks || [])];
    
    const taskToMoveIndex = tasks.findIndex((t: any) => t.id === taskId);
    if (taskToMoveIndex === -1) {
      throw new Error('Task not found');
    }

    const taskToMove = tasks[taskToMoveIndex];

    // Update the moved task's properties with the exact order from client
    taskToMove.columnId = newColumnId;
    taskToMove.order = newOrder;
    taskToMove.updatedAt = new Date().toISOString();

    // Update the task in the array (no need to remove and re-add)
    tasks[taskToMoveIndex] = taskToMove;

    await projectRef.update({
      tasks: tasks,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error moving task in project:', error);
    throw error;
  }
};
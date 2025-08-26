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
    if (!projectDoc.exists) throw new Error('Project not found');

    const project = projectDoc.data();
    const tasks = project?.tasks || [];
    
    const taskToMoveIndex = tasks.findIndex((t: any) => t.id === taskId);
    if (taskToMoveIndex === -1) throw new Error('Task not found');

    const taskToMove = tasks[taskToMoveIndex];
    const oldColumnId = taskToMove.columnId;

    // Create a new tasks array
    let updatedTasks = [...tasks];

    // Remove the task from its current position
    updatedTasks.splice(taskToMoveIndex, 1);

    // Update the moved task's column and order
    taskToMove.columnId = newColumnId;
    taskToMove.order = newOrder;
    taskToMove.updatedAt = new Date().toISOString();

    // Adjust order for tasks in the old column that were after the moved task
    updatedTasks.forEach((task: any) => {
      if (task.columnId === oldColumnId && task.order > taskToMove.order) {
        task.order--;
      }
    });

    // Adjust order for tasks in the new column to make space for the moved task
    updatedTasks.forEach((task: any) => {
      if (task.columnId === newColumnId && task.order >= newOrder) {
        task.order++;
      }
    });

    // Insert the moved task into its new position
    updatedTasks.push(taskToMove);

    // Ensure all orders are sequential within each column
    const columns = ['TODO', 'IN_PROGRESS', 'DONE'];
    columns.forEach(columnId => {
      const columnTasks = updatedTasks
        .filter((task: any) => task.columnId === columnId)
        .sort((a: any, b: any) => a.order - b.order);
      
      columnTasks.forEach((task: any, index: number) => {
        task.order = index;
      });
    });

    await projectRef.update({
      tasks: updatedTasks,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error moving task in project:', error);
    throw error;
  }
};
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
    const oldColumnId = taskToMove.columnId;

    // Remove the task from its current position
    tasks.splice(taskToMoveIndex, 1);

    // Update the moved task's properties
    taskToMove.columnId = newColumnId;
    taskToMove.order = newOrder;
    taskToMove.updatedAt = new Date().toISOString();

    // Insert the task back into the array
    tasks.push(taskToMove);

    // Reorder tasks in the old column (if different from new column)
    if (oldColumnId !== newColumnId) {
      tasks
        .filter((t: any) => t.columnId === oldColumnId && t.order > taskToMove.order)
        .forEach((t: any) => t.order--);
    }

    // Reorder tasks in the new column
    const newColumnTasks = tasks
      .filter((t: any) => t.columnId === newColumnId)
      .sort((a: any, b: any) => a.order - b.order);

    // Adjust orders to make space for the moved task
    newColumnTasks.forEach((task: any, index: number) => {
      if (task.id !== taskId && task.order >= newOrder) {
        task.order = task.order + 1;
      }
    });

    // Ensure sequential ordering within each column
    const columns = ['TODO', 'IN_PROGRESS', 'DONE'];
    columns.forEach(columnId => {
      const columnTasks = tasks
        .filter((task: any) => task.columnId === columnId)
        .sort((a: any, b: any) => a.order - b.order);
      
      columnTasks.forEach((task: any, index: number) => {
        if (task.order !== index) {
          task.order = index;
        }
      });
    });

    await projectRef.update({
      tasks: tasks,
      updatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error moving task in project:', error);
    throw error;
  }
};
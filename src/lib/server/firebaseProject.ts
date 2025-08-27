import { db } from '$lib/server/firebase';
import type { Project, UserId, Team } from '$lib/types/types';
import { v4 as uuidv4 } from 'uuid';
import { guardTaskManagement } from '$lib/auth/permissions';

// Server-side Project Functions using Firebase Admin

export const getProjectByIdServer = async (projectId: string): Promise<Project | null> => {
  console.log('getProjectByIdServer called with:', projectId);
  
  const firestore = db(); // This will call the getter function and throw if not initialized
  
  try {
    console.log('Creating Firestore reference for project:', projectId);
    const projectRef = firestore.collection('projects').doc(projectId);
    
    console.log('Fetching project document...');
    const projectSnap = await projectRef.get();
    
    console.log('Project document exists:', projectSnap.exists);
    
    if (projectSnap.exists) {
      const projectData = { id: projectSnap.id, ...projectSnap.data() } as Project;
      console.log('Project data retrieved successfully:', projectData.id);
      return projectData;
    }
    
    console.log('Project not found:', projectId);
    return null;
  } catch (error) {
    console.error("Error fetching project by ID:", error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
    throw error;
  }
};

export const addTaskToProjectServer = async (
  projectId: string, 
  taskData: any, 
  columnId: string, 
  currentUserUid: string
): Promise<any> => {
  const firestore = db(); // This will call the getter function and throw if not initialized
  
  const projectRef = firestore.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const project = { id: projectDoc.id, ...projectDoc.data() } as Project;
    
    // Check task management permissions
    let team: Team | undefined;
    if (project.teamId) {
      // For server-side, we need to fetch team data from Firestore
      const teamRef = firestore.collection('teams').doc(project.teamId);
      const teamDoc = await teamRef.get();
      if (teamDoc.exists) {
        team = { id: teamDoc.id, ...teamDoc.data() } as Team;
      }
    }
    
    try {
      guardTaskManagement(currentUserUid as UserId, project, team);
    } catch (error) {
      throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot manage tasks in this project'}`);
    }
    
    const projectData = projectDoc.data();
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
  const firestore = db(); // This will call the getter function and throw if not initialized
  
  const projectRef = firestore.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) {
      throw new Error('Project not found');
    }

    const project = { id: projectDoc.id, ...projectDoc.data() } as Project;
    
    // Check task management permissions
    let team: Team | undefined;
    if (project.teamId) {
      // For server-side, we need to fetch team data from Firestore
      const teamRef = firestore.collection('teams').doc(project.teamId);
      const teamDoc = await teamRef.get();
      if (teamDoc.exists) {
        team = { id: teamDoc.id, ...teamDoc.data() } as Team;
      }
    }
    
    try {
      guardTaskManagement(currentUserUid as UserId, project, team);
    } catch (error) {
      throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot manage tasks in this project'}`);
    }
    
    const projectData = projectDoc.data();
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
import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
import { auth as adminAuth, db as adminDb } from '$lib/server/firebase';
import type { Column, ColumnId, UserId, Project, Team } from '$lib/types/types';
import { v4 as uuidv4 } from 'uuid';
import { guardTaskManagement } from '$lib/auth/permissions';
import { getTeam } from '$lib/server/api/firebaseTeam';

// Column Functions
export const addColumnToProject = async (
  projectId: string,
  columnData: Omit<Column, 'id'>,
  currentUserUid?: string
): Promise<Column> => {
  if (!adminDb) {
    throw new Error("Firebase Firestore not initialized");
  }

  // For server actions, currentUserUid is passed as parameter
  // For client-side calls, use auth.currentUser
  if (!adminAuth) {
    throw new Error("Firebase auth not initialized");
  }
  const userUid = currentUserUid;
  if (!userUid) {
    throw new Error("User must be authenticated to add columns.");
  }

  const db = adminDb();
  const projectRef = db.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const project = projectDoc.data() as Project;

    // Check task management permissions (columns are part of task management)
    let team: Team | undefined;
    if (project.teamId) {
      team = await getTeam(project.teamId) || undefined;
    }

    try {
      guardTaskManagement(userUid as UserId, project, team);
    } catch (error) {
      throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot manage columns in this project'}`);
    }

    const newColumnId = uuidv4();
    const newColumn: Column = {
      ...columnData,
      id: newColumnId,
    };

    await projectRef.update({
      columns: FieldValue.arrayUnion(newColumn),
      updatedAt: new Date().toISOString(),
    });

    return newColumn;
  } catch (error) {
    console.error('Error adding column to project:', error);
    throw error;
  }
};

export const updateColumnInProject = async (
  projectId: string,
  columnId: string,
  columnUpdateData: Partial<Omit<Column, 'id'>>,
  currentUserUid: string
): Promise<Column> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }

  if (!currentUserUid) {
    throw new Error("User must be authenticated to update columns.");
  }

  const projectRef = db.collection('projects').doc(projectId);
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
      throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot manage columns in this project'}`);
    }

    const columnIndex = project.columns?.findIndex(col => col.id === columnId);
    if (columnIndex === undefined || columnIndex === -1) throw new Error('Column not found');

    const existingColumn = project.columns![columnIndex];

    const updatedColumn: Column = {
      ...existingColumn,
      ...columnUpdateData,
    };

    const updatedColumns = [...(project.columns || [])];
    updatedColumns[columnIndex] = updatedColumn;

    await projectRef.update({
      columns: updatedColumns,
      updatedAt: new Date().toISOString(),
    });

    return updatedColumn;
  } catch (error) {
    console.error('Error updating column in project:', error);
    throw error;
  }
};

export const deleteColumnFromProject = async (
  projectId: string,
  columnId: string,
  currentUserUid: string,
  targetColumnId?: string
): Promise<void> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }

  if (!currentUserUid) {
    throw new Error("User must be authenticated to delete columns.");
  }

  const projectRef = db.collection('projects').doc(projectId);
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
      throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot manage columns in this project'}`);
    }

    // Check if this is the last column
    if (project.columns?.length === 1) {
      throw new Error('Cannot delete the last column. Projects must have at least one column.');
    }

    // Check if any tasks are in this column
    const tasksInColumn = project.tasks.filter(task => task.columnId === columnId);
    if (tasksInColumn.length > 0) {
      if (!targetColumnId) {
        throw new Error(`Cannot delete column with ${tasksInColumn.length} task(s). Please specify a target column to move tasks to.`);
      }

      // Verify target column exists
      const targetColumnExists = project.columns?.some(col => col.id === targetColumnId);
      if (!targetColumnExists) {
        throw new Error('Target column not found.');
      }

      // Move tasks to target column
      const updatedTasks = project.tasks.map(task => {
        if (task.columnId === columnId) {
          return { ...task, columnId: targetColumnId };
        }
        return task;
      });

      // Update task orders in target column
      const targetColumnTasks = updatedTasks.filter(task => task.columnId === targetColumnId);
      targetColumnTasks.forEach((task, index) => {
        task.order = index;
      });

      await projectRef.update({
        tasks: updatedTasks,
        columns: (project.columns || []).filter(col => col.id !== columnId),
        updatedAt: new Date().toISOString(),
      });
    } else {
      // No tasks in column, safe to delete
      await projectRef.update({
        columns: (project.columns || []).filter(col => col.id !== columnId),
        updatedAt: new Date().toISOString(),
      });
    }
  } catch (error) {
    console.error('Error deleting column from project:', error);
    throw error;
  }
};

export const reorderColumnsInProject = async (
  projectId: string,
  columnIds: ColumnId[],
  currentUserUid: string
): Promise<void> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }

  if (!currentUserUid) {
    throw new Error("User must be authenticated to reorder columns.");
  }

  const projectRef = db.collection('projects').doc(projectId);
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
      throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot manage columns in this project'}`);
    }

    const reorderedColumns = columnIds.map((id, index) => {
      const column = project.columns?.find(col => col.id === id);
      if (!column) throw new Error(`Column ${id} not found`);
      return { ...column, order: index };
    });

    await projectRef.update({
      columns: reorderedColumns,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error reordering columns in project:', error);
    throw error;
  }
};
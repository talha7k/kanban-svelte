import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { auth as adminAuth, db as adminDb } from '$lib/server/firebase';
import type { CardType, CardTypeId, UserId, Project, Team } from '$lib/types/types';
import { v4 as uuidv4 } from 'uuid';
import { guardTaskManagement } from '$lib/auth/permissions';
import { getTeam } from '$lib/api/firebaseTeam';

// Card Type Functions
export const addCardTypeToProject = async (
  projectId: string,
  cardTypeData: Omit<CardType, 'id' | 'createdAt' | 'updatedAt'>,
  currentUserUid?: string,
  team?: Team
): Promise<CardType> => {
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }

  // For server actions, currentUserUid is passed as parameter
  // For client-side calls, use auth.currentUser
  if (!auth) {
    throw new Error("Firebase auth not initialized");
  }
  const userUid = currentUserUid || auth.currentUser?.uid;
  if (!userUid) {
    throw new Error("User must be authenticated to add card types.");
  }

  const projectRef = doc(db, 'projects', projectId);
  try {
    const projectDoc = await getDoc(projectRef);
    if (!projectDoc.exists()) throw new Error('Project not found');

    const project = projectDoc.data() as Project;

    // Check task management permissions (card types are part of task management)
    let teamData: Team | undefined = team;
    if (!teamData && project.teamId) {
      teamData = await getTeam(project.teamId) || undefined;
    }

    try {
      guardTaskManagement(userUid as UserId, project, teamData);
    } catch (error) {
      throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot manage card types in this project'}`);
    }

    const newCardTypeId = uuidv4();
    const newCardType: CardType = {
      ...cardTypeData,
      id: newCardTypeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const currentCardTypes = project.cardTypes || [];
    await updateDoc(projectRef, {
      cardTypes: [...currentCardTypes, newCardType],
      updatedAt: new Date().toISOString(),
    });

    return newCardType;
  } catch (error) {
    console.error('Error adding card type to project:', error);
    throw error;
  }
};

export const updateCardTypeInProject = async (
  projectId: string,
  cardTypeId: string,
  cardTypeUpdateData: Partial<Omit<CardType, 'id' | 'createdAt'>>
): Promise<CardType> => {
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  if (!auth) {
    throw new Error("Firebase auth not initialized");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User must be authenticated to update card types.");
  }

  const projectRef = doc(db, 'projects', projectId);
  try {
    const projectDoc = await getDoc(projectRef);
    if (!projectDoc.exists()) throw new Error('Project not found');

    const project = projectDoc.data() as Project;

    // Check task management permissions
    let team: Team | undefined;
    if (project.teamId) {
      team = await getTeam(project.teamId) || undefined;
    }

    try {
      guardTaskManagement(currentUser.uid as UserId, project, team);
    } catch (error) {
      throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot manage card types in this project'}`);
    }

    const cardTypeIndex = project.cardTypes?.findIndex(ct => ct.id === cardTypeId);
    if (cardTypeIndex === undefined || cardTypeIndex === -1) throw new Error('Card type not found');

    const existingCardType = project.cardTypes![cardTypeIndex];

    const updatedCardType: CardType = {
      ...existingCardType,
      ...cardTypeUpdateData,
      updatedAt: new Date().toISOString(),
    };

    const updatedCardTypes = [...(project.cardTypes || [])];
    updatedCardTypes[cardTypeIndex] = updatedCardType;

    await updateDoc(projectRef, {
      cardTypes: updatedCardTypes,
      updatedAt: new Date().toISOString(),
    });

    return updatedCardType;
  } catch (error) {
    console.error('Error updating card type in project:', error);
    throw error;
  }
};

export const deleteCardTypeFromProject = async (
  projectId: string,
  cardTypeId: string
): Promise<void> => {
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  if (!auth) {
    throw new Error("Firebase auth not initialized");
  }

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User must be authenticated to delete card types.");
  }

  const projectRef = doc(db, 'projects', projectId);
  try {
    const projectDoc = await getDoc(projectRef);
    if (!projectDoc.exists()) throw new Error('Project not found');

    const project = projectDoc.data() as Project;

    // Check task management permissions
    let team: Team | undefined;
    if (project.teamId) {
      team = await getTeam(project.teamId) || undefined;
    }

    try {
      guardTaskManagement(currentUser.uid as UserId, project, team);
    } catch (error) {
      throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot manage card types in this project'}`);
    }

    // Check if any tasks are using this card type
    const tasksUsingType = project.tasks.filter(task => task.cardTypeId === cardTypeId);
    if (tasksUsingType.length > 0) {
      throw new Error(`Cannot delete card type. ${tasksUsingType.length} task(s) are using this card type. Please reassign or delete these tasks first.`);
    }

    const updatedCardTypes = (project.cardTypes || []).filter(ct => ct.id !== cardTypeId);

    await updateDoc(projectRef, {
      cardTypes: updatedCardTypes,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting card type from project:', error);
    throw error;
  }
};

export const reorderCardTypesInProject = async (projectId: string, cardTypeIds: string[], currentUserUid: string): Promise<void> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }

  if (!currentUserUid) {
    throw new Error("User must be authenticated to reorder card types.");
  }

  const projectRef = db.collection('projects').doc(projectId);
  try {
    const projectDoc = await projectRef.get();
    if (!projectDoc.exists) throw new Error('Project not found');

    const project = projectDoc.data() as Project;

    // Permission check can be added here if necessary

    const reorderedCardTypes = cardTypeIds.map((id, index) => {
      const cardType = project.cardTypes?.find(ct => ct.id === id);
      if (!cardType) throw new Error(`Card type ${id} not found`);
      return { ...cardType, order: index };
    });

    await projectRef.update({
      cardTypes: reorderedCardTypes,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error reordering card types in project:', error);
    throw error;
  }
};
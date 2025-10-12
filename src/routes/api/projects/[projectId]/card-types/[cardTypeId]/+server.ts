import { json, error } from '@sveltejs/kit';
import { getProjectByIdServer } from '$lib/server/firebaseProject';
import { requireAuth } from '$lib/server/auth';
import { getTeam } from '$lib/server/firebaseTeam';
import { guardTaskManagement } from '$lib/auth/permissions';
import { db } from '$lib/server/firebase';
import type { CardType } from '$lib/types/types';

export async function PUT({ request, params }) {
  try {
    const { projectId, cardTypeId } = params;
    const updateData = await request.json();

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    // Verify project exists and user has access
    const project = await getProjectByIdServer(projectId);
    if (!project) {
      throw error(404, 'Project not found');
    }

    if (!project.memberIds?.includes(currentUserUid) && project.ownerId !== currentUserUid) {
      throw error(403, 'Access denied');
    }

    // Load team data for permissions
    let team = undefined;
    if (project.teamId) {
      team = await getTeam(project.teamId);
    }

    // Check task management permissions
    try {
      guardTaskManagement(currentUserUid, project, team);
    } catch (error) {
      throw error(403, `Permission denied: ${error instanceof Error ? error.message : 'Cannot manage card types in this project'}`);
    }

    // Find and update the card type
    const firestore = db();
    const projectRef = firestore.collection('projects').doc(projectId);

    const cardTypeIndex = project.cardTypes?.findIndex(ct => ct.id === cardTypeId);
    if (cardTypeIndex === undefined || cardTypeIndex === -1) {
      throw error(404, 'Card type not found');
    }

    const existingCardType = project.cardTypes![cardTypeIndex];
    const updatedCardType: CardType = {
      ...existingCardType,
      ...updateData,
      updatedAt: new Date().toISOString(),
    };

    const updatedCardTypes = [...(project.cardTypes || [])];
    updatedCardTypes[cardTypeIndex] = updatedCardType;

    await projectRef.update({
      cardTypes: updatedCardTypes,
      updatedAt: new Date().toISOString(),
    });

    return json({ success: true, cardType: updatedCardType });
  } catch (err) {
    console.error('Error updating card type:', err);
    const message = err instanceof Error ? err.message : 'Failed to update card type';
    throw error(500, message);
  }
}

export async function DELETE({ request, params }) {
  try {
    const { projectId, cardTypeId } = params;

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    // Verify project exists and user has access
    const project = await getProjectByIdServer(projectId);
    if (!project) {
      throw error(404, 'Project not found');
    }

    if (!project.memberIds?.includes(currentUserUid) && project.ownerId !== currentUserUid) {
      throw error(403, 'Access denied');
    }

    // Load team data for permissions
    let team = undefined;
    if (project.teamId) {
      team = await getTeam(project.teamId);
    }

    // Check task management permissions
    try {
      guardTaskManagement(currentUserUid, project, team);
    } catch (error) {
      throw error(403, `Permission denied: ${error instanceof Error ? error.message : 'Cannot manage card types in this project'}`);
    }

    // Check if any tasks are using this card type
    const tasksUsingType = project.tasks?.filter(task => task.cardTypeId === cardTypeId) || [];
    if (tasksUsingType.length > 0) {
      throw error(400, `Cannot delete card type. ${tasksUsingType.length} task(s) are using this card type. Please reassign or delete these tasks first.`);
    }

    // Delete the card type
    const firestore = db();
    const projectRef = firestore.collection('projects').doc(projectId);
    const updatedCardTypes = (project.cardTypes || []).filter(ct => ct.id !== cardTypeId);

    await projectRef.update({
      cardTypes: updatedCardTypes,
      updatedAt: new Date().toISOString(),
    });

    return json({ success: true });
  } catch (err) {
    console.error('Error deleting card type:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete card type';
    throw error(500, message);
  }
}
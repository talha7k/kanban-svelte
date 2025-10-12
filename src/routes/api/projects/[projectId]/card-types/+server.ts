import { json, error } from '@sveltejs/kit';
import { getProjectByIdServer } from '$lib/server/firebaseProject';
import { requireAuth } from '$lib/server/auth';
import { getTeam } from '$lib/server/firebaseTeam';
import { guardTaskManagement } from '$lib/auth/permissions';
import { db } from '$lib/server/firebase';
import { v4 as uuidv4 } from 'uuid';
import type { CardType } from '$lib/types/types';

export async function POST({ request, params }) {
  try {
    const { projectId } = params;
    const cardTypeData = await request.json();

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    // Validate required fields
    if (!cardTypeData.name || typeof cardTypeData.name !== 'string') {
      throw error(400, 'Card type name is required and must be a string');
    }

    if (!cardTypeData.fields || !Array.isArray(cardTypeData.fields)) {
      cardTypeData.fields = [];
    }

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

    // Create the card type
    const firestore = db();
    const projectRef = firestore.collection('projects').doc(projectId);

    const newCardTypeId = uuidv4();
    const newCardType: CardType = {
      ...cardTypeData,
      id: newCardTypeId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const currentCardTypes = project.cardTypes || [];
    await projectRef.update({
      cardTypes: [...currentCardTypes, newCardType],
      updatedAt: new Date().toISOString(),
    });

    const cardType = newCardType;

    return json({ success: true, cardType });
  } catch (err) {
    console.error('Error creating card type:', err);
    const message = err instanceof Error ? err.message : 'Failed to create card type';
    throw error(500, message);
  }
}
import { json, error } from '@sveltejs/kit';
import { addCardTypeToProject } from '$lib/api/firebaseCardType';
import { getProjectById } from '$lib/api/firebaseProject';
import { requireAuth } from '$lib/server/auth';

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
    const project = await getProjectById(projectId);
    if (!project) {
      throw error(404, 'Project not found');
    }

    if (!project.memberIds?.includes(currentUserUid) && project.ownerId !== currentUserUid) {
      throw error(403, 'Access denied');
    }

    // Create the card type
    const cardType = await addCardTypeToProject(projectId, cardTypeData, currentUserUid);

    return json({ success: true, cardType });
  } catch (err) {
    console.error('Error creating card type:', err);
    const message = err instanceof Error ? err.message : 'Failed to create card type';
    throw error(500, message);
  }
}
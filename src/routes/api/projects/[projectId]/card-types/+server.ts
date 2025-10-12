import { json, error } from '@sveltejs/kit';
import { addCardTypeToProject } from '$lib/server/api/firebaseCardType';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
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

    const cardType = await addCardTypeToProject(projectId, cardTypeData, currentUserUid);

    return json({ success: true, cardType });
  } catch (err) {
    console.error('Error creating card type:', err);
    const message = err instanceof Error ? err.message : 'Failed to create card type';
    throw error(500, message);
  }
};
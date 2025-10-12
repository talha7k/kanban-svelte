import { json, error } from '@sveltejs/kit';
import { updateCardTypeInProject, deleteCardTypeFromProject } from '$lib/server/api/firebaseCardType';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const { projectId, cardTypeId } = params;
    const updateData = await request.json();

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    const updatedCardType = await updateCardTypeInProject(projectId, cardTypeId, updateData, currentUserUid);

    return json({ success: true, cardType: updatedCardType });
  } catch (err) {
    console.error('Error updating card type:', err);
    const message = err instanceof Error ? err.message : 'Failed to update card type';
    throw error(500, message);
  }
};

export const DELETE: RequestHandler = async ({ request, params }) => {
  try {
    const { projectId, cardTypeId } = params;

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    await deleteCardTypeFromProject(projectId, cardTypeId, currentUserUid);

    return json({ success: true });
  } catch (err) {
    console.error('Error deleting card type:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete card type';
    throw error(500, message);
  }
};
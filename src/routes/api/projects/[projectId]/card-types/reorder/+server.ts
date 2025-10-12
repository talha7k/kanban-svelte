import { json, error } from '@sveltejs/kit';
import { reorderCardTypesInProject } from '$lib/server/api/firebaseCardType';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
  try {
    const { projectId } = params;
    const { cardTypeIds } = await request.json();

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    // Validate input
    if (!Array.isArray(cardTypeIds)) {
      throw error(400, 'cardTypeIds must be an array');
    }

    // Reorder the card types
    await reorderCardTypesInProject(projectId, cardTypeIds, currentUserUid);

    return json({ success: true });
  } catch (err) {
    console.error('Error reordering card types:', err);
    const message = err instanceof Error ? err.message : 'Failed to reorder card types';
    throw error(500, message);
  }
}
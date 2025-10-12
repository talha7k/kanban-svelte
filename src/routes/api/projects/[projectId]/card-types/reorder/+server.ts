import { json, error } from '@sveltejs/kit';
import { reorderCardTypesInProject } from '$lib/server/api/firebaseCardType';
import { getProjectById } from '$lib/server/api/firebaseProject';
import { requireAuth } from '$lib/server/auth';

export async function POST({ request, params }) {
  try {
    const { projectId } = params;
    const { cardTypeIds } = await request.json();

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    // Validate input
    if (!Array.isArray(cardTypeIds)) {
      throw error(400, 'cardTypeIds must be an array');
    }

    // Verify project exists and user has access
    const project = await getProjectById(projectId);
    if (!project) {
      throw error(404, 'Project not found');
    }

    if (!project.memberIds?.includes(currentUserUid) && project.ownerId !== currentUserUid) {
      throw error(403, 'Access denied');
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
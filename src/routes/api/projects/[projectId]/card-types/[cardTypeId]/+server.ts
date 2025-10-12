import { json, error } from '@sveltejs/kit';
import { deleteCardTypeFromProject } from '$lib/api/firebaseCardType';
import { getProjectById } from '$lib/api/firebaseProject';
import { requireAuth } from '$lib/server/auth';

export async function DELETE({ request, params }) {
  try {
    const { projectId, cardTypeId } = params;

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    // Verify project exists and user has access
    const project = await getProjectById(projectId);
    if (!project) {
      throw error(404, 'Project not found');
    }

    if (!project.memberIds?.includes(currentUserUid) && project.ownerId !== currentUserUid) {
      throw error(403, 'Access denied');
    }

    // Delete the card type
    await deleteCardTypeFromProject(projectId, cardTypeId);

    return json({ success: true });
  } catch (err) {
    console.error('Error deleting card type:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete card type';
    throw error(500, message);
  }
}
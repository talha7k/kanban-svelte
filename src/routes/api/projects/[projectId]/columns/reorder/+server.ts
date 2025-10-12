import { json, error } from '@sveltejs/kit';
import { reorderColumnsInProject } from '$lib/api/firebaseColumn';
import { getProjectById } from '$lib/api/firebaseProject';
import { requireAuth } from '$lib/server/auth';

export async function POST({ request, params }) {
  try {
    const { projectId } = params;
    const { columnIds } = await request.json();

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    // Validate input
    if (!Array.isArray(columnIds)) {
      throw error(400, 'columnIds must be an array');
    }

    // Verify project exists and user has access
    const project = await getProjectById(projectId);
    if (!project) {
      throw error(404, 'Project not found');
    }

    if (!project.memberIds?.includes(currentUserUid) && project.ownerId !== currentUserUid) {
      throw error(403, 'Access denied');
    }

    // Reorder the columns
    await reorderColumnsInProject(projectId, columnIds);

    return json({ success: true });
  } catch (err) {
    console.error('Error reordering columns:', err);
    const message = err instanceof Error ? err.message : 'Failed to reorder columns';
    throw error(500, message);
  }
}
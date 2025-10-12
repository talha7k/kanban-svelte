import { json, error } from '@sveltejs/kit';
import { addColumnToProject } from '$lib/api/firebaseColumn';
import { getProjectById } from '$lib/api/firebaseProject';
import { requireAuth } from '$lib/server/auth';

export async function POST({ request, params }) {
  try {
    const { projectId } = params;
    const columnData = await request.json();

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    // Validate required fields
    if (!columnData.title || typeof columnData.title !== 'string') {
      throw error(400, 'Column title is required and must be a string');
    }

    if (typeof columnData.order !== 'number') {
      throw error(400, 'Column order is required and must be a number');
    }

    // Verify project exists and user has access
    const project = await getProjectById(projectId);
    if (!project) {
      throw error(404, 'Project not found');
    }

    if (!project.memberIds?.includes(currentUserUid) && project.ownerId !== currentUserUid) {
      throw error(403, 'Access denied');
    }

    // Create the column
    const column = await addColumnToProject(projectId, columnData, currentUserUid);

    return json({ success: true, column });
  } catch (err) {
    console.error('Error creating column:', err);
    const message = err instanceof Error ? err.message : 'Failed to create column';
    throw error(500, message);
  }
}
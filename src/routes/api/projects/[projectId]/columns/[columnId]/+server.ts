import { json, error } from '@sveltejs/kit';
import { updateColumnInProject, deleteColumnFromProject } from '$lib/api/firebaseColumn';
import { getProjectById } from '$lib/api/firebaseProject';
import { requireAuth } from '$lib/server/auth';

export async function PUT({ request, params }) {
  try {
    const { projectId, columnId } = params;
    const columnUpdateData = await request.json();

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    // Validate input
    if (columnUpdateData.title !== undefined && typeof columnUpdateData.title !== 'string') {
      throw error(400, 'Column title must be a string');
    }

    if (columnUpdateData.order !== undefined && typeof columnUpdateData.order !== 'number') {
      throw error(400, 'Column order must be a number');
    }

    // Verify project exists and user has access
    const project = await getProjectById(projectId);
    if (!project) {
      throw error(404, 'Project not found');
    }

    if (!project.memberIds?.includes(currentUserUid) && project.ownerId !== currentUserUid) {
      throw error(403, 'Access denied');
    }

    // Update the column
    const updatedColumn = await updateColumnInProject(projectId, columnId, columnUpdateData);

    return json({ success: true, column: updatedColumn });
  } catch (err) {
    console.error('Error updating column:', err);
    const message = err instanceof Error ? err.message : 'Failed to update column';
    throw error(500, message);
  }
}

export async function DELETE({ request, params }) {
  try {
    const { projectId, columnId } = params;
    const url = new URL(request.url);
    const targetColumnId = url.searchParams.get('targetColumnId') || undefined;

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

    // Delete the column
    await deleteColumnFromProject(projectId, columnId, targetColumnId);

    return json({ success: true });
  } catch (err) {
    console.error('Error deleting column:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete column';
    throw error(500, message);
  }
}
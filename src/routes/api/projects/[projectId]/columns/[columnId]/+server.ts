import { json, error } from '@sveltejs/kit';
import { updateColumnInProject, deleteColumnFromProject } from '$lib/server/api/firebaseColumn';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request, params }) => {
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

    // Update the column
    const updatedColumn = await updateColumnInProject(projectId, columnId, columnUpdateData, currentUserUid);

    return json({ success: true, column: updatedColumn });
  } catch (err) {
    console.error('Error updating column:', err);
    const message = err instanceof Error ? err.message : 'Failed to update column';
    throw error(500, message);
  }
};

export const DELETE: RequestHandler = async ({ request, params }) => {
  try {
    const { projectId, columnId } = params;
    const url = new URL(request.url);
    const targetColumnId = url.searchParams.get('targetColumnId') || undefined;

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    // Delete the column
    await deleteColumnFromProject(projectId, columnId, currentUserUid, targetColumnId);

    return json({ success: true });
  } catch (err) {
    console.error('Error deleting column:', err);
    const message = err instanceof Error ? err.message : 'Failed to delete column';
    throw error(500, message);
  }
};
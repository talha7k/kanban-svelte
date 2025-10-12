import { json, error } from '@sveltejs/kit';
import { addColumnToProject } from '$lib/server/api/firebaseColumn';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
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

    // Create the column
    const column = await addColumnToProject(projectId, columnData, currentUserUid);

    return json({ success: true, column });
  } catch (err) {
    console.error('Error creating column:', err);
    const message = err instanceof Error ? err.message : 'Failed to create column';
    throw error(500, message);
  }
};
import { json, error } from '@sveltejs/kit';
import { reorderColumnsInProject } from '$lib/server/api/firebaseColumn';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
  try {
    const { projectId } = params;
    const { columnIds } = await request.json();

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    // Validate input
    if (!Array.isArray(columnIds)) {
      throw error(400, 'columnIds must be an array');
    }

    // Reorder the columns
    await reorderColumnsInProject(projectId, columnIds, currentUserUid);

    return json({ success: true });
  } catch (err) {
    console.error('Error reordering columns:', err);
    const message = err instanceof Error ? err.message : 'Failed to reorder columns';
    throw error(500, message);
  }
};
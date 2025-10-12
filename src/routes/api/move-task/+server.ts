import { json } from '@sveltejs/kit';
import { moveTaskInProject } from '$lib/server/api/firebaseProject';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Authenticate user from request headers
    const userId = await requireAuth({ request } as any);

    const { projectId, taskId, newColumnId, newOrder } = await request.json();

    if (!projectId || !taskId || newColumnId === undefined || newOrder === undefined) {
      return json(
        { error: 'Missing required parameters: projectId, taskId, newColumnId, newOrder' },
        { status: 400 }
      );
    }

    await moveTaskInProject(projectId, taskId, newColumnId, newOrder, userId);

    return json({ success: true });
  } catch (error) {
    console.error('Error in move-task API:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to move task' },
      { status: 500 }
    );
  }
};
import { json } from '@sveltejs/kit';
import { deleteTaskFromProject } from '$lib/server/api/firebaseTask';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    // Authenticate user from request headers
    const userId = await requireAuth({ request } as any);

    const { projectId, taskId } = await request.json();

    if (!projectId || !taskId) {
      return json(
        { error: 'Missing required parameters: projectId, taskId' },
        { status: 400 }
      );
    }

    await deleteTaskFromProject(projectId, taskId, userId);

    return json({ success: true, message: 'Task deleted successfully' });
  } catch (error) {
    console.error('Error in delete-task API:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete task' },
      { status: 500 }
    );
  }
};
import { json } from '@sveltejs/kit';
import { updateTaskInProject } from '$lib/server/api/firebaseTask';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Authenticate user from request headers
    const userId = await requireAuth({ request } as any);

    const { projectId, taskId, updatedFields } = await request.json();

    if (!projectId || !taskId || !updatedFields) {
      return json(
        { error: 'Missing required parameters: projectId, taskId, updatedFields' },
        { status: 400 }
      );
    }

    const updatedTask = await updateTaskInProject(projectId, taskId, updatedFields, userId);

    return json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Error in update-task API:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    );
  }
};
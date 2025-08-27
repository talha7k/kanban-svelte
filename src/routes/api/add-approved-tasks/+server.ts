import { json } from '@sveltejs/kit';
import { addApprovedTasksAction } from '$lib/server/actions/project.js';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Authenticate user from request headers
    const userId = await requireAuth({ request } as any);
    
    const { projectId, tasks } = await request.json();

    if (!projectId || !tasks) {
      return json(
        { error: 'Missing required parameters: projectId or tasks' },
        { status: 400 }
      );
    }

    const result = await addApprovedTasksAction(projectId, tasks, userId);
    
    if (!result.success) {
      return json(
        { success: false, error: result.error },
        { status: 400 }
      );
    }

    return json(result);
  } catch (error) {
    console.error('Error in add-approved-tasks API:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add tasks' },
      { status: 500 }
    );
  }
};
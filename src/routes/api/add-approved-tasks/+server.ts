import { json } from '@sveltejs/kit';
import { addApprovedTasksAction } from '$lib/server/actions/project.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { projectId, tasks, currentUserUid } = await request.json();

    if (!projectId || !tasks || !currentUserUid) {
      return json(
        { error: 'Missing required parameters: projectId, tasks, or currentUserUid' },
        { status: 400 }
      );
    }

    const result = await addApprovedTasksAction(projectId, tasks, currentUserUid);
    
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
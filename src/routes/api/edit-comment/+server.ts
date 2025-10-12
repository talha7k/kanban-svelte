import { json } from '@sveltejs/kit';
import { updateCommentInTask } from '$lib/server/api/firebaseTask';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ request }) => {
  try {
    // Authenticate user from request headers
    const userId = await requireAuth({ request } as any);

    const { projectId, taskId, commentId, newContent } = await request.json();

    if (!projectId || !taskId || !commentId || newContent === undefined) {
      return json(
        { error: 'Missing required parameters: projectId, taskId, commentId, newContent' },
        { status: 400 }
      );
    }

    const updatedTask = await updateCommentInTask(projectId, taskId, commentId, newContent, userId);

    return json({ task: updatedTask });
  } catch (error) {
    console.error('Error in edit-comment API:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to edit comment' },
      { status: 500 }
    );
  }
};
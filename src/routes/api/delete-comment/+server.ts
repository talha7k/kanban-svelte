import { json } from '@sveltejs/kit';
import { deleteCommentFromTask } from '$lib/server/api/firebaseTask';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ request }) => {
  try {
    // Authenticate user from request headers
    const userId = await requireAuth({ request } as any);

    const { projectId, taskId, commentId } = await request.json();

    if (!projectId || !taskId || !commentId) {
      return json(
        { error: 'Missing required parameters: projectId, taskId, commentId' },
        { status: 400 }
      );
    }

    await deleteCommentFromTask(projectId, taskId, commentId, userId);

    return json({ success: true, message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Error in delete-comment API:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to delete comment' },
      { status: 500 }
    );
  }
};
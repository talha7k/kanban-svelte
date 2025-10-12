import { json } from '@sveltejs/kit';
import { addCommentToTask } from '$lib/server/api/firebaseTask';
import { requireAuth } from '$lib/server/auth';
import { db } from '$lib/server/firebase';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Authenticate user from request headers
    const userId = await requireAuth({ request } as any);

    const { projectId, taskId, commentText } = await request.json();

    if (!projectId || !taskId || !commentText) {
      return json(
        { error: 'Missing required parameters: projectId, taskId, commentText' },
        { status: 400 }
      );
    }

    // Get user profile for comment metadata
    const firestore = db();
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();

    const commentData = {
      content: commentText,
      userName: userData?.name || 'Unknown User',
      avatarUrl: userData?.avatarUrl,
    };

    const updatedTask = await addCommentToTask(projectId, taskId, commentData, userId);

    return json({ task: updatedTask });
  } catch (error) {
    console.error('Error adding comment:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add comment' },
      { status: 500 }
    );
  }
};
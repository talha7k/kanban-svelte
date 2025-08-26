import { json } from '@sveltejs/kit';
import { moveTaskInProjectServer } from '$lib/server/firebaseProject';

export async function POST({ request }: { request: Request }) {
  try {
    const { projectId, taskId, newColumnId, newOrder, currentUserUid } = await request.json();

    if (!projectId || !taskId || newColumnId === undefined || newOrder === undefined || !currentUserUid) {
      return json(
        { error: 'Missing required parameters: projectId, taskId, newColumnId, newOrder, currentUserUid' },
        { status: 400 }
      );
    }

    await moveTaskInProjectServer(projectId, taskId, newColumnId, newOrder, currentUserUid);

    return json({ success: true });
  } catch (error) {
    console.error('Error in move-task API:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Failed to move task' },
      { status: 500 }
    );
  }
}
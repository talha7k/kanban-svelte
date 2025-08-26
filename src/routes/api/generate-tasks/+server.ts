import { json } from '@sveltejs/kit';
import { generateTasksAction } from '$lib/server/actions/project.js';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { projectId, brief, currentUserUid, taskCount } = await request.json();

    if (!projectId || !brief || !currentUserUid) {
      return json(
        { error: 'Missing required parameters: projectId, brief, or currentUserUid' },
        { status: 400 }
      );
    }

    const tasks = await generateTasksAction(projectId, brief, currentUserUid, taskCount);
    
    return json({ tasks });
  } catch (error) {
    console.error('Error in generate-tasks API:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Failed to generate tasks' },
      { status: 500 }
    );
  }
};
import { json } from '@sveltejs/kit';
import { generateTasksAction } from '$lib/server/actions/project.js';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Authenticate user from request headers
    const userId = await requireAuth({ request } as any);
    
    const { projectId, brief, taskCount } = await request.json();

    if (!projectId || !brief) {
      return json(
        { error: 'Missing required parameters: projectId or brief' },
        { status: 400 }
      );
    }

    const tasks = await generateTasksAction(projectId, brief, userId, taskCount);
    
    return json({ tasks });
  } catch (error) {
    console.error('Error in generate-tasks API:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Failed to generate tasks' },
      { status: 500 }
    );
  }
};
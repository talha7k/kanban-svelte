import { json } from '@sveltejs/kit';
import { addTaskToProject } from '$lib/server/firebaseTask';
import { requireAuth } from '$lib/server/auth';
import type { RequestHandler } from './$types';
import type { NewTaskData } from '$lib/types/types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    // Authenticate user from request headers
    const userId = await requireAuth({ request } as any);
    
    const { projectId, taskData, columnId } = await request.json();

    if (!projectId || !taskData || !columnId) {
      return json(
        { error: 'Missing required parameters: projectId, taskData, or columnId' },
        { status: 400 }
      );
    }

    // Create the new task data with proper typing
    const newTaskData: NewTaskData = {
      title: taskData.title,
      description: taskData.description || '',
      priority: taskData.priority || 'NONE',
      assigneeUids: taskData.assigneeUids || [],
      reporterId: taskData.reporterId || userId,
      dueDate: taskData.dueDate || undefined,
      tags: taskData.tags || [],
      projectId,
      createdAt: new Date().toISOString(),
      order: 0 // Will be set properly by the addTaskToProject function
    };

    const newTask = await addTaskToProject(projectId, newTaskData, columnId, userId);
    
    return json({ success: true, task: newTask });
  } catch (error) {
    console.error('Error in add-task API:', error);
    return json(
      { success: false, error: error instanceof Error ? error.message : 'Failed to add task' },
      { status: 500 }
    );
  }
};
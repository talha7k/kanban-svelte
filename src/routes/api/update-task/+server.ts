import { json } from '@sveltejs/kit';
import { db } from '$lib/server/firebase';
import { requireAuth } from '$lib/server/auth';

export async function POST({ request }: { request: Request }) {
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

    const firestore = db();
    if (!firestore) {
      return json(
        { error: 'Firebase Firestore not initialized' },
        { status: 500 }
      );
    }

    const projectRef = firestore.collection('projects').doc(projectId);
    const projectDoc = await projectRef.get();
    
    if (!projectDoc.exists) {
      return json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const project = projectDoc.data();
    const tasks = project?.tasks || [];
    const taskIndex = tasks.findIndex((t: any) => t.id === taskId);
    
    if (taskIndex === -1) {
      return json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const existingTask = tasks[taskIndex];
    
    // Create updated task object
    const updatedTask = {
      ...existingTask,
      ...updatedFields,
      updatedAt: new Date().toISOString(),
    };

    // Handle array fields to ensure they are empty arrays if undefined
    if (updatedFields.assigneeUids !== undefined) {
      updatedTask.assigneeUids = updatedFields.assigneeUids || [];
    }
    if (updatedFields.tags !== undefined) {
      updatedTask.tags = updatedFields.tags || [];
    }

    // Ensure optional string fields are handled properly
    if (updatedFields.description === '') updatedTask.description = null;
    if (updatedFields.dueDate === '') updatedTask.dueDate = null;
    if (updatedFields.reporterId === '') updatedTask.reporterId = null;

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;

    await projectRef.update({
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });

    return json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Error updating task:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Failed to update task' },
      { status: 500 }
    );
  }
}
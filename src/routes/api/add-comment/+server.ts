import { json } from '@sveltejs/kit';
import { db } from '$lib/server/firebase';
import { requireAuth } from '$lib/server/auth';
import { v4 as uuidv4 } from 'uuid';

export async function POST({ request }: { request: Request }) {
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

    if (!db) {
      return json(
        { error: 'Firebase Firestore not initialized' },
        { status: 500 }
      );
    }

    const firestore = db();
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
    
    // Get user profile for comment metadata
    const userRef = firestore.collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data();
    
    // Create new comment
    const newComment = {
      id: uuidv4(),
      content: commentText,
      userId: userId,
      userName: userData?.name || 'Unknown User',
      avatarUrl: userData?.avatarUrl,
      createdAt: new Date().toISOString()
    };

    // Add comment to task
    const updatedTask = {
      ...existingTask,
      comments: [...(existingTask.comments || []), newComment],
      updatedAt: new Date().toISOString()
    };

    const updatedTasks = [...tasks];
    updatedTasks[taskIndex] = updatedTask;

    await projectRef.update({
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });

    return json({ success: true, task: updatedTask });
  } catch (error) {
    console.error('Error adding comment:', error);
    return json(
      { error: error instanceof Error ? error.message : 'Failed to add comment' },
      { status: 500 }
    );
  }
}
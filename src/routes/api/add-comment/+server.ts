import { json } from '@sveltejs/kit';
import { db } from '$lib/server/firebase';
import { v4 as uuidv4 } from 'uuid';

export async function POST({ request }: { request: Request }) {
  try {
    const { projectId, taskId, commentText, currentUserUid } = await request.json();

    if (!projectId || !taskId || !commentText || !currentUserUid) {
      return json(
        { error: 'Missing required parameters: projectId, taskId, commentText, currentUserUid' },
        { status: 400 }
      );
    }

    if (!db) {
      return json(
        { error: 'Firebase Firestore not initialized' },
        { status: 500 }
      );
    }

    const projectRef = db.collection('projects').doc(projectId);
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
    
    // Create new comment
    const newComment = {
      id: uuidv4(),
      text: commentText,
      userId: currentUserUid,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
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
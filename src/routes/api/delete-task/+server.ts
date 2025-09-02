import { json } from '@sveltejs/kit';
import { db } from '$lib/server/firebase';

export async function DELETE({ request }: { request: Request }) {
  try {
    const { projectId, taskId, currentUserUid } = await request.json();

    if (!projectId || !taskId || !currentUserUid) {
      return json(
        { error: 'Missing required parameters: projectId, taskId, currentUserUid' },
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
    
    // Check if the current user is the project owner (only project managers can delete tasks)
    if (project?.ownerId !== currentUserUid) {
      return json(
        { error: 'Only the project owner can delete tasks' },
        { status: 403 }
      );
    }

    const tasks = project?.tasks || [];
    const taskIndex = tasks.findIndex((t: any) => t.id === taskId);
    
    if (taskIndex === -1) {
      return json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Remove the task from the tasks array
    const updatedTasks = tasks.filter((t: any) => t.id !== taskId);

    // Update the project with the new tasks array
    await projectRef.update({
      tasks: updatedTasks,
      updatedAt: new Date().toISOString(),
    });

    return json(
      { message: 'Task deleted successfully' },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error deleting task:', error);
    return json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
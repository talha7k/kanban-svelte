import { json } from '@sveltejs/kit';
import { db } from '$lib/server/firebase';
import { requireAuth } from '$lib/server/auth';

export async function PUT({ request }: { request: Request }) {
	try {
		// Authenticate user from request headers
		const userId = await requireAuth({ request } as any);
		
		const { projectId, taskId, commentId, newContent } = await request.json();

		if (!projectId || !taskId || !commentId || !newContent) {
			return json(
				{ error: 'Missing required parameters: projectId, taskId, commentId, newContent' },
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

		const task = tasks[taskIndex];
		const comments = task.comments || [];
		const commentIndex = comments.findIndex((c: any) => c.id === commentId);
		
		if (commentIndex === -1) {
			return json(
				{ error: 'Comment not found' },
				{ status: 404 }
			);
		}

		const comment = comments[commentIndex];
		
		// Check if user owns the comment
		if (comment.userId !== userId) {
			return json(
				{ error: 'You can only edit your own comments' },
				{ status: 403 }
			);
		}

		// Check if comment is within 5-minute edit window
		const commentTime = comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt);
		const now = new Date();
		const minutesSinceCreation = Math.floor((now.getTime() - commentTime.getTime()) / (1000 * 60));
		
		if (minutesSinceCreation > 5) {
			return json(
				{ error: 'Comments can only be edited within 5 minutes of posting' },
				{ status: 403 }
			);
		}

		// Update the comment
		comments[commentIndex] = {
			...comment,
			content: newContent,
			updatedAt: new Date()
		};

		tasks[taskIndex] = {
			...task,
			comments
		};

		// Update the project document
		await projectRef.update({ tasks });

		return json({ 
			message: 'Comment updated successfully',
			task: tasks[taskIndex]
		});
	} catch (error) {
		console.error('Error editing comment:', error);
		return json({ error: 'Failed to edit comment' }, { status: 500 });
	}
}
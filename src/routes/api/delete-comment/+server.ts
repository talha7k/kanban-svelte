import { json } from '@sveltejs/kit';
import { db } from '$lib/server/firebase';

export async function DELETE({ request }: { request: Request }) {
	try {
		const { projectId, taskId, commentId, currentUserUid } = await request.json();

		if (!projectId || !taskId || !commentId || !currentUserUid) {
			return json(
				{ error: 'Missing required parameters: projectId, taskId, commentId, currentUserUid' },
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
		if (comment.userId !== currentUserUid) {
			return json(
				{ error: 'You can only delete your own comments' },
				{ status: 403 }
			);
		}

		// Check if comment is within 5-minute delete window
		const commentTime = comment.createdAt?.toDate ? comment.createdAt.toDate() : new Date(comment.createdAt);
		const now = new Date();
		const minutesSinceCreation = Math.floor((now.getTime() - commentTime.getTime()) / (1000 * 60));
		
		if (minutesSinceCreation > 5) {
			return json(
				{ error: 'Comments can only be deleted within 5 minutes of posting' },
				{ status: 403 }
			);
		}

		// Remove the comment
		comments.splice(commentIndex, 1);

		tasks[taskIndex] = {
			...task,
			comments
		};

		// Update the project document
		await projectRef.update({ tasks });

		return json({ 
			message: 'Comment deleted successfully',
			task: tasks[taskIndex]
		});
	} catch (error) {
		console.error('Error deleting comment:', error);
		return json({ error: 'Failed to delete comment' }, { status: 500 });
	}
}
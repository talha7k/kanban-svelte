import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { getProjectByIdServer } from '$lib/server/firebaseProject';
import { optionalAuth } from '$lib/server/auth';
import { guardProjectAccess } from '$lib/auth/permissions';
import { getTeam } from '$lib/server/firebaseTeam';
import type { Project, Team } from '$lib/types/types';

export const load: ServerLoad = async ({ params, request }) => {
	const projectId = params.projectId;
	
	console.log('Server load called for projectId:', projectId);
	
	if (!projectId) {
		console.error('No projectId provided');
		throw error(400, 'Project ID is required');
	}
	
	try {
		// Get authenticated user (optional for public projects)
		const userId = await optionalAuth(request);
		
		console.log('Attempting to fetch project:', projectId);
		const project = await getProjectByIdServer(projectId);
		
		if (!project) {
			console.error('Project not found:', projectId);
			throw error(404, 'Project not found');
		}
		
		// Get team data for permission checks
		let team: Team | undefined;
		if (project.teamId) {
			team = await getTeam(project.teamId) || undefined;
		}
		
		// Check project access permissions if user is authenticated
		if (userId) {
			try {
				guardProjectAccess(userId, project as Project, team);
			} catch (authError) {
				console.error('Project access denied:', authError);
				throw error(403, authError instanceof Error ? authError.message : 'Access denied to this project');
			}
		}
		
		console.log('Project loaded successfully:', project.id);
		return {
			project,
			team
		};
	} catch (err) {
		console.error('Error loading project:', err);
		// Log more details about the error
		if (err instanceof Error) {
			console.error('Error message:', err.message);
			console.error('Error stack:', err.stack);
		}
		// If it's already a SvelteKit error, re-throw it
		if (err && typeof err === 'object' && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to load project');
	}
};
import { error } from '@sveltejs/kit';
import type { ServerLoad } from '@sveltejs/kit';
import { getProjectByIdServer } from '$lib/server/firebaseProject';

export const load: ServerLoad = async ({ params }) => {
	const projectId = params.projectId;
	
	if (!projectId) {
		throw error(400, 'Project ID is required');
	}
	
	try {
		const project = await getProjectByIdServer(projectId);
		
		if (!project) {
			throw error(404, 'Project not found');
		}
		
		return {
			project
		};
	} catch (err) {
		console.error('Error loading project:', err);
		throw error(500, 'Failed to load project');
	}
};
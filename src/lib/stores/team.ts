import { writable } from 'svelte/store';
import type { TeamId } from '$lib/types/types';

// Selected team store
export const selectedTeamId = writable<TeamId | null>(null);

// Helper function to set selected team
export function setSelectedTeamId(teamId: TeamId | null) {
	selectedTeamId.set(teamId);
	
	// Persist to localStorage if in browser
	if (typeof window !== 'undefined') {
		if (teamId) {
			localStorage.setItem('selectedTeamId', teamId);
		} else {
			localStorage.removeItem('selectedTeamId');
		}
	}
}

// Helper function to clear selected team
export function clearSelectedTeam() {
	setSelectedTeamId(null);
}
<script lang="ts">
	import { onMount } from 'svelte';
	import TeamUsersCard from './TeamUsersCard.svelte';
	import { getTeamMembers, getTeam } from '$lib/api/firebaseTeam';
	import { getProjectRelevantUsers } from '$lib/api/firebaseUser';
	import { toast } from 'svelte-sonner';
	import type { UserProfile, Team, TeamId, Project } from '$lib/types/types';

	export let selectedTeamId: TeamId | null;
	export let selectedProject: Project | null;
	export let onClearSelectedProject: () => void;
	export let onUsersLoaded: ((users: UserProfile[]) => void) | undefined = undefined;

	let allUsers: UserProfile[] = [];
	let selectedTeam: Team | null = null;
	let isLoadingUsers = true;

async function fetchTeamData() {
		if (!selectedTeamId) {
			isLoadingUsers = false;
			return;
		}

		isLoadingUsers = true;

		try {
			// LazyTeamUsersCard should only show team members, not project-specific users
			// Project member management is handled by ManageMembersDialog
			const [team, fetchedUsers] = await Promise.all([
				getTeam(selectedTeamId),
				getTeamMembers(selectedTeamId)
			]);

			selectedTeam = team;
			allUsers = fetchedUsers;
			onUsersLoaded?.(fetchedUsers);
		} catch (error) {
			console.error('Error fetching team data:', error);
			toast.error('Could not load team data.');
		} finally {
			isLoadingUsers = false;
		}
	}

	// Remove automatic updates - only update when explicitly triggered
	// This prevents race conditions and unwanted updates
	// LazyTeamUsersCard should not auto-update when selectedProject changes
	// The parent component will handle when to refresh data

	onMount(() => {
		if (selectedTeamId) {
			fetchTeamData();
		}
	});
</script>

<TeamUsersCard
	{isLoadingUsers}
	{allUsers}
	{selectedTeam}
	{selectedProject}
	{onClearSelectedProject}
/>
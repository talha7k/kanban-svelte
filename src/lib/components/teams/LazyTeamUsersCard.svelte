<script lang="ts">
	import { onMount } from 'svelte';
	import TeamUsersCard from './TeamUsersCard.svelte';
	import { getTeamMembers, getTeam } from '$lib/api/firebaseTeam';
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
			// Fetch team details and members in parallel
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

	// Reactive statement to fetch data when selectedTeamId changes
	$: if (selectedTeamId !== null) {
		// Add a small delay to allow projects to load first
		setTimeout(fetchTeamData, 200);
	} else {
		isLoadingUsers = false;
	}

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
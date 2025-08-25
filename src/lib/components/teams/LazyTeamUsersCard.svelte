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
			if (selectedProject) {
				// Fetch project-specific users
				const fetchedUsers = await getProjectRelevantUsers(selectedProject.id);
				allUsers = fetchedUsers;
				selectedTeam = null; // Clear team when showing project users
				onUsersLoaded?.(fetchedUsers);
			} else {
				// Fetch team details and members
				const [team, fetchedUsers] = await Promise.all([
					getTeam(selectedTeamId),
					getTeamMembers(selectedTeamId)
				]);

				selectedTeam = team;
				allUsers = fetchedUsers;
				onUsersLoaded?.(fetchedUsers);
			}
		} catch (error) {
			console.error('Error fetching team data:', error);
			toast.error('Could not load team data.');
		} finally {
			isLoadingUsers = false;
		}
	}

	// Reactive statement to fetch data when selectedTeamId or selectedProject changes
	$: if (selectedTeamId !== null) {
		// Add a small delay to allow projects to load first
		setTimeout(fetchTeamData, 200);
	} else {
		isLoadingUsers = false;
	}

	// Also watch for selectedProject changes
	$: if (selectedProject !== null && selectedTeamId !== null) {
		setTimeout(fetchTeamData, 200);
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
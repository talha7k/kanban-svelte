<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { currentUser, authStore } from '$lib/stores/auth';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Plus } from '@lucide/svelte';

	// Mock teams data - replace with actual API call
	let teams = [
		{ id: 'team-1', name: 'Development Team', description: 'Main development team for the project' },
		{ id: 'team-2', name: 'Design Team', description: 'UI/UX design and creative team' },
		{ id: 'team-3', name: 'Marketing Team', description: 'Marketing and growth team' }
	];

	function selectTeam(teamId: string) {
		authStore.setSelectedTeam(teamId);
		// Store in localStorage for persistence
		localStorage.setItem('selectedTeamId', teamId);
		// Navigate to team dashboard
		goto(`/teams/${teamId}`);
	}

	function createNewTeam() {
		// TODO: Implement team creation
		console.log('Create new team');
	}

	onMount(() => {
		// Redirect to login if not authenticated
		if (!$currentUser) {
			goto('/login');
		}
	});
</script>

<div class="container mx-auto p-6 max-w-4xl">
	<div class="mb-8">
		<h1 class="text-3xl font-bold mb-2">Select a Team</h1>
		<p class="text-muted-foreground">Choose a team to continue or create a new one</p>
	</div>

	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
		<!-- Create New Team Card -->
		<Card class="border-dashed border-2 hover:border-primary/50 transition-colors cursor-pointer" onclick={createNewTeam}>
			<CardHeader class="text-center">
				<div class="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
					<Plus class="w-6 h-6 text-primary" />
				</div>
				<CardTitle class="text-lg">Create New Team</CardTitle>
				<CardDescription>Start a new team and invite members</CardDescription>
			</CardHeader>
		</Card>

		<!-- Existing Teams -->
		{#each teams as team}
			<Card class="hover:shadow-md transition-shadow cursor-pointer" onclick={() => selectTeam(team.id)}>
				<CardHeader>
					<CardTitle class="text-lg">{team.name}</CardTitle>
					<CardDescription>{team.description}</CardDescription>
				</CardHeader>
				<CardContent>
					<Button class="w-full" variant="outline">
						Select Team
					</Button>
				</CardContent>
			</Card>
		{/each}
	</div>

	{#if teams.length === 0}
		<div class="text-center py-12">
			<div class="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
				<Plus class="w-8 h-8 text-muted-foreground" />
			</div>
			<h3 class="text-lg font-semibold mb-2">No teams found</h3>
			<p class="text-muted-foreground mb-4">Get started by creating your first team</p>
			<Button onclick={createNewTeam}>
				<Plus class="w-4 h-4 mr-2" />
				Create Team
			</Button>
		</div>
	{/if}
</div>
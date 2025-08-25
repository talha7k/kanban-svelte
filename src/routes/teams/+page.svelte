<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { currentUser, authStore } from '$lib/stores/auth';
	import TeamCard from '$lib/components/teams/TeamCard.svelte';
	import { useTeamManagement } from '../../queries/useTeamManagement';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Plus, Loader2 } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import type { Team, UserId } from '$lib/types/types';

	// Team management queries
const {
	teamsData,
	createTeamMutation
} = useTeamManagement();

// Team creation dialog state
let isCreateDialogOpen = $state(false);
let newTeamName = $state('');
let newTeamDescription = $state('');
let isCreatingTeam = $state(false);



	function selectTeam(teamId: string) {
		authStore.setSelectedTeam(teamId);
		// Store in localStorage for persistence
		localStorage.setItem('selectedTeamId', teamId);
		// Navigate to team dashboard
		goto(`/teams/${teamId}`);
	}

	function openCreateDialog() {
		isCreateDialogOpen = true;
		newTeamName = '';
		newTeamDescription = '';
	}
	
	function handleCreateTeam() {
		if (!$currentUser?.uid || !newTeamName.trim()) return;
		
		isCreatingTeam = true;
		
		$createTeamMutation.mutate({
			name: newTeamName.trim(),
			description: newTeamDescription.trim() || ''
		}, {
			onSuccess: () => {
				toast.success('Team Created!', {
					description: 'Team has been created successfully.'
				});
				
				// Close dialog and reset form
				isCreateDialogOpen = false;
				newTeamName = '';
				newTeamDescription = '';
				isCreatingTeam = false;
			},
			onError: (err: Error) => {
				console.error('Error creating team:', err);
				toast.error('Creation Failed', {
					description: 'Could not create team. Please try again.'
				});
				isCreatingTeam = false;
			}
		});
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

	{#if $teamsData.isPending}
		<div class="flex items-center justify-center py-12">
			<Loader2 class="h-8 w-8 animate-spin mr-2" />
			<p class="text-muted-foreground">Loading teams...</p>
		</div>
	{:else if $teamsData.isError}
		<div class="text-center py-12">
			<p class="text-red-500 mb-4">{$teamsData.error?.message}</p>
			<Button onclick={() => window.location.reload()} variant="outline">
				Try Again
			</Button>
		</div>
	{:else}
		<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
			<!-- Create New Team Card -->
			<Card class="hover:shadow-md transition-shadow cursor-pointer" onclick={openCreateDialog}>
				<CardHeader class="text-center">
					<div class="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
						<Plus class="w-6 h-6 text-primary" />
					</div>
					<CardTitle class="text-lg">Create New Team</CardTitle>
					<CardDescription>Start a new team and invite members</CardDescription>
				</CardHeader>
			</Card>

			<!-- Existing Teams -->
			{#each $teamsData.data || [] as team}
				<TeamCard 
					{team} 
					on:select={() => selectTeam(team.id)}
			/>
			{/each}
		</div>

		{#if $teamsData.data && $teamsData.data.length === 0}
			<div class="text-center py-12">
				<div class="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
					<Plus class="w-8 h-8 text-muted-foreground" />
				</div>
				<h3 class="text-lg font-semibold mb-2">No teams found</h3>
				<p class="text-muted-foreground mb-4">Get started by creating your first team</p>
				<Button onclick={openCreateDialog}>
					<Plus class="w-4 h-4 mr-2" />
					Create Team
				</Button>
			</div>
		{/if}
	{/if}
</div>

<!-- Team Creation Dialog -->
<Dialog bind:open={isCreateDialogOpen}>
	<DialogContent class="sm:max-w-[425px]">
		<DialogHeader>
			<DialogTitle>Create New Team</DialogTitle>
			<DialogDescription>
				Create a new team and start collaborating with your members.
			</DialogDescription>
		</DialogHeader>
		<div class="grid gap-4 py-4">
			<div class="grid gap-2">
				<Label for="team-name">Team Name</Label>
				<Input
					id="team-name"
					bind:value={newTeamName}
					placeholder="Enter team name"
					disabled={isCreatingTeam}
				/>
			</div>
			<div class="grid gap-2">
				<Label for="team-description">Description (Optional)</Label>
				<Textarea
					id="team-description"
					bind:value={newTeamDescription}
					placeholder="Enter team description"
					disabled={isCreatingTeam}
					rows={3}
				/>
			</div>
		</div>
		<DialogFooter>
			<Button variant="outline" onclick={() => isCreateDialogOpen = false} disabled={isCreatingTeam}>
				Cancel
			</Button>
			<Button onclick={handleCreateTeam} disabled={!newTeamName.trim() || isCreatingTeam}>
				{#if isCreatingTeam}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Create Team
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
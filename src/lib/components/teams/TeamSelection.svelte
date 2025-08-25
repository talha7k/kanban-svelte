<script lang="ts">
	import { onMount } from 'svelte';
	import { currentUser } from '$lib/stores/auth';
	import { getTeamsForUser, createTeam } from '$lib/api/firebaseTeam';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter
	} from '$lib/components/ui/dialog';
	import type { Team, UserId } from '$lib/types/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { toast } from 'svelte-sonner';

	export let onTeamSelected: (teamId: string) => void;
	export let onTeamCreated: (teamId: string) => void;

	let teams: Team[] = [];
	let loading = true;
	let createTeamDialogVisible = false;
	let newTeamName = '';
	let newTeamDescription = '';
	let error: string | null = null;

	async function fetchTeams() {
		if ($currentUser?.uid) {
			loading = true;
			try {
				const userTeams = await getTeamsForUser($currentUser.uid as UserId);
				teams = userTeams;
			} catch (err) {
				console.error('Error fetching teams:', err);
				error = 'Failed to load teams. Please try again.';
			} finally {
				loading = false;
			}
		}
	}

	onMount(() => {
		fetchTeams();
	});

	$: if ($currentUser?.uid) {
		fetchTeams();
	}

	async function handleCreateTeam() {
		if (!$currentUser?.uid || !newTeamName.trim()) return;

		try {
			const newTeam = await createTeam(
				newTeamName.trim(),
				$currentUser.uid as UserId,
				newTeamDescription.trim() || ''
			);

			toast.success('Team created successfully!');
			onTeamCreated(newTeam.id);
			
			// Reset form
			newTeamName = '';
			newTeamDescription = '';
			createTeamDialogVisible = false;
			
			// Refresh teams list
			await fetchTeams();
		} catch (err) {
			console.error('Error creating team:', err);
			toast.error('Failed to create team. Please try again.');
		}
	}

	function handleTeamSelect(teamId: string) {
		onTeamSelected(teamId);
	}
</script>

<div class="space-y-6">
	<div class="text-center">
		<h2 class="text-2xl font-bold tracking-tight">Select a Team</h2>
		<p class="text-muted-foreground">
			Choose a team to continue or create a new one.
		</p>
	</div>

	{#if loading}
		<div class="flex justify-center">
			<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
		</div>
	{:else if error}
		<div class="text-center text-red-500">
			<p>{error}</p>
			<Button onclick={fetchTeams} class="mt-2">Retry</Button>
		</div>
	{:else}
		<div class="space-y-4">
			{#if teams.length > 0}
				<ScrollArea class="h-96">
					<div class="grid gap-4">
						{#each teams as team (team.id)}
							<Card class="cursor-pointer hover:shadow-md transition-shadow" onclick={() => handleTeamSelect(team.id)}>
								<CardHeader>
									<CardTitle>{team.name}</CardTitle>
									{#if team.description}
										<CardDescription>{team.description}</CardDescription>
									{/if}
								</CardHeader>
								<CardContent>
									<p class="text-sm text-muted-foreground">
										{team.memberIds.length} member{team.memberIds.length !== 1 ? 's' : ''}
									</p>
								</CardContent>
							</Card>
						{/each}
					</div>
				</ScrollArea>
			{:else}
				<div class="text-center py-8">
					<p class="text-muted-foreground mb-4">You're not a member of any teams yet.</p>
					<Button onclick={() => createTeamDialogVisible = true}>Create Your First Team</Button>
				</div>
			{/if}

			{#if teams.length > 0}
				<div class="text-center">
					<Button variant="outline" onclick={() => createTeamDialogVisible = true}>
						Create New Team
					</Button>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Create Team Dialog -->
<Dialog open={createTeamDialogVisible} onOpenChange={(open) => createTeamDialogVisible = open}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>Create New Team</DialogTitle>
			<DialogDescription>
				Create a new team to collaborate with others on projects.
			</DialogDescription>
		</DialogHeader>
		
		<div class="space-y-4">
			<div class="space-y-2">
				<Label for="teamName">Team Name</Label>
				<Input
					id="teamName"
					bind:value={newTeamName}
					placeholder="Enter team name"
					required
				/>
			</div>
			
			<div class="space-y-2">
				<Label for="teamDescription">Description (Optional)</Label>
				<Textarea
					id="teamDescription"
					bind:value={newTeamDescription}
					placeholder="Describe your team's purpose"
					rows={3}
				/>
			</div>
		</div>
		
		<DialogFooter>
			<Button variant="outline" onclick={() => createTeamDialogVisible = false}>
				Cancel
			</Button>
			<Button onclick={handleCreateTeam} disabled={!newTeamName.trim()}>
				Create Team
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
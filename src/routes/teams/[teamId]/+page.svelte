<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { currentUser, authLoading } from '$lib/stores/auth';
	import { toast } from 'svelte-sonner';
	import { getTeam, updateTeam, addMemberToTeam, removeMemberFromTeam, deleteTeam, getTeamMembers } from '$lib/api/firebaseTeam';
	import { getUserProfileByEmail, getUserProfile } from '$lib/api/firebaseUser';
	import { getProjectsForTeam } from '$lib/api/firebaseProject';
	import type { Team, UserId, UserProfile, Project } from '$lib/types/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Loader2, UserPlus, Trash2, AlertTriangle, Edit2 } from '@lucide/svelte';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '$lib/components/ui/dialog';

	// Get teamId from page params
	let teamId = $derived($page.params.teamId);

	// State variables
	let team: Team | null = $state(null);
	let teamCreator: UserProfile | null = $state(null);
	let teamMembers: UserProfile[] = $state([]);
	let teamProjects: Project[] = $state([]);
	let isLoading = $state(true);
	let isEditTeamDialogOpen = $state(false);
	let newTeamName = $state('');
	let newTeamDescription = $state('');
	let isUpdatingTeam = $state(false);
	let isAddMemberDialogOpen = $state(false);
	let memberEmail = $state('');
	let isAddingMember = $state(false);
	let isDeleteTeamDialogOpen = $state(false);
	let isDeletingTeam = $state(false);
	let isRemoveMemberConfirmDialogOpen = $state(false);
	let memberToRemove: UserProfile | null = $state(null);

	async function fetchTeamDetails() {
		if (!teamId || !$currentUser?.uid) return;
		isLoading = true;
		try {
			const [fetchedTeam, members, projects] = await Promise.all([
				getTeam(teamId),
				getTeamMembers(teamId),
				getProjectsForTeam(teamId)
			]);

			team = fetchedTeam;
			teamMembers = members;
			teamProjects = projects;

			// Fetch team creator profile
			if (fetchedTeam?.ownerId) {
				try {
					const creatorProfile = await getUserProfile(fetchedTeam.ownerId);
					teamCreator = creatorProfile;
				} catch (error) {
					console.error('Error fetching team creator profile:', error);
				}
			}

			console.log('Fetched team:', fetchedTeam);
			console.log('Fetched members:', members);
			console.log('Fetched projects:', projects);

			if (fetchedTeam) {
				newTeamName = fetchedTeam.name;
				newTeamDescription = fetchedTeam.description || '';

				// Check if current user is the owner
				if (fetchedTeam.ownerId !== $currentUser?.uid) {
					toast.error('Access Denied', {
						description: 'You do not have permission to view this team page.'
					});
					goto('/teams');
					return;
				}
			}
		} catch (error) {
			console.error('Error fetching team details:', error);
			toast.error('Error', {
				description: 'Could not load team details.'
			});
		} finally {
			isLoading = false;
		}
	}

	async function handleUpdateTeam() {
		if (!team || !$currentUser) return;
		isUpdatingTeam = true;
		try {
			await updateTeam(team.id, { name: newTeamName, description: newTeamDescription });
			team = { ...team, name: newTeamName, description: newTeamDescription };
			isEditTeamDialogOpen = false;
			toast.success('Team Updated!', {
				description: 'Team details have been successfully updated.'
			});
		} catch (error) {
			console.error('Error updating team:', error);
			toast.error('Update Failed', {
				description: 'Could not update team.'
			});
		} finally {
			isUpdatingTeam = false;
		}
	}

	function handleRemoveMemberClick(member: UserProfile) {
		memberToRemove = member;
		isRemoveMemberConfirmDialogOpen = true;
	}

	async function handleRemoveMemberConfirm() {
		if (!team || !$currentUser || !memberToRemove) {
			isRemoveMemberConfirmDialogOpen = false;
			memberToRemove = null;
			return;
		}

		try {
			await removeMemberFromTeam(team.id, memberToRemove.id);
			teamMembers = teamMembers.filter(member => member.id !== memberToRemove!.id);
			toast.success('Member Removed', {
				description: `${memberToRemove.name} has been removed from the team.`
			});
		} catch (error) {
			console.error('Error removing member:', error);
			toast.error('Removal Failed', {
				description: 'Could not remove member from team.'
			});
		} finally {
			isRemoveMemberConfirmDialogOpen = false;
			memberToRemove = null;
		}
	}

	async function handleAddMember() {
		if (!team || !$currentUser || !memberEmail.trim()) return;
		isAddingMember = true;
		try {
			const userProfile = await getUserProfileByEmail(memberEmail.trim());
			if (!userProfile) {
				toast.error('User Not Found', {
					description: 'No user found with this email address.'
				});
				return;
			}

			// Check if user is already a member
			if (teamMembers.some(member => member.id === userProfile.id)) {
				toast.error('Already a Member', {
					description: 'This user is already a member of the team.'
				});
				return;
			}

			await addMemberToTeam(team.id, userProfile.id);
			teamMembers = [...teamMembers, userProfile];
			memberEmail = '';
			isAddMemberDialogOpen = false;
			toast.success('Member Added', {
				description: `${userProfile.name} has been added to the team.`
			});
		} catch (error) {
			console.error('Error adding member:', error);
			toast.error('Addition Failed', {
				description: 'Could not add member to team.'
			});
		} finally {
			isAddingMember = false;
		}
	}

	async function handleDeleteTeam() {
		if (!team || !$currentUser) return;
		isDeletingTeam = true;
		try {
			await deleteTeam(team.id);
			toast.success('Team Deleted', {
				description: 'Team has been successfully deleted.'
			});
			goto('/teams');
		} catch (error) {
			console.error('Error deleting team:', error);
			toast.error('Deletion Failed', {
				description: 'Could not delete team.'
			});
		} finally {
			isDeletingTeam = false;
			isDeleteTeamDialogOpen = false;
		}
	}

	onMount(() => {
		if ($currentUser?.uid) {
			fetchTeamDetails();
		}
	});

	// Effect to fetch data when teamId or currentUser changes
	$effect(() => {
		if (teamId && $currentUser?.uid && !$authLoading) {
			fetchTeamDetails();
		}
	});
</script>

<!-- Authentication and loading guard -->
{#if $authLoading || !$currentUser}
	<div class="flex items-center justify-center min-h-screen">
		<Loader2 class="h-8 w-8 animate-spin" />
		<p class="ml-2">Loading...</p>
	</div>
{:else if isLoading}
	<div class="flex items-center justify-center min-h-screen">
		<Loader2 class="h-8 w-8 animate-spin" />
		<p class="ml-2">Loading team details...</p>
	</div>
{:else if !team}
	<div class="flex flex-col items-center justify-center min-h-screen">
		<p class="text-lg text-muted-foreground">Team not found or access denied.</p>
		<Button onclick={() => goto('/teams')} variant="link" class="mt-2">
			Go to Teams
		</Button>
	</div>
{:else}
	<div class="container mx-auto p-6 space-y-6">
		<!-- Team Header -->
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold">{team.name}</h1>
				{#if team.description}
					<p class="text-muted-foreground mt-1">{team.description}</p>
				{/if}
				{#if teamCreator}
					<p class="text-sm text-muted-foreground mt-1">
						Created by: {teamCreator.name}
					</p>
				{/if}
			</div>
			<div class="flex gap-2">
				<Button onclick={() => isEditTeamDialogOpen = true} variant="outline">
					<Edit2 class="h-4 w-4 mr-2" />
					Edit Team
				</Button>
				<Button onclick={() => isDeleteTeamDialogOpen = true} variant="destructive">
					<Trash2 class="h-4 w-4 mr-2" />
					Delete Team
				</Button>
			</div>
		</div>

		<!-- Team Members -->
		<Card>
			<CardHeader>
				<div class="flex items-center justify-between">
					<CardTitle>Team Members ({teamMembers.length})</CardTitle>
					<Button onclick={() => isAddMemberDialogOpen = true} size="sm">
						<UserPlus class="h-4 w-4 mr-2" />
						Add Member
					</Button>
				</div>
			</CardHeader>
			<CardContent>
				{#if teamMembers.length === 0}
					<p class="text-muted-foreground">No members in this team yet.</p>
				{:else}
					<div class="space-y-2">
						{#each teamMembers as member (member.id)}
							<div class="flex items-center justify-between p-3 border rounded-lg">
								<div>
									<p class="font-medium">{member.name}</p>
									<p class="text-sm text-muted-foreground">{member.email}</p>
									{#if member.id === team.ownerId}
										<span class="text-xs bg-primary text-primary-foreground px-2 py-1 rounded">
											Owner
										</span>
									{/if}
								</div>
								{#if member.id !== team.ownerId}
									<Button
										onclick={() => handleRemoveMemberClick(member)}
										variant="outline"
										size="sm"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Team Projects -->
		<Card>
			<CardHeader>
				<CardTitle>Team Projects ({teamProjects.length})</CardTitle>
			</CardHeader>
			<CardContent>
				{#if teamProjects.length === 0}
					<p class="text-muted-foreground">No projects in this team yet.</p>
				{:else}
					<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
						{#each teamProjects as project (project.id)}
							<Card class="cursor-pointer hover:shadow-md transition-shadow"
								onclick={() => goto(`/projects/${project.id}`)}>
								<CardHeader>
									<CardTitle class="text-lg">{project.name}</CardTitle>
								</CardHeader>
								<CardContent>
									{#if project.description}
										<p class="text-sm text-muted-foreground">{project.description}</p>
									{/if}
									<p class="text-xs text-muted-foreground mt-2">
										Members: {project.memberIds?.length || 0}
									</p>
								</CardContent>
							</Card>
						{/each}
					</div>
				{/if}
			</CardContent>
		</Card>

		<!-- Edit Team Dialog -->
		<Dialog bind:open={isEditTeamDialogOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Edit Team</DialogTitle>
				</DialogHeader>
				<div class="space-y-4">
					<div>
						<Label for="teamName">Team Name</Label>
						<Input
							id="teamName"
							bind:value={newTeamName}
							placeholder="Enter team name"
						/>
					</div>
					<div>
						<Label for="teamDescription">Description (Optional)</Label>
						<Input
							id="teamDescription"
							bind:value={newTeamDescription}
							placeholder="Enter team description"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button onclick={() => isEditTeamDialogOpen = false} variant="outline">
						Cancel
					</Button>
					<Button onclick={handleUpdateTeam} disabled={isUpdatingTeam}>
						{#if isUpdatingTeam}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Update Team
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>

		<!-- Add Member Dialog -->
		<Dialog bind:open={isAddMemberDialogOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Add Team Member</DialogTitle>
				</DialogHeader>
				<div class="space-y-4">
					<div>
						<Label for="memberEmail">Email Address</Label>
						<Input
							id="memberEmail"
							bind:value={memberEmail}
							placeholder="Enter member's email"
							type="email"
						/>
					</div>
				</div>
				<DialogFooter>
					<Button onclick={() => isAddMemberDialogOpen = false} variant="outline">
						Cancel
					</Button>
					<Button onclick={handleAddMember} disabled={isAddingMember || !memberEmail.trim()}>
						{#if isAddingMember}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Add Member
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>

		<!-- Remove Member Confirmation Dialog -->
		{#if memberToRemove}
			<Dialog bind:open={isRemoveMemberConfirmDialogOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Remove Team Member</DialogTitle>
					</DialogHeader>
					<p>Are you sure you want to remove <strong>{memberToRemove.name}</strong> from the team?</p>
					<DialogFooter>
						<Button onclick={() => {
							isRemoveMemberConfirmDialogOpen = false;
							memberToRemove = null;
						}} variant="outline">
							Cancel
						</Button>
						<Button onclick={handleRemoveMemberConfirm} variant="destructive">
							Remove
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		{/if}

		<!-- Delete Team Confirmation Dialog -->
		<Dialog bind:open={isDeleteTeamDialogOpen}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Delete Team</DialogTitle>
				</DialogHeader>
				<div class="flex items-center gap-2 text-destructive mb-4">
					<AlertTriangle class="h-5 w-5" />
					<span class="font-medium">This action cannot be undone</span>
				</div>
				<p>Are you sure you want to delete <strong>{team.name}</strong>? This will permanently remove the team and all associated data.</p>
				<DialogFooter>
					<Button onclick={() => isDeleteTeamDialogOpen = false} variant="outline">
						Cancel
					</Button>
					<Button onclick={handleDeleteTeam} variant="destructive" disabled={isDeletingTeam}>
						{#if isDeletingTeam}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Delete Team
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	</div>
{/if}
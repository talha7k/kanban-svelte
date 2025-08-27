
<script lang="ts">
	import type { Project, UserProfile, UserProjectRole } from '$lib/types/types';
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
	} from '$lib/components/ui/dialog';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Command } from 'bits-ui';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import { addUserToProject, removeUserFromProject, updateProjectUserRole } from '$lib/api/firebaseProject';
	import { toast } from 'svelte-sonner';
	import { Loader2, Users, X, Check, ChevronsUpDown, UserPlus, ShieldCheck, UserCog } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { currentUser } from '$lib/stores/auth';
	import UserSelectionCombobox from './UserSelectionCombobox.svelte';

	export let project: Project;
	export let allUsers: UserProfile[];
	export let isOpen: boolean;
	export let onOpenChange: (isOpen: boolean) => void;
	export let onMembersUpdate: () => Promise<void> | void;
	export let readonly: boolean = false;

	let selectedUsersToAdd: UserProfile[] = [];
	let isSubmitting = false;
	let searchTerm = '';
	let openCombobox = false;

	$: projectMemberIds = project.memberIds || [];
	$: projectMembers = allUsers.filter(user => projectMemberIds.includes(user.id) && user.id !== project.ownerId);
	$: nonMemberUsers = allUsers.filter(user => !projectMemberIds.includes(user.id) && user.id !== project.ownerId);
	$: ownerProfile = allUsers.find(u => u.id === project.ownerId);

	async function handleAddMember() {
		if (selectedUsersToAdd.length === 0) {
			toast.error('No users selected', { description: 'Please select at least one user to add.' });
			return;
		}
		isSubmitting = true;
		try {
			for (const user of selectedUsersToAdd) {
				await addUserToProject(project.id, user.id);
			}
			toast.success('Members Added', { description: `${selectedUsersToAdd.length} user(s) have been added to the project.` });
			selectedUsersToAdd = [];
			searchTerm = '';
			await onMembersUpdate();
		} catch (error) {
			console.error('Error adding member:', error);
			toast.error('Error', { description: error instanceof Error ? error.message : 'Could not add member.' });
		} finally {
			isSubmitting = false;
		}
	}

	async function handleRemoveMember(userIdToRemove: string) {
		if (userIdToRemove === project.ownerId) {
			toast.error('Cannot Remove Owner', { description: 'The project owner cannot be removed.' });
			return;
		}
		isSubmitting = true;
		try {
			const userToRemove = allUsers.find(u => u.id === userIdToRemove);
			await removeUserFromProject(project.id, userIdToRemove);
			toast.success('Member Removed', { description: `${userToRemove?.name || 'User'} has been removed from the project.` });
			await onMembersUpdate();
		} catch (error) {
			console.error('Error removing member:', error);
			toast.error('Error', { description: error instanceof Error ? error.message : 'Could not remove member.' });
		} finally {
			isSubmitting = false;
		}
	}

	async function handleRoleChange(userId: string, newRole: UserProjectRole) {
		isSubmitting = true;
		try {
			await updateProjectUserRole(project.id, userId, newRole);
			toast.success('Role Updated', { description: `Role for user has been updated to ${newRole}.` });
			await onMembersUpdate();
		} catch (error) {
			console.error('Error updating role:', error);
			toast.error('Error Updating Role', { description: error instanceof Error ? error.message : 'Could not update role.' });
		} finally {
			isSubmitting = false;
		}
	}

	function toggleUserSelection(user: UserProfile) {
		if (selectedUsersToAdd.some(u => u.id === user.id)) {
			selectedUsersToAdd = selectedUsersToAdd.filter(u => u.id !== user.id);
		} else {
			selectedUsersToAdd = [...selectedUsersToAdd, user];
		}
	}

	$: filteredNonMembers = nonMemberUsers.filter(user => 
		user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
		user.email?.toLowerCase().includes(searchTerm.toLowerCase())
	);
</script>

<Dialog open={isOpen} {onOpenChange}>
	<DialogContent class="sm:max-w-lg max-h-[80vh] flex flex-col">
		<DialogHeader>
			<DialogTitle class="flex items-center">
		{#if readonly}
			<Users class="mr-2 h-5 w-5" />View Members: {project.name}
		{:else}
			<UserCog class="mr-2 h-5 w-5" />Manage Members & Roles: {project.name}
		{/if}
	</DialogTitle>
			<DialogDescription>
		{#if readonly}
			View all members and their roles in this project.
		{:else}
			Add/remove members and assign project-specific roles.
		{/if}
	</DialogDescription>
		</DialogHeader>

		<div class="py-2">
			<h3 class="text-sm font-semibold mb-2 text-muted-foreground">Project Owner</h3>
			{#if ownerProfile}
				<div class="flex items-center justify-between space-x-3 p-2 rounded-md bg-muted/30">
					<div class="flex items-center space-x-3">
						<Avatar class="h-8 w-8">
							<AvatarImage src={ownerProfile.avatarUrl} alt={ownerProfile.name} />
							<AvatarFallback>{ownerProfile.name?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
						</Avatar>
						<div>
							<p class="text-sm font-medium text-foreground">{ownerProfile.name}</p>
							<p class="text-xs text-muted-foreground">{ownerProfile.email}</p>
						</div>
					</div>
					<Badge variant="outline" class="border-primary text-primary">
						<ShieldCheck class="mr-1 h-3.5 w-3.5" />Owner
					</Badge>
				</div>
			{/if}
		</div>

		<div class="flex-1 flex flex-col min-h-0">
			<h3 class="text-sm font-semibold mb-2 mt-3 text-muted-foreground">Current Members ({projectMembers.length})</h3>
			<ScrollArea class="flex-grow border rounded-md mb-4 h-48 pr-1">
				<div class="p-2 space-y-1">
					{#if projectMembers.length > 0}
						{#each projectMembers as member (member.id)}
							<div class="flex items-center justify-between p-1.5 rounded hover:bg-muted/50">
								<div class="flex items-center space-x-2 flex-1">
									<Avatar class="h-7 w-7">
										<AvatarImage src={member.avatarUrl} alt={member.name} />
										<AvatarFallback>{member.name?.substring(0, 1).toUpperCase() || 'U'}</AvatarFallback>
									</Avatar>
									<span class="text-sm">{member.name}</span>
								</div>
								<div class="flex items-center space-x-1">
									{#if !readonly}
										<select
											value={project.memberRoles?.[member.id] || 'member'}
											onchange={(e) => handleRoleChange(member.id, e.currentTarget.value as UserProjectRole)}
											disabled={isSubmitting}
											class="h-8 w-[100px] text-xs border border-input rounded-md px-2 py-1 bg-background"
										>
											<option value="member">Member</option>
											<option value="manager">Manager</option>
										</select>
										
										<Button
											variant="ghost"
											size="icon"
											class="h-7 w-7 text-muted-foreground hover:text-destructive"
											onclick={() => handleRemoveMember(member.id)}
											disabled={isSubmitting}
											aria-label="Remove {member.name}"
										>
											<X class="h-4 w-4" />
										</Button>
									{:else}
										<Badge variant="outline" class="text-xs">
											{project.memberRoles?.[member.id] || 'member'}
										</Badge>
									{/if}
								</div>
							</div>
						{/each}
					{:else}
						<p class="text-xs text-muted-foreground p-2 text-center">No other members added yet.</p>
					{/if}
				</div>
			</ScrollArea>

			{#if !readonly}
				<h3 class="text-sm font-semibold mb-2 text-muted-foreground">Add New Member</h3>
				<UserSelectionCombobox
					bind:openCombobox
					bind:selectedUsers={selectedUsersToAdd}
					users={filteredNonMembers}
					bind:searchTerm
					{isSubmitting}
					disabled={isSubmitting || nonMemberUsers.length === 0}
					placeholder="Select user..."
					emptyText="No users found."
					multiSelect={true}
					showSubmitButton={true}
					submitButtonText="Add"
					showAvatars={true}
					onToggleUser={toggleUserSelection}
					onSubmit={handleAddMember}
				/>
			{/if}
		</div>

		<DialogFooter>
			<Button variant="outline" onclick={() => onOpenChange(false)}>Close</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

    
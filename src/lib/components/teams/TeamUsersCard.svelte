<script lang="ts">
	import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Users, Loader2, Crown, Briefcase, ShieldCheck, UserCog } from '@lucide/svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { Project, UserProjectRole } from '$lib/types/types';

	interface User {
		id: string;
		name?: string | null;
		email?: string | null;
		avatarUrl?: string | null;
		title?: string | null;
	}

	interface Team {
		ownerId: string;
	}

	export let isLoadingUsers: boolean;
	export let allUsers: User[];
	export let selectedTeam: Team | null;
	export let selectedProject: Project | null = null;
	export let onClearSelectedProject: (() => void) | undefined = undefined;

	// Filter users based on context (team or project)
	$: displayUsers = selectedProject
		? allUsers.filter(
				(user) =>
					user.id === selectedProject.ownerId || selectedProject.memberIds?.includes(user.id)
			)
		: allUsers;

	function getDisplayTitle(): string {
		if (selectedProject) {
			return ` ${selectedProject.name}`;
		}
		return 'Team';
	}

	function getDisplayDescription(): string {
		if (selectedProject) {
			return 'Members and their roles in this project.';
		}
		return 'Overview of team members.';
	}

	function getUserRole(user: User): {
		role: string;
		variant: 'outline' | 'default' | 'secondary';
		icon?: any;
	} {
		if (selectedProject) {
			// Project context - show project-specific roles
			if (user.id === selectedProject.ownerId) {
				return { role: 'Owner', variant: 'outline', icon: Crown };
			}
			const projectRole = selectedProject.memberRoles?.[user.id] as UserProjectRole;
			if (projectRole === 'manager') {
				return { role: 'Manager', variant: 'default', icon: ShieldCheck };
			}
			return { role: 'Member', variant: 'secondary', icon: UserCog };
		} else {
			// Team context - only show team owner badge
			if (selectedTeam?.ownerId === user.id) {
				return { role: 'Owner', variant: 'outline', icon: Crown };
			}
			// For regular team members, show their general role or "Member"
			return {
				role: 'Member',
				variant: 'secondary'
			};
		}
	}
</script>

<Card class="shadow-lg border-0">
	<CardHeader>
		<CardTitle class="flex items-center text-2xl mb-2">
			<Users class="mr-3 h-7 w-7 text-accent" />
			{getDisplayTitle()} (
			{#if isLoadingUsers}
				<Loader2 class="h-5 w-5 animate-spin ml-2" />
			{:else}
				{displayUsers.length}
			{/if}
			)
		</CardTitle>
		{#if selectedProject && onClearSelectedProject}
			<Button
				variant="outline"
				size="sm"
				onclick={onClearSelectedProject}
				class="text-sm text-muted-foreground"
			>
				Clear Project Filter
			</Button>
		{/if}
		<CardDescription>{getDisplayDescription()}</CardDescription>
	</CardHeader>
	<CardContent>
		{#if isLoadingUsers}
			<div class="space-y-3">
				<div class="flex items-center space-x-3 p-2">
					<Skeleton class="h-9 w-9 rounded-full" />
					<Skeleton class="h-4 w-32" />
				</div>
				<div class="flex items-center space-x-3 p-2">
					<Skeleton class="h-9 w-9 rounded-full" />
					<Skeleton class="h-4 w-24" />
				</div>
				<div class="flex items-center space-x-3 p-2">
					<Skeleton class="h-9 w-9 rounded-full" />
					<Skeleton class="h-4 w-28" />
				</div>
			</div>
		{:else if displayUsers.length > 0}
			<ScrollArea class="h-auto max-h-[350px] md:max-h-[500px] pr-4 overflow-y-auto">
				<ul class="space-y-3">
					{#each displayUsers as user (user.id)}
						{@const userRoleInfo = getUserRole(user)}
						<li
							class="flex items-start space-x-3 p-2 rounded-md bg-gradient-to-r from-blue-100 to-white hover:bg-muted/50"
						>
							<Avatar class="h-9 w-9">
								<AvatarImage
									src={user.avatarUrl || undefined}
									alt={user.name || ''}
									data-ai-hint="profile avatar"
								/>
								<AvatarFallback>
									{user.name?.substring(0, 2).toUpperCase() ||
										user.email?.substring(0, 2).toUpperCase() ||
										'U'}
								</AvatarFallback>
							</Avatar>
							<div class="flex-1 min-w-0">
								<div class="flex justify-between items-center">
									<span
										class="text-sm font-medium text-foreground truncate"
										title={user.name || ''}
									>
										{user.name}
									</span>
									<Badge
										variant={userRoleInfo.variant}
										class={`capitalize text-xs flex-shrink-0 ${
											userRoleInfo.variant === 'outline' ? 'border-accent text-accent' : ''
										}`}
									>
										{#if userRoleInfo.icon}
											<svelte:component this={userRoleInfo.icon} class="mr-1.5 h-3.5 w-3.5" />
										{/if}
										{userRoleInfo.role}
									</Badge>
								</div>
								<p class="text-xs text-muted-foreground break-all" title={user.email || ''}>
									{user.email}
								</p>
								{#if user.title}
									<p
										class="text-xs text-muted-foreground flex items-center mt-0.5 truncate"
										title={user.title}
									>
										<Briefcase class="h-3 w-3 mr-1.5 flex-shrink-0" />
										{user.title}
									</p>
								{/if}
							</div>
						</li>
					{/each}
				</ul>
			</ScrollArea>
		{:else}
			<p class="text-muted-foreground text-center py-4">No users found.</p>
		{/if}
	</CardContent>
</Card>
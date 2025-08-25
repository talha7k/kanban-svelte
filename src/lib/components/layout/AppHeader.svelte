
<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { currentUser, userProfile, authStore } from '$lib/stores/auth';
	import KanbanIcon from '$lib/components/icons/KanbanIcon.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Github, LayoutDashboard, LogOut, UserCircle, LogIn, Settings, Users } from '@lucide/svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuLabel,
		DropdownMenuSeparator,
		DropdownMenuTrigger,
	} from '$lib/components/ui/dropdown-menu';
	import { toast } from 'svelte-sonner';

	async function handleLogout() {
		try {
			await authStore.logout();
			toast.success('Logged Out', {
				description: 'You have been successfully logged out.'
			});
			goto('/login');
		} catch (error) {
			toast.error('Logout Failed', {
				description: 'Could not log out at this time.'
			});
			console.error('Logout error:', error);
		}
	}
</script>

<header class="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4">
	<div class="flex h-14 items-center justify-between w-full">
		<div class="flex items-center">
			<a href="/" class="mr-6 flex items-center space-x-2">
				<KanbanIcon className="h-6 w-6 text-primary" />
				<span class="font-bold sm:inline-block">
					DijiKanban
				</span>
			</a>
			<nav class="flex items-center space-x-4">
				{#if $currentUser}
					<Button variant="ghost">
						<a href="/teams" class="flex items-center">
							<Users class="mr-2 h-4 w-4" />
							Teams
						</a>
					</Button>
					<Button variant="ghost">
						<a href="/dashboard" class="flex items-center">
							<LayoutDashboard class="mr-2 h-4 w-4" />
							Dashboard
						</a>
					</Button>
				{/if}
			</nav>
		</div>

		<div class="flex items-center space-x-4">
			<Button variant="ghost" size="sm">
				<a href="https://github.com/yourusername/kanban-app" target="_blank" rel="noopener noreferrer" class="flex items-center">
					<Github class="h-4 w-4" />
				</a>
			</Button>

			{#if $currentUser}
				<DropdownMenu>
					<DropdownMenuTrigger asChild let:builder>
					<Button variant="ghost" class="relative h-8 w-8 rounded-full" {...builder}>
							<Avatar class="h-8 w-8">
								<AvatarImage src={$userProfile?.avatarUrl || ''} alt={$userProfile?.name || 'User'} />
								<AvatarFallback>
									{$userProfile?.name?.charAt(0) || $currentUser.email?.charAt(0) || 'U'}
								</AvatarFallback>
							</Avatar>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent class="w-56" align="end">
						<DropdownMenuLabel class="font-normal">
							<div class="flex flex-col space-y-1">
								<p class="text-sm font-medium leading-none">
									{$userProfile?.name || 'User'}
								</p>
								<p class="text-xs leading-none text-muted-foreground">
									{$currentUser.email}
								</p>
							</div>
						</DropdownMenuLabel>
						<DropdownMenuSeparator />
						<DropdownMenuItem>
							<a href="/profile" class="flex items-center w-full">
								<UserCircle class="mr-2 h-4 w-4" />
								<span>Profile</span>
							</a>
						</DropdownMenuItem>
						<DropdownMenuItem>
							<a href="/settings" class="flex items-center w-full">
								<Settings class="mr-2 h-4 w-4" />
								<span>Settings</span>
							</a>
						</DropdownMenuItem>
						<DropdownMenuSeparator />
						<DropdownMenuItem onclick={handleLogout}>
							<LogOut class="mr-2 h-4 w-4" />
							<span>Log out</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			{:else}
				<Button variant="ghost">
					<a href="/login" class="flex items-center">
						<LogIn class="mr-2 h-4 w-4" />
						Sign In
					</a>
				</Button>
			{/if}
		</div>
	</div>
</header>

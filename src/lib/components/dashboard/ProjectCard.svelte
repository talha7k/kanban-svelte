<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import {
		PlusCircle,
		FolderKanban,
		Loader2,
		Briefcase,
		Settings2,
		Eye,
		Crown,
		Pencil,
		Trash2,
		Users,
		Users2Icon,
		PlusIcon,
		PlusCircleIcon,
		Settings,
		MoreVertical,
	} from '@lucide/svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { RoleBadge } from '$lib/components/badges';
	import {
		DropdownMenu,
		DropdownMenuContent,
		DropdownMenuItem,
		DropdownMenuSeparator,
		DropdownMenuTrigger,
	} from '$lib/components/ui/dropdown-menu';
	import type { Project, UserProfile } from '$lib/types/types';

	export let project: Project;
	export let currentUserUid: string | undefined;
	export let allUsers: UserProfile[] = [];
	export let openEditProjectDialog: (project: Project) => void = () => {};
	export let openManageMembersDialog: (project: Project) => void = () => {};
	export let openDeleteProjectDialog: (project: Project) => void = () => {};
	export let openViewMembersDialog: (project: Project) => void = () => {};

	let isPending = false;

	function handleNavigateToProject() {
		isPending = true;
		goto(`/projects/${project.id}`);
		isPending = false;
	}
</script>

<Card
	class="border-0 bg-gradient-to-r from-pink-100 to-white hover:shadow-lg transition-shadow hover:bg-gradient-to-r hover:from-pink-200 hover:to-purple-100"
>
	<CardHeader
		onclick={handleNavigateToProject}
		class="pb-3 cursor-pointer "
	>
		<div class="flex justify-between items-start">
			<CardTitle class="text-lg">{project.name}</CardTitle>
			{#if currentUserUid === project.ownerId}
				<RoleBadge role="owner" size="sm" />
			{/if}
		</div>
		<CardDescription
			onclick={handleNavigateToProject}
			class="line-clamp-2 min-h-[40px] break-words cursor-pointer"
		>
			{project.description || "No description available."}
			<div class="flex items-center space-x-2 mb-1">
				<span class="flex text-xs font-bold text-blue-400 mt-2">
					<Users2Icon class="mr-1.5 h-4 w-4" />
					{project.memberIds?.length || 0}
				</span>
			</div>
		</CardDescription>
	</CardHeader>
	<CardFooter class="flex justify-between items-center border-t py-3">
		<Button
			variant="outline"
			size="sm"
			onclick={(e) => {
				e.stopPropagation();
				openViewMembersDialog(project);
			}}
		>
			<Eye class="mr-1.5 h-3.5 w-3.5" /> View Members
		</Button>
		
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button
					variant="ghost"
					size="sm"
					onclick={(e) => e.stopPropagation()}
					class="h-8 w-8 p-0"
				>
					<MoreVertical class="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{#if currentUserUid === project.ownerId}
					<DropdownMenuItem
						onclick={(e) => {
							e.stopPropagation();
							openEditProjectDialog(project);
						}}
					>
						<Pencil class="mr-2 h-4 w-4" />
						Edit Project
					</DropdownMenuItem>
					<DropdownMenuItem
						onclick={(e) => {
							e.stopPropagation();
							openManageMembersDialog(project);
						}}
					>
						<PlusCircle class="mr-2 h-4 w-4" />
						Manage Members
					</DropdownMenuItem>
					<DropdownMenuSeparator />
					<DropdownMenuItem
						onclick={(e) => {
							e.stopPropagation();
							openDeleteProjectDialog(project);
						}}
						class="text-destructive"
					>
						<Trash2 class="mr-2 h-4 w-4" />
						Delete Project
					</DropdownMenuItem>
				{:else}
					<DropdownMenuItem
						onclick={(e) => {
							e.stopPropagation();
							openViewMembersDialog(project);
						}}
					>
						<Eye class="mr-2 h-4 w-4" />
						View Members
					</DropdownMenuItem>
				{/if}
			</DropdownMenuContent>
		</DropdownMenu>
	</CardFooter>
</Card>

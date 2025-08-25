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
	} from '@lucide/svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import type { Project, UserProfile } from '$lib/types/types';

	export let project: Project;
	export let currentUserUid: string | undefined;
	export const allUsers: UserProfile[] = [];
	export const openEditProjectDialog: (project: Project) => void = () => {};
	export const openManageMembersDialog: (project: Project) => void = () => {};
	export const openDeleteProjectDialog: (project: Project) => void = () => {};
	export const openViewMembersDialog: (project: Project) => void = () => {};

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
				<Badge variant="outline" class="ml-2 border-primary text-primary">
					<Crown class="mr-1.5 h-3.5 w-3.5" /> Owner
				</Badge>
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
	<CardFooter class="flex flex-col justify-center items-center border-t">
		<div class="flex flex-wrap gap-2 w-full mt-3 md:mt-0">
			{#if currentUserUid === project.ownerId}
				<Button
					variant="outline"
					size="sm"
					onclick={() => openEditProjectDialog(project)}
				>
					<Pencil class="mr-1.5 h-3.5 w-3.5" /> Edit
				</Button>
				<Button
					variant="outline"
					size="sm"
					onclick={() => openManageMembersDialog(project)}
				>
					<PlusCircle class="mr-1.5 h-3.5 w-3.5" /> Members
				</Button>
			{/if}
			<Button
				variant="outline"
				size="sm"
				onclick={() => openViewMembersDialog(project)}
			>
				<Eye class="mr-1.5 h-3.5 w-3.5" /> Members
			</Button>
		</div>
	</CardFooter>
</Card>

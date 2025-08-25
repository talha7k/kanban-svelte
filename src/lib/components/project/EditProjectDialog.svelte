
<script lang="ts">
	import type { Project, Team } from '$lib/types/types';
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
	} from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Loader2, Trash2 } from '@lucide/svelte';

	export let isOpen: boolean = false;
	export let onOpenChange: (isOpen: boolean) => void;
	export let project: Project;
	export let onEditProject: (data: any) => Promise<void> | void;
	export let isSubmitting: boolean = false;
	export let onDeleteProject: (project: Project) => void;

	let projectName = project.name;
	let projectDescription = project.description || '';

	function handleSubmit() {
		onEditProject({
			name: projectName,
			description: projectDescription,
		});
	}

	function handleDelete() {
		onDeleteProject(project);
	}
</script>

<Dialog open={isOpen} {onOpenChange}>
	<DialogContent class="sm:max-w-[425px]">
		<DialogHeader>
			<DialogTitle>Edit Project</DialogTitle>
			<DialogDescription>
				Make changes to your project here. Click save when you're done.
			</DialogDescription>
		</DialogHeader>
		
		<form onsubmit={handleSubmit} class="space-y-4">
			<div class="space-y-2">
				<Label for="name">Project Name</Label>
				<Input
					id="name"
					bind:value={projectName}
					placeholder="Enter project name"
					required
				/>
			</div>
			
			<div class="space-y-2">
				<Label for="description">Description</Label>
				<Textarea
					id="description"
					bind:value={projectDescription}
					placeholder="Enter project description"
					rows={3}
				/>
			</div>
		</form>
		
		<DialogFooter class="flex justify-between">
			<Button
				variant="destructive"
				onclick={handleDelete}
				class="flex items-center gap-2"
			>
				<Trash2 class="h-4 w-4" />
				Delete Project
			</Button>
			
			<div class="flex gap-2">
				<Button variant="outline" onclick={() => onOpenChange(false)}>
					Cancel
				</Button>
				<Button onclick={handleSubmit} disabled={isSubmitting}>
					{#if isSubmitting}
						<Loader2 class="h-4 w-4 animate-spin mr-2" />
						Saving...
					{:else}
						Save Changes
					{/if}
				</Button>
			</div>
		</DialogFooter>
	</DialogContent>
</Dialog>

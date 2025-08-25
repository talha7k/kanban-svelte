<script lang="ts">
	import type { Project } from '$lib/types/types';
	import { Loader2 } from '@lucide/svelte';
	import {
		Dialog,
		DialogContent,
		DialogFooter,
		DialogHeader,
		DialogTitle,
		DialogDescription,
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';

	export let projectToDelete: Project | null = null;
	export let isDeletingProject: boolean = false;
	export let setProjectToDelete: (project: Project | null) => void;
	export let confirmDeleteProject: () => void;

	$: isOpen = !!projectToDelete;

	function handleOpenChange(open: boolean) {
		if (!open) {
			setProjectToDelete(null);
		}
	}

	function handleCancel() {
		setProjectToDelete(null);
	}
</script>

<Dialog open={isOpen} onOpenChange={handleOpenChange}>
	<DialogContent>
		<DialogHeader>
			<DialogTitle>
				Are you sure you want to delete this project?
				<div class="mt-4">
					<p class="text-red-400 text-lg">This will delete all tasks of the project.</p>
				</div>
			</DialogTitle>
			<DialogDescription>
				This action cannot be undone. This will permanently delete the
				project "{projectToDelete?.name}" and all its tasks.
			</DialogDescription>
		</DialogHeader>
		<DialogFooter>
			<Button variant="outline" onclick={handleCancel} disabled={isDeletingProject}>
				Cancel
			</Button>
			<Button
				variant="destructive"
				onclick={confirmDeleteProject}
				disabled={isDeletingProject}
			>
				{#if isDeletingProject}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Deleting...
				{:else}
					Delete Project
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
<script lang="ts">
	import type { Task } from '$lib/types/types';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Loader2 } from '@lucide/svelte';

	export let isOpen = false;
	export let task: Task | null = null;
	export let isDeleting = false;
	export let onConfirm: () => void;
	export let onCancel: () => void;
</script>

<Dialog bind:open={isOpen}>
	<DialogContent class="sm:max-w-[425px]">
		<DialogHeader>
			<DialogTitle>Delete Task</DialogTitle>
			<DialogDescription>
				Are you sure you want to delete "{task?.title}"? This action cannot be undone.
			</DialogDescription>
		</DialogHeader>
		<DialogFooter>
			<Button variant="outline" onclick={onCancel} disabled={isDeleting}>
				Cancel
			</Button>
			<Button variant="destructive" onclick={onConfirm} disabled={isDeleting}>
				{#if isDeleting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					Deleting...
				{:else}
					Delete Task
				{/if}
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

<script lang="ts">
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
	import type { NewProjectData } from '$lib/types/types';
	import { Loader2 } from '@lucide/svelte';

	export let isOpen: boolean;
	export let onOpenChange: (isOpen: boolean) => void;
	export let onAddProject: (projectData: NewProjectData) => Promise<void> | void;

	let isSubmitting = false;
	let name = '';
	let description = '';
	let nameError = '';
	let descriptionError = '';

	function validateForm() {
		nameError = '';
		descriptionError = '';

		if (!name || name.length < 3) {
			nameError = 'Project name must be at least 3 characters long.';
			return false;
		}
		if (name.length > 50) {
			nameError = 'Project name must be 50 characters or less.';
			return false;
		}
		if (description && description.length > 200) {
			descriptionError = 'Description must be 200 characters or less.';
			return false;
		}
		return true;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();
		
		if (!validateForm()) {
			return;
		}

		isSubmitting = true;
		try {
			await onAddProject({ name, description });
			// onOpenChange(false) and form reset are typically called by the parent on success
		} catch (error) {
			// Error toast is handled by parent
			console.error('Project creation submission failed in dialog:', error);
		} finally {
			isSubmitting = false;
		}
	}

	function handleDialogClose() {
		if (!isSubmitting) {
			name = '';
			description = '';
			nameError = '';
			descriptionError = '';
			onOpenChange(false);
		}
	}

	function handleOpenChange(open: boolean) {
		if (!open) {
			handleDialogClose();
		} else {
			onOpenChange(open);
		}
	}
</script>

<Dialog open={isOpen} onOpenChange={handleOpenChange}>
	<DialogContent class="sm:max-w-[425px]">
		<DialogHeader>
			<DialogTitle>Create New Project</DialogTitle>
			<DialogDescription>
				Fill in the details for your new project. Click save when you're done.
			</DialogDescription>
		</DialogHeader>
		<form onsubmit={handleSubmit} class="space-y-4 py-2">
			<div class="space-y-1">
				<Label for="name">Project Name</Label>
				<Input
					id="name"
					bind:value={name}
					placeholder="e.g., Q4 Marketing Campaign"
					disabled={isSubmitting}
				/>
				{#if nameError}
					<p class="text-xs text-destructive">{nameError}</p>
				{/if}
			</div>
			<div class="space-y-1">
				<Label for="description">Description (Optional)</Label>
				<Textarea
					id="description"
					bind:value={description}
					placeholder="A brief overview of the project's goals."
					disabled={isSubmitting}
				/>
				{#if descriptionError}
					<p class="text-xs text-destructive">{descriptionError}</p>
				{/if}
			</div>
			<DialogFooter>
				<Button type="button" variant="outline" onclick={handleDialogClose} disabled={isSubmitting}>
					Cancel
				</Button>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Save Project
				</Button>
			</DialogFooter>
		</form>
	</DialogContent>
</Dialog>

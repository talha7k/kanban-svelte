<script lang="ts">
	import type { Task } from '$lib/types/types';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter,
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Loader2 } from '@lucide/svelte';

	export let isOpen: boolean = false;
	export let onOpenChange: (isOpen: boolean) => void;
	export let onGenerate: (brief: string, taskCount: number) => Promise<Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]>;
	export let onAddTasks: (tasks: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
	export let isGenerating: boolean = false;
	export let isAddingTasks: boolean = false;

	let briefInput = '';
	let taskCount = 3;
	let currentStep: 'generate' | 'approve' = 'generate';
	let generatedTasks: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[] = [];

	async function handleSubmit() {
		if (briefInput.trim()) {
			const tasks = await onGenerate(briefInput, taskCount);
			generatedTasks = tasks;
			currentStep = 'approve';
		}
	}

	async function handleApprove() {
		await onAddTasks(generatedTasks);
		// Reset state after successful addition
		briefInput = '';
		taskCount = 3;
		currentStep = 'generate';
		generatedTasks = [];
		onOpenChange(false);
	}

	function handleBack() {
		currentStep = 'generate';
	}

	function handleClose() {
		// Reset state when closing
		briefInput = '';
		taskCount = 3;
		currentStep = 'generate';
		generatedTasks = [];
		onOpenChange(false);
	}
</script>

<Dialog open={isOpen} onOpenChange={onOpenChange}>
	<DialogContent class="sm:max-w-[500px]">
		{#if currentStep === 'generate'}
			<DialogHeader>
				<DialogTitle>Generate Tasks with AI</DialogTitle>
				<DialogDescription>
					Describe your project or feature, and AI will generate relevant tasks for you.
				</DialogDescription>
			</DialogHeader>

			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="brief">Project Brief</Label>
					<Textarea
						id="brief"
						bind:value={briefInput}
						placeholder="Describe what you want to build..."
						rows={4}
					/>
				</div>

				<div class="space-y-2">
					<Label for="taskCount">Number of Tasks</Label>
					<select id="taskCount" bind:value={taskCount} class="w-full p-2 border rounded">
						<option value={3}>3 tasks</option>
						<option value={5}>5 tasks</option>
						<option value={8}>8 tasks</option>
						<option value={10}>10 tasks</option>
					</select>
				</div>
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={handleClose}>Cancel</Button>
				<Button onclick={handleSubmit} disabled={isGenerating || !briefInput.trim()}>
					{#if isGenerating}
						<Loader2 class="h-4 w-4 animate-spin mr-2" />
						Generating...
					{:else}
						Generate Tasks
					{/if}
				</Button>
			</DialogFooter>
		{:else}
			<DialogHeader>
				<DialogTitle>Review Generated Tasks</DialogTitle>
				<DialogDescription>
					Review the generated tasks and add them to your project.
				</DialogDescription>
			</DialogHeader>

			<div class="space-y-3 max-h-96 overflow-y-auto">
				{#each generatedTasks as task, index (index)}
					<div class="border rounded p-3">
						<h4 class="font-medium">{task.title}</h4>
						{#if task.description}
							<p class="text-sm text-muted-foreground mt-1">{task.description}</p>
						{/if}
					</div>
				{/each}
			</div>

			<DialogFooter>
				<Button variant="outline" onclick={handleBack}>Back</Button>
				<Button onclick={handleApprove} disabled={isAddingTasks}>
					{#if isAddingTasks}
						<Loader2 class="h-4 w-4 animate-spin mr-2" />
						Adding Tasks...
					{:else}
						Add All Tasks
					{/if}
				</Button>
			</DialogFooter>
		{/if}
	</DialogContent>
</Dialog>
<script lang="ts">
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { ArrowLeft, Loader2 } from '@lucide/svelte';
	import type { Task } from '$lib/types/types';

	export let isOpen: boolean;
	export let onOpenChange: (isOpen: boolean) => void;
	export let generatedTasks: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[];
	export let onApprove: (selectedTasks: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]) => Promise<void>;
	export let onBack: () => void;
	export let isAdding: boolean;

	let selectedTaskIds = new Set(generatedTasks.map((_, index) => index));

	$: selectedCount = selectedTaskIds.size;

	function handleTaskToggle(taskIndex: number) {
		const newSelected = new Set(selectedTaskIds);
		if (newSelected.has(taskIndex)) {
			newSelected.delete(taskIndex);
		} else {
			newSelected.add(taskIndex);
		}
		selectedTaskIds = newSelected;
	}

	function handleSelectAll() {
		if (selectedTaskIds.size === generatedTasks.length) {
			selectedTaskIds = new Set();
		} else {
			selectedTaskIds = new Set(generatedTasks.map((_, index) => index));
		}
	}

	async function handleApprove() {
		const selectedTasks = generatedTasks.filter((_, index) => selectedTaskIds.has(index));
		await onApprove(selectedTasks);
	}
</script>

<Dialog open={isOpen} {onOpenChange}>
	<DialogContent class="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
		<DialogHeader>
			<DialogTitle class="flex items-center gap-2">
				<Button
					variant="ghost"
					size="sm"
					onclick={onBack}
					disabled={isAdding}
					class="p-1 h-auto"
				>
					<ArrowLeft class="h-4 w-4" />
				</Button>
				Review Generated Tasks
			</DialogTitle>
			<DialogDescription>
				Select the tasks you want to add to your project. You can modify or remove any tasks before adding them.
			</DialogDescription>
		</DialogHeader>
		
		<div class="flex-1 overflow-y-auto space-y-4 py-4">
			<div class="flex items-center justify-between">
				<Button
					variant="outline"
					size="sm"
					onclick={handleSelectAll}
					disabled={isAdding}
				>
					{selectedTaskIds.size === generatedTasks.length ? 'Deselect All' : 'Select All'}
				</Button>
				<span class="text-sm text-muted-foreground">
					{selectedCount} of {generatedTasks.length} tasks selected
				</span>
			</div>
			
			<div class="space-y-3 px-2">
				{#each generatedTasks as task, index (index)}
					<Card class={`transition-all p-3 ${
						selectedTaskIds.has(index) ? 'ring-1' : 'opacity-70'
					}`}>
						<CardHeader class="pb-3">
							<div class="flex items-start gap-3">
								<Checkbox
									checked={selectedTaskIds.has(index)}
									onCheckedChange={() => handleTaskToggle(index)}
									disabled={isAdding}
									class="mt-1"
								/>
								<div class="flex-1">
									<CardTitle class="text-base">{task.title}</CardTitle>
									<CardDescription class="mt-1">
										{task.description}
									</CardDescription>
								</div>
							</div>
						</CardHeader>
						<CardContent class="pt-0">
							<div class="flex gap-2 text-xs text-muted-foreground">
								<span class="px-2 py-1 bg-secondary rounded">
									Priority: {task.priority}
								</span>
							</div>
						</CardContent>
					</Card>
				{/each}
			</div>
		</div>
		
		<DialogFooter class="flex gap-2">
			<Button
				variant="outline"
				onclick={onBack}
				disabled={isAdding}
			>
				Back to Generate
			</Button>
			<Button
				onclick={handleApprove}
				disabled={selectedCount === 0 || isAdding}
			>
				{#if isAdding}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" />
				{/if}
				Add {selectedCount} Task{selectedCount !== 1 ? 's' : ''} to Project
			</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>
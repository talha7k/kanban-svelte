
<script lang="ts">
	import type { Project, UserProfile, Task } from '$lib/types/types';
	import { Button } from '$lib/components/ui/button';
	import { Plus, Loader2 } from '@lucide/svelte';
	import { onMount } from 'svelte';
	import { writable } from 'svelte/store';
	import { draggableTask, droppableColumn, droppableTask, setupKanbanMonitor, dragState } from '$queries/useDragAndDrop';
	import { queryClient } from '$lib/queryClient';

	export let project: Project;
	export const users: UserProfile[] = [];

	let isLoading = false;
	const tasksStore = writable<Task[]>([]);
	let cleanupMonitor: () => void;

	// Initialize tasks from project
	$: if (project?.tasks) {
		tasksStore.set(project.tasks);
	}
	

	// Setup drag-and-drop monitor
	onMount(() => {
		cleanupMonitor = setupKanbanMonitor(tasksStore, async (updates: Array<{taskId: string, changes: Partial<Task>}>) => {
			// Handle task updates after drag and drop
				for (const update of updates) {
					const { taskId, changes } = update;
					
					// Update in the project object
					const taskIndex = project.tasks.findIndex(t => t.id === taskId);
					if (taskIndex !== -1) {
						project.tasks[taskIndex] = { ...project.tasks[taskIndex], ...changes };
					}
				}

			// Invalidate project queries to refresh data
			await queryClient.invalidateQueries({ queryKey: ['project', project.id] });
		});

		return () => {
			if (cleanupMonitor) cleanupMonitor();
		};
	});

	function handleAddTask() {
		console.log('Add task clicked');
	}
</script>

<div class="kanban-board">
	{#if isLoading}
		<div class="flex items-center justify-center h-full text-muted-foreground">
			<Loader2 class="h-8 w-8 animate-spin mr-2" /> Loading project board...
		</div>
	{:else}
		<div class="flex flex-col h-full">
			<div class="flex items-center justify-between p-4 border-b">
				<h2 class="text-xl font-semibold">{project.name}</h2>
				<Button onclick={handleAddTask} class="flex items-center gap-2">
					<Plus class="h-4 w-4" />
					Add Task
				</Button>
			</div>
			
			<div class="flex-1 p-4">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					{#each project.columns as column (column.id)}
						<div
							class="bg-muted/50 rounded-lg p-4 transition-all duration-200"
							class:ring-2={$dragState.isOverColumnId === column.id}
							class:ring-primary={$dragState.isOverColumnId === column.id}
							class:ring-offset-2={$dragState.isOverColumnId === column.id}
							use:droppableColumn={{ columnId: column.id }}
						>
							<h3 class="font-medium mb-4">{column.title}</h3>
							<div class="space-y-2 min-h-[100px]">
								{#each $tasksStore.filter(task => task.columnId === column.id) as task (task.id)}
									<div
										class="bg-card p-3 rounded border cursor-move transition-all duration-200 hover:shadow-md"
										class:opacity-50={$dragState.isDragging}
										class:ring-2={$dragState.isOverTaskId === task.id}
										class:ring-primary={$dragState.isOverTaskId === task.id}
										class:ring-offset-2={$dragState.isOverTaskId === task.id}
										use:draggableTask={{ task }}
										use:droppableTask={{ taskId: task.id, columnId: column.id }}
									>
										<h4 class="font-medium text-sm">{task.title}</h4>
										{#if task.description}
											<p class="text-xs text-muted-foreground mt-1">{task.description}</p>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.kanban-board {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
</style>

    

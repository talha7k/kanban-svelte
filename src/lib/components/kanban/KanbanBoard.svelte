
<script lang="ts">
	import type { Project, UserProfile } from '$lib/types/types';
	import { Button } from '$lib/components/ui/button';
	import { Plus, Loader2 } from '@lucide/svelte';

	export let project: Project;
	export let users: UserProfile[];

	let isLoading = false;

	// Placeholder implementation - will be expanded later
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
						<div class="bg-muted/50 rounded-lg p-4">
							<h3 class="font-medium mb-4">{column.title}</h3>
							<div class="space-y-2">
								{#each project.tasks.filter(task => task.columnId === column.id) as task (task.id)}
									<div class="bg-card p-3 rounded border">
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

    

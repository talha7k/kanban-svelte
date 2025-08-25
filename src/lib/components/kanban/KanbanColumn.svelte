
<script lang="ts">
	import type { Column, Task, UserProfile } from '$lib/types/types';
	import TaskCard from './TaskCard.svelte';
	import { PlusCircle, Loader2 } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';

	export let column: Column;
	export let tasks: Task[];
	export let users: UserProfile[];
	export let projectColumns: Column[];
	export let canManageTasks: boolean;
	export let onAddTask: (columnId: string) => void;
	export let onEditTask: (task: Task) => void;
	export let onDeleteTask: (taskId: string) => void;
	export let onViewTaskDetails: (task: Task) => void;
	export let onMoveToNextColumn: (task: Task) => void;
	export let onMoveToPreviousColumn: (task: Task) => void;
	export let isSubmitting: boolean = false;
	export let onUpdateTask: (taskId: string, updatedFields: Partial<Task>) => void;

	// Filter and sort tasks for this column
	$: columnTasks = tasks
		.filter(task => task.columnId === column.id)
		.sort((a, b) => a.order - b.order);
</script>

<div
	class="w-full md:flex-1 md:min-w-0 md:max-w-sm lg:max-w-md xl:max-w-lg bg-muted/50 p-3 rounded-lg shadow-sm h-full flex flex-col transition-colors"
	aria-labelledby="column-title-{column.id}"
>
	<div class="flex justify-between items-center mb-4">
		<h2 id="column-title-{column.id}" class="text-lg font-semibold text-foreground">{column.title}</h2>
		<span class="text-sm text-muted-foreground bg-background px-2 py-1 rounded-full">{columnTasks.length}</span>
	</div>
	<div class="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent min-h-[200px]">
		<div class="space-y-2">
			{#each columnTasks as task (task.id)}
				<TaskCard
					{task}
					{users}
					{projectColumns}
					canManageTask={canManageTasks}
					onEdit={onEditTask}
					onDelete={onDeleteTask}
					onViewDetails={onViewTaskDetails}
					{onMoveToNextColumn}
					{onMoveToPreviousColumn}
					{isSubmitting}
					{onUpdateTask}
				/>
			{/each}
		</div>
		{#if columnTasks.length === 0}
			<div class="text-center text-sm text-muted-foreground py-8 border-2 border-dashed border-border rounded-md">
				Drag tasks here or click "Add Task"
			</div>
		{/if}
	</div>
	{#if canManageTasks}
		<Button
			variant="ghost"
			class="w-full mt-3 text-muted-foreground hover:text-foreground justify-start"
			onclick={() => onAddTask(column.id)}
			disabled={isSubmitting}
		>
			{#if isSubmitting}
				<Loader2 class="mr-2 h-4 w-4 animate-spin" />
			{:else}
				<PlusCircle class="mr-2 h-4 w-4" />
			{/if}
			Add Task
		</Button>
	{/if}
</div>

    

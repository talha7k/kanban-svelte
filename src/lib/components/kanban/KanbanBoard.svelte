
<script lang="ts">
	import type { Project, UserProfile, Task } from '$lib/types/types';
	import { Button } from '$lib/components/ui/button';
import { Plus, Loader2 } from '@lucide/svelte';
import EditTaskDialog from './EditTaskDialog.svelte';
import { onMount } from 'svelte';
import { writable, get } from 'svelte/store';
import { draggableTask, droppableColumn, droppableTask, setupKanbanMonitor, dragState } from '$queries/useDragAndDrop';
	import { queryClient } from '$lib/queryClient';
	import { currentUser } from '$lib/stores/auth';
	import { toast } from 'svelte-sonner';
	import TaskCard from './TaskCard.svelte';

	export let project: Project;
	export let users: UserProfile[] = [];


	let isLoading = false;
	const tasksStore = writable<Task[]>([]);
	let cleanupMonitor: () => void;
	
	// Edit dialog state
	let isEditDialogOpen = false;
	let taskToEdit: Task | null = null;

	// Initialize tasks from project
	$: if (project?.tasks) {
		tasksStore.set(project.tasks);
	}
	

	// Setup drag-and-drop monitor
	onMount(() => {
		cleanupMonitor = setupKanbanMonitor(tasksStore, async (updates: Array<{taskId: string, changes: Partial<Task>}>) => {
				let savingToastId: string | number | undefined;
				
				try {
					// Show saving state and toast
					dragState.update(state => ({ ...state, isSaving: true }));
					savingToastId = toast.loading('Saving task position...');
					
					// Group updates by taskId to avoid duplicate calls
					const uniqueUpdates = new Map<string, Partial<Task>>();
					
					for (const update of updates) {
						const { taskId, changes } = update;
						if (!uniqueUpdates.has(taskId)) {
							uniqueUpdates.set(taskId, changes);
						} else {
							// Merge changes if there are multiple updates for the same task
							const existing = uniqueUpdates.get(taskId)!;
							uniqueUpdates.set(taskId, { ...existing, ...changes });
						}
					}

					// Process each unique update - prioritize move operations
					const movePromises: Promise<void>[] = [];
					
					for (const [taskId, changes] of uniqueUpdates.entries()) {
						// Check if this is a move operation (columnId or order changed)
						if (changes.columnId !== undefined || changes.order !== undefined) {
							// Get the task from the store to determine the new column and order
							const task = get(tasksStore).find(t => t.id === taskId);
							if (task) {
								const newColumnId = changes.columnId ?? task.columnId;
								const newOrder = changes.order ?? task.order;
								
								// Use the server-side API for proper positioning
									const userId = get(currentUser)?.uid;
									if (!userId) {
										throw new Error('User not authenticated');
									}
									
									movePromises.push(
										fetch('/api/move-task', {
											method: 'POST',
											headers: {
												'Content-Type': 'application/json',
											},
											body: JSON.stringify({
												projectId: project.id,
												taskId,
												newColumnId,
												newOrder,
												currentUserUid: userId
											})
										})
										.then(response => {
											if (!response.ok) {
												throw new Error('Failed to move task');
											}
										})
									);
							}
						}
					}

					// Wait for all move operations to complete
										await Promise.all(movePromises);
										toast.success('Task position saved successfully');
										toast.dismiss(savingToastId);
										dragState.update(state => ({ ...state, isSaving: false }));

																// Invalidate project queries to refresh data
							await queryClient.invalidateQueries({ queryKey: ['project', project.id] });
				} catch (error) {
					console.error('Error updating tasks after drag and drop:', error);
					toast.error('Failed to save task position');
					toast.dismiss(savingToastId);
					dragState.update(state => ({ ...state, isSaving: false }));
					// Re-throw to trigger rollback in drag handler
					throw error;
				}
			});

		return () => {
			if (cleanupMonitor) cleanupMonitor();
		};
	});

	function handleAddTask() {
		console.log('Add task clicked');
	}

	function handleEditTask(task: Task) {
		taskToEdit = task;
		isEditDialogOpen = true;
	}

	function handleDeleteTask(taskId: string) {
		console.log('Delete task:', taskId);
		// TODO: Implement task delete functionality
	}

	function handleViewTaskDetails(task: Task) {
		console.log('View task:', task.id);
		// TODO: Implement task details view
	}

	async function handleMoveToNextColumn(task: Task) {
		const currentColumnIndex = project.columns.findIndex(col => col.id === task.columnId);
		if (currentColumnIndex < project.columns.length - 1) {
			const nextColumn = project.columns[currentColumnIndex + 1];
			await handleUpdateTask(task.id, { columnId: nextColumn.id });
		}
	}

	async function handleMoveToPreviousColumn(task: Task) {
		const currentColumnIndex = project.columns.findIndex(col => col.id === task.columnId);
		if (currentColumnIndex > 0) {
			const prevColumn = project.columns[currentColumnIndex - 1];
			await handleUpdateTask(task.id, { columnId: prevColumn.id });
		}
	}

	async function handleUpdateTask(taskId: string, updatedFields: Partial<Task>) {
		const userId = get(currentUser)?.uid;
		if (!userId) return;

		try {
			const response = await fetch('/api/update-task', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					projectId: project.id,
					taskId,
					updatedFields,
					currentUserUid: userId
				})
			});

			if (!response.ok) {
				throw new Error('Failed to update task');
			}

			await queryClient.invalidateQueries({ queryKey: ['project', project.id] });
		} catch (error) {
			console.error('Error updating task:', error);
		}
	}
</script>

<div class="kanban-board relative">
		{#if isLoading}
			<div class="flex items-center justify-center h-full text-muted-foreground">
				<Loader2 class="h-8 w-8 animate-spin mr-2" /> Loading project board...
			</div>
		{:else}
			{#if $dragState.isSaving}
				<div class="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center">
					<div class="bg-background border rounded-lg p-4 flex items-center gap-2 shadow-lg">
						<Loader2 class="h-4 w-4 animate-spin" />
						<span class="text-sm font-medium">Saving task position...</span>
					</div>
				</div>
			{/if}
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
										class:opacity-50={$dragState.isDragging || $dragState.movingTaskId === task.id}
										class:ring-2={$dragState.isOverTaskId === task.id}
										class:ring-primary={$dragState.isOverTaskId === task.id}
										class:ring-offset-2={$dragState.isOverTaskId === task.id}
										use:draggableTask={{ task }}
										use:droppableTask={{ taskId: task.id, columnId: column.id }}
									>
										<TaskCard
											{task}
											{users}
											projectColumns={project.columns}
											canManageTask={$currentUser?.uid === project.ownerId}
											onEdit={(t) => handleEditTask(t)}
											onDelete={(taskId) => handleDeleteTask(taskId)}
											onViewDetails={(t) => handleViewTaskDetails(t)}
											onMoveToNextColumn={(t) => handleMoveToNextColumn(t)}
											onMoveToPreviousColumn={(t) => handleMoveToPreviousColumn(t)}
											isSubmitting={$dragState.movingTaskId === task.id}
											onUpdateTask={(taskId, updatedFields) => handleUpdateTask(taskId, updatedFields)}
										/>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Edit Task Dialog -->
	<EditTaskDialog
		bind:isOpen={isEditDialogOpen}
		taskToEdit={taskToEdit}
		assignableUsers={users}
		allTasksForDependencies={$tasksStore}
		onEditTask={handleUpdateTask}
		onOpenChange={(open) => {
			isEditDialogOpen = open;
			if (!open) taskToEdit = null;
		}}
	/>
</div>

<style>
	.kanban-board {
		height: 100%;
		display: flex;
		flex-direction: column;
	}
</style>

    


<script lang="ts">
	import type { Project, UserProfile, Task } from '$lib/types/types';
	import { Button } from '$lib/components/ui/button';
	import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '$lib/components/ui/dialog';
	import { Plus, Loader2 } from '@lucide/svelte';
	import EditTaskDialog from './EditTaskDialog.svelte';
	import ViewTaskDialog from './ViewTaskDialog.svelte';
	import { onMount } from 'svelte';
	import { writable, get } from 'svelte/store';
	import { draggableTask, droppableColumn, droppableTask, setupKanbanMonitor, dragState } from '$queries/useDragAndDrop';
	import { queryClient } from '$lib/queryClient';
	import { currentUser } from '$lib/stores/auth';
	import { toast } from 'svelte-sonner';
	import TaskCard from './TaskCard.svelte';
	import KanbanColumn from './KanbanColumn.svelte';

	export let project: Project;
	export let users: UserProfile[] = [];
	export let onProjectUpdate: () => Promise<void> = () => Promise.resolve();

	let isLoading = false;
	const tasksStore = writable<Task[]>([]);
	let cleanupMonitor: () => void;
	
	// Edit dialog state
	let isEditDialogOpen = false;
	let taskToEdit: Task | null = null;

	// View dialog state
	let isViewDialogOpen = false;
	let taskToView: Task | null = null;
	let isSubmittingComment = false;
	let isDeleteDialogOpen = false;
	let taskToDelete: Task | null = null;
	let isDeletingTask = false;

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

												// No need to invalidate queries - we already have optimistic updates
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
		const task = $tasksStore.find(t => t.id === taskId);
		if (task) {
			taskToDelete = task;
			isDeleteDialogOpen = true;
		}
	}

	async function confirmDeleteTask() {
		if (!taskToDelete) return;

		const userId = get(currentUser)?.uid;
		if (!userId) {
			toast.error('You must be logged in to delete tasks');
			return;
		}

		isDeletingTask = true;
		try {
			const response = await fetch('/api/delete-task', {
				method: 'DELETE',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					projectId: project.id,
					taskId: taskToDelete.id,
					currentUserUid: userId
				})
			});

			if (!response.ok) {
				throw new Error('Failed to delete task');
			}

			// Remove task from store
			tasksStore.update(tasks => tasks.filter(t => t.id !== taskToDelete!.id));
			
			// Close dialogs if the deleted task was being viewed
			if (taskToView?.id === taskToDelete.id) {
				isViewDialogOpen = false;
				taskToView = null;
			}

			toast.success('Task deleted successfully');
			isDeleteDialogOpen = false;
			taskToDelete = null;
		} catch (error) {
			console.error('Error deleting task:', error);
			toast.error('Failed to delete task');
		} finally {
			isDeletingTask = false;
		}
	}

	function cancelDeleteTask() {
		isDeleteDialogOpen = false;
		taskToDelete = null;
	}

	function handleViewTaskDetails(task: Task) {
		taskToView = task;
		isViewDialogOpen = true;
	}

	async function handleAddComment(taskId: string, commentText: string) {
		const userId = get(currentUser)?.uid;
		if (!userId) {
			toast.error('You must be logged in to add comments');
			return;
		}

		isSubmittingComment = true;
		try {
			const response = await fetch('/api/add-comment', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					projectId: project.id,
					taskId,
					commentText,
					currentUserUid: userId
				})
			});

			if (!response.ok) {
				throw new Error('Failed to add comment');
			}

			// Update the task in the store with the new comment
			const responseData = await response.json();
			const updatedTask = responseData.task;
			tasksStore.update(tasks => 
				tasks.map(task => 
					task.id === taskId ? updatedTask : task
				)
			);

			// Update the taskToView if it's the same task
			if (taskToView?.id === taskId) {
				taskToView = updatedTask;
			}

		} catch (error) {
			console.error('Error adding comment:', error);
			throw error; // Re-throw to let ViewTaskDialog handle the error
		} finally {
			isSubmittingComment = false;
		}
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
			// Optimistically update the UI first
			tasksStore.update(tasks => 
				tasks.map(task => 
					task.id === taskId ? { ...task, ...updatedFields } : task
				)
			);

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

			toast.success('Task updated successfully');
		} catch (error) {
			console.error('Error updating task:', error);
			toast.error('Failed to update task');
			// Revert optimistic update on error
			await queryClient.invalidateQueries({ queryKey: ['project', project.id] });
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
								{#each $tasksStore.filter(task => task.columnId === column.id).sort((a, b) => a.order - b.order) as task, index (task.id)}
									<!-- Insertion preview indicator BEFORE the target task -->
									{#if $dragState.insertionPreview && $dragState.insertionPreview.columnId === column.id && $dragState.insertionPreview.afterTaskId === task.id}
										<div class="h-2 bg-primary/30 rounded-md border-2 border-dashed border-primary animate-pulse transition-all duration-200 mb-2"></div>
									{/if}
									
									<div
										class="transition-all duration-200"
										class:opacity-50={$dragState.isDragging && $dragState.movingTaskId === task.id}
										class:transform={$dragState.insertionPreview && $dragState.insertionPreview.columnId === column.id && $dragState.insertionPreview.afterTaskId && index >= $tasksStore.filter(t => t.columnId === column.id).sort((a, b) => a.order - b.order).findIndex(t => t.id === $dragState.insertionPreview?.afterTaskId)}
										class:translate-y-4={$dragState.insertionPreview && $dragState.insertionPreview.columnId === column.id && $dragState.insertionPreview.afterTaskId && index >= $tasksStore.filter(t => t.columnId === column.id).sort((a, b) => a.order - b.order).findIndex(t => t.id === $dragState.insertionPreview?.afterTaskId)}
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
								
								<!-- Insertion preview at end of column -->
								{#if $dragState.insertionPreview && $dragState.insertionPreview.columnId === column.id && !$dragState.insertionPreview.afterTaskId}
									<div class="h-2 bg-primary/30 rounded-md border-2 border-dashed border-primary animate-pulse transition-all duration-200"></div>
								{/if}
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
			onEditTask={handleUpdateTask}
			onOpenChange={(open) => {
				isEditDialogOpen = open;
				if (!open) taskToEdit = null;
			}}
			bind:isDeleteDialogOpen={isDeleteDialogOpen}
			bind:taskToDelete={taskToDelete}
			bind:isDeletingTask={isDeletingTask}
			{confirmDeleteTask}
			{cancelDeleteTask}
			onDeleteTask={handleDeleteTask}
		/>

	<!-- View Task Dialog -->
	<ViewTaskDialog
		bind:isOpen={isViewDialogOpen}
		task={taskToView}
		{users}
		canManageTask={$currentUser?.uid === project.ownerId}
		onAddComment={handleAddComment}
		onEditTask={handleEditTask}
		onDeleteTask={handleDeleteTask}
		{isSubmittingComment}
		onOpenChange={(open) => {
			isViewDialogOpen = open;
			if (!open) taskToView = null;
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

    

<script lang="ts">
    import type { Project, UserProfile, Task, Team } from "$lib/types/types";
    import { Button } from "$lib/components/ui/button";
    import {
        Dialog,
        DialogContent,
        DialogHeader,
        DialogTitle,
        DialogDescription,
        DialogFooter,
    } from "$lib/components/ui/dialog";
    import { Plus, Loader2 } from "@lucide/svelte";
    import EditTaskDialog from "./EditTaskDialog.svelte";
    import ViewTaskDialog from "./ViewTaskDialog.svelte";
    import AddTaskDialog from "./AddTaskDialog.svelte";
    import { onMount } from "svelte";
    import { writable, get } from "svelte/store";
    import {
        draggableTask,
        droppableColumn,
        droppableTask,
        setupKanbanMonitor,
        dragState,
    } from "$queries/useDragAndDrop";
    import { queryClient } from "$lib/queryClient";
    import { currentUser } from "$lib/stores/auth";
    import { toast } from "svelte-sonner";
    import TaskCard from "./TaskCard.svelte";
    import KanbanColumn from "./KanbanColumn.svelte";
    import DeleteTaskDialog from "./DeleteTaskDialog.svelte";
    import { createProjectPermissions } from "$lib/client/permissions";
    import { withLoading } from "$lib/utils/loading";

    let {
        project,
        users = [],
        team,
        onProjectUpdate = () => Promise.resolve(),
        onAddTask,
    }: {
        project: Project;
        users?: UserProfile[];
        team?: Team;
        onProjectUpdate?: () => Promise<void>;
        onAddTask?: () => void;
    } = $props();

    // Permission checks
    const permissions = $derived(
        team ? createProjectPermissions(project, team) : null,
    );
    const canManageTasks = $derived($permissions?.canManageTasks() ?? false);

    let isLoading = $state(false);
    const tasksStore = writable<Task[]>([]);
    let cleanupMonitor: () => void;

    // Edit dialog state
    let isEditDialogOpen = $state(false);
    let taskToEdit: Task | null = $state(null);
    let isSubmittingTaskEdit = $state(false);

    // View dialog state
    let isViewDialogOpen = $state(false);
    let taskToView: Task | null = $state(null);
    let isSubmittingComment = $state(false);
    let isDeleteDialogOpen = $state(false);
    let taskToDelete: Task | null = $state(null);
    let isDeletingTask = $state(false);

    // Add task dialog state
    let isAddDialogOpen = $state(false);
    let selectedColumnId: string | null = $state(null);
    let isSubmittingTaskAdd = $state(false);

    // Initialize tasks from project
    $effect(() => {
        if (project?.tasks) {
            tasksStore.set(
                project.tasks.filter(
                    (task) => task && typeof task === "object" && task.id,
                ),
            );
        }
    });

    // Setup drag-and-drop monitor
    onMount(() => {
        cleanupMonitor = setupKanbanMonitor(
            tasksStore,
            async (
                updates: Array<{ taskId: string; changes: Partial<Task> }>,
            ) => {
                let savingToastId: string | number | undefined;

                try {
                    // Show saving state and toast
                    dragState.update((state) => ({ ...state, isSaving: true }));
                    savingToastId = toast.loading("Saving task position...");

                    await withLoading(async () => {
                        // Group updates by taskId to avoid duplicate calls
                        const uniqueUpdates = new Map<string, Partial<Task>>();

                        for (const update of updates) {
                            const { taskId, changes } = update;
                            if (!uniqueUpdates.has(taskId)) {
                                uniqueUpdates.set(taskId, changes);
                            } else {
                                // Merge changes if there are multiple updates for the same task
                                const existing = uniqueUpdates.get(taskId)!;
                                uniqueUpdates.set(taskId, {
                                    ...existing,
                                    ...changes,
                                });
                            }
                        }

                        // Process each unique update - prioritize move operations
                        const movePromises: Promise<void>[] = [];

                        for (const [
                            taskId,
                            changes,
                        ] of uniqueUpdates.entries()) {
                            // Check if this is a move operation (columnId or order changed)
                            if (
                                changes.columnId !== undefined ||
                                changes.order !== undefined
                            ) {
                                // Get the task from the store to determine the new column and order
                                const task = get(tasksStore).find(
                                    (t) => t.id === taskId,
                                );
                                if (task) {
                                    const newColumnId =
                                        changes.columnId ?? task.columnId;
                                    const newOrder =
                                        changes.order ?? task.order;

                                    // Use the server-side API for proper positioning
                                    const user = get(currentUser);
                                    if (!user) {
                                        throw new Error(
                                            "User not authenticated",
                                        );
                                    }

                                    const idToken = await user.getIdToken();

                                    movePromises.push(
                                        fetch("/api/move-task", {
                                            method: "POST",
                                            headers: {
                                                "Content-Type":
                                                    "application/json",
                                                Authorization: `Bearer ${idToken}`,
                                            },
                                            body: JSON.stringify({
                                                projectId: project.id,
                                                taskId,
                                                newColumnId,
                                                newOrder,
                                            }),
                                        }).then((response) => {
                                            if (!response.ok) {
                                                throw new Error(
                                                    "Failed to move task",
                                                );
                                            }
                                        }),
                                    );
                                }
                            }
                        }

                        // Wait for all move operations to complete
                        await Promise.all(movePromises);
                    });

                    toast.success("Task position saved successfully");
                    toast.dismiss(savingToastId);
                    dragState.update((state) => ({
                        ...state,
                        isSaving: false,
                    }));

                    // No need to invalidate queries - we already have optimistic updates
                } catch (error) {
                    console.error(
                        "Error updating tasks after drag and drop:",
                        error,
                    );
                    toast.error("Failed to save task position");
                    toast.dismiss(savingToastId);
                    dragState.update((state) => ({
                        ...state,
                        isSaving: false,
                    }));
                    // Re-throw to trigger rollback in drag handler
                    throw error;
                }
            },
        );

        return () => {
            if (cleanupMonitor) cleanupMonitor();
        };
    });

    function handleAddTask(event?: MouseEvent, columnId?: string) {
        selectedColumnId = columnId || project.columns[0]?.id || null;
        isAddDialogOpen = true;
    }

    async function handleAddTaskSubmit(
        taskData: any,
        columnId: string,
        cardTypeId?: string,
    ) {
        const user = get(currentUser);
        if (!user) {
            toast.error("You must be logged in to add tasks");
            return;
        }

        isSubmittingTaskAdd = true;
        try {
            await withLoading(async () => {
                // Get Firebase ID token for authentication
                const idToken = await user.getIdToken();

                const response = await fetch("/api/add-task", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        projectId: project.id,
                        taskData: {
                            ...taskData,
                            reporterId: user.uid,
                            ...(cardTypeId && { cardTypeId }),
                        },
                        columnId,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to add task");
                }

                const result = await response.json();
                const newTask = result.task;

                // Update the tasks store with the new task
                tasksStore.update((tasks) =>
                    [...tasks, newTask].filter(
                        (task) => task && typeof task === "object" && task.id,
                    ),
                );

                toast.success("Task added successfully");
            });
        } catch (error) {
            console.error("Error adding task:", error);
            toast.error("Failed to add task");
            throw error;
        } finally {
            isSubmittingTaskAdd = false;
        }
    }

    function handleEditTask(task: Task) {
        taskToEdit = task;
        isEditDialogOpen = true;
    }

    function handleDeleteTask(taskId: string) {
        const task = $tasksStore.find((t) => t.id === taskId);
        if (task) {
            taskToDelete = task;
            isDeleteDialogOpen = true;
        }
    }

    async function confirmDeleteTask() {
        if (!taskToDelete) return;

        const user = get(currentUser);
        if (!user) {
            toast.error("You must be logged in to delete tasks");
            return;
        }

        isDeletingTask = true;
        try {
            await withLoading(async () => {
                // Get Firebase ID token for authentication
                const idToken = await user.getIdToken();

                const response = await fetch("/api/delete-task", {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        projectId: project.id,
                        taskId: taskToDelete!.id,
                        currentUserUid: user.uid,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to delete task");
                }

                // Remove task from store
                tasksStore.update((tasks) =>
                    tasks
                        .filter((t) => t.id !== taskToDelete!.id)
                        .filter(
                            (task) =>
                                task && typeof task === "object" && task.id,
                        ),
                );

                // Close dialogs if the deleted task was being viewed
                if (taskToView?.id === taskToDelete!.id) {
                    isViewDialogOpen = false;
                    taskToView = null;
                }

                toast.success("Task deleted successfully");
                isDeleteDialogOpen = false;
                taskToDelete = null;
            });
        } catch (error) {
            console.error("Error deleting task:", error);
            toast.error("Failed to delete task");
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
        const user = get(currentUser);
        if (!user) {
            toast.error("You must be logged in to add comments");
            return;
        }

        isSubmittingComment = true;
        try {
            await withLoading(async () => {
                // Get Firebase ID token for authentication
                const idToken = await user.getIdToken();

                const response = await fetch("/api/add-comment", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        projectId: project.id,
                        taskId,
                        commentText,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to add comment");
                }

                const responseData = await response.json();
                const updatedTask = responseData.task;

                if (!updatedTask || !updatedTask.id) {
                    throw new Error("Invalid task data received from API");
                }

                // Update the task in the store with the new comment
                tasksStore.update((tasks) =>
                    tasks
                        .map((task) =>
                            task.id === taskId ? updatedTask : task,
                        )
                        .filter(
                            (task) =>
                                task && typeof task === "object" && task.id,
                        ),
                );

                // Update the taskToView if it's the same task
                if (taskToView?.id === taskId) {
                    taskToView = updatedTask;
                }
            });
        } catch (error) {
            console.error("Error adding comment:", error);
            throw error; // Re-throw to let ViewTaskDialog handle the error
        } finally {
            isSubmittingComment = false;
        }
    }

    async function handleEditComment(
        taskId: string,
        commentId: string,
        newContent: string,
    ) {
        const user = get(currentUser);
        if (!user) {
            toast.error("You must be logged in to edit comments");
            return;
        }

        try {
            await withLoading(async () => {
                // Get Firebase ID token for authentication
                const idToken = await user.getIdToken();

                const response = await fetch("/api/edit-comment", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        projectId: project.id,
                        taskId,
                        commentId,
                        newContent,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to edit comment");
                }

                // Update the task in the store with the edited comment
                const responseData = await response.json();
                const updatedTask = responseData.task;

                if (!updatedTask || !updatedTask.id) {
                    throw new Error("Invalid task data received from API");
                }

                tasksStore.update((tasks) =>
                    tasks
                        .map((task) =>
                            task.id === taskId ? updatedTask : task,
                        )
                        .filter(
                            (task) =>
                                task && typeof task === "object" && task.id,
                        ),
                );

                // Update taskToView if it's the same task
                if (taskToView?.id === taskId) {
                    taskToView = updatedTask;
                }

                toast.success("Comment updated successfully");
            });
        } catch (error) {
            console.error("Error editing comment:", error);
            toast.error("Failed to edit comment");
            throw error;
        }
    }

    async function handleDeleteComment(taskId: string, commentId: string) {
        const user = get(currentUser);
        if (!user) {
            toast.error("You must be logged in to delete comments");
            return;
        }

        try {
            await withLoading(async () => {
                // Get Firebase ID token for authentication
                const idToken = await user.getIdToken();

                const response = await fetch("/api/delete-comment", {
                    method: "DELETE",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        projectId: project.id,
                        taskId,
                        commentId,
                        currentUserUid: user.uid,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to delete comment");
                }

                // Update the task in the store with the comment removed
                const responseData = await response.json();
                const updatedTask = responseData.task;

                if (!updatedTask || !updatedTask.id) {
                    throw new Error("Invalid task data received from API");
                }

                tasksStore.update((tasks) =>
                    tasks
                        .map((task) =>
                            task.id === taskId ? updatedTask : task,
                        )
                        .filter(
                            (task) =>
                                task && typeof task === "object" && task.id,
                        ),
                );

                // Update taskToView if it's the same task
                if (taskToView?.id === taskId) {
                    taskToView = updatedTask;
                }
            });

            toast.success("Comment deleted successfully");
        } catch (error) {
            console.error("Error deleting comment:", error);
            toast.error("Failed to delete comment");
            throw error;
        }
    }

    async function handleMoveToNextColumn(task: Task) {
        const currentColumnIndex = project.columns.findIndex(
            (col) => col.id === task.columnId,
        );
        if (currentColumnIndex < project.columns.length - 1) {
            const nextColumn = project.columns[currentColumnIndex + 1];
            await handleUpdateTask(task.id, { columnId: nextColumn.id });
        }
    }

    async function handleMoveToPreviousColumn(task: Task) {
        const currentColumnIndex = project.columns.findIndex(
            (col) => col.id === task.columnId,
        );
        if (currentColumnIndex > 0) {
            const prevColumn = project.columns[currentColumnIndex - 1];
            await handleUpdateTask(task.id, { columnId: prevColumn.id });
        }
    }

    async function handleUpdateTask(
        taskId: string,
        updatedFields: Partial<Task>,
    ) {
        const user = get(currentUser);
        if (!user) {
            toast.error("You must be logged in to update tasks");
            return;
        }

        isSubmittingTaskEdit = true;
        try {
            // Optimistically update the UI first
            let updatedTask: Task;
            tasksStore.update((tasks) =>
                tasks.map((task) => {
                    if (task.id === taskId) {
                        updatedTask = { ...task, ...updatedFields };
                        return updatedTask;
                    }
                    return task;
                }),
            );

            // Update taskToView if it's the same task
            if (taskToView?.id === taskId) {
                taskToView = updatedTask!;
            }

            await withLoading(async () => {
                // Get Firebase ID token for authentication
                const idToken = await user.getIdToken();

                const response = await fetch("/api/update-task", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${idToken}`,
                    },
                    body: JSON.stringify({
                        projectId: project.id,
                        taskId,
                        updatedFields,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Failed to update task");
                }
            });

            toast.success("Task updated successfully");
        } catch (error) {
            console.error("Error updating task:", error);
            toast.error("Failed to update task");
            // Revert optimistic update on error
            await queryClient.invalidateQueries({
                queryKey: ["project", project.id],
            });
        } finally {
            isSubmittingTaskEdit = false;
        }
    }
</script>

<div class="kanban-board relative">
    {#if isLoading}
        <div
            class="flex items-center justify-center h-full text-muted-foreground"
        >
            <Loader2 class="h-8 w-8 animate-spin mr-2" /> Loading project board...
        </div>
    {:else}
        {#if $dragState.isSaving}
            <div
                class="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex items-center justify-center"
            >
                <div
                    class="bg-background border rounded-lg p-4 flex items-center gap-2 shadow-lg"
                >
                    <Loader2 class="h-4 w-4 animate-spin" />
                    <span class="text-sm font-medium"
                        >Saving task position...</span
                    >
                </div>
            </div>
        {/if}
        <div class="flex flex-col h-full">
            <div class="flex-1 p-4 h-full overflow-x-auto">
                <!-- Fixed Header Row -->
                <div
                    class="flex gap-4 sticky top-0 z-30 bg-background/95 backdrop-blur-sm pb-2"
                >
                    {#each project.columns as column (column.id)}
                        <div class="w-80 flex-shrink-0">
                            <h3
                                class="font-medium text-center bg-muted/50 rounded-lg px-4 py-2 shadow-sm"
                            >
                                {column.title}
                            </h3>
                        </div>
                    {/each}
                </div>

                <!-- Scrollable Content -->
                <div
                    class="flex gap-4 h-full pb-4 items-stretch"
                >
                    {#each project.columns as column (column.id)}
                        {@const hasTasks = $tasksStore.some(task => task.columnId === column.id)}
                        <div
                            class="bg-muted/50 rounded-lg p-4 transition-all duration-200 flex-shrink-0 w-80 flex flex-col"
                            class:ring-2={$dragState.isOverColumnId ===
                                column.id}
                            class:ring-primary={$dragState.isOverColumnId ===
                                column.id}
                            class:ring-offset-2={$dragState.isOverColumnId ===
                                column.id}
                            use:droppableColumn={{ columnId: hasTasks ? '' : column.id }}
                        >
                             <div class="flex-1 pt-2">
                                {#each $tasksStore
                                    .filter((task) => task.columnId === column.id)
                                    .sort((a, b) => a.order - b.order) as task, index (task.id)}
                                    <!-- Insertion preview indicator BEFORE the target task -->
                                     {#if $dragState.insertionPreview && $dragState.insertionPreview.columnId === column.id && $dragState.insertionPreview.afterTaskId === task.id}
                                         <div class="relative mb-2 pointer-events-none">
                                             <div
                                                 class="h-2 bg-primary/30 rounded-md border-2 border-dashed border-primary animate-pulse transition-all duration-200"
                                             ></div>
                                            {#if $dragState.movingTaskId}
                                                {@const movingTask =
                                                    $tasksStore.find(
                                                        (t) =>
                                                            t.id ===
                                                            $dragState.movingTaskId,
                                                    )}
                                                 {#if movingTask}
                                                     <div
                                                         class="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium z-[100] whitespace-nowrap -translate-y-full pointer-events-none"
                                                     >
                                                        Drop "{movingTask.title}"
                                                        here (position {index +
                                                            1})
                                                    </div>
                                                {/if}
                                            {/if}
                                        </div>
                                    {/if}

                                     {@const columnTasks = $tasksStore
                                         .filter(
                                             (t) =>
                                                 t.columnId === column.id &&
                                                 t.id !== $dragState.movingTaskId,
                                         )
                                         .sort((a, b) => a.order - b.order)}
                                     {@const insertionIndex = $dragState.insertionPreview &&
                                         $dragState.insertionPreview.columnId === column.id &&
                                         $dragState.insertionPreview.afterTaskId
                                         ? columnTasks.findIndex(
                                             (t) =>
                                                 t.id ===
                                                 $dragState.insertionPreview
                                                     ?.afterTaskId,
                                         )
                                         : -1}
                                     {@const nextTask = columnTasks[index + 1]}
                                     <div
                                         class="transition-all duration-200 mb-2 relative"
                                         class:opacity-50={$dragState.isDragging &&
                                             $dragState.movingTaskId === task.id}
                                         class:transform={insertionIndex !== -1 && index >= insertionIndex}
                                         class:translate-y-4={insertionIndex !== -1 && index >= insertionIndex}
                                         class:top-glow={$dragState.isDragging && $dragState.insertionPreview?.afterTaskId === task.id}
                                         class:bottom-glow={$dragState.isDragging && (
                                             (nextTask && $dragState.insertionPreview?.afterTaskId === nextTask.id) ||
                                             (!nextTask && !$dragState.insertionPreview?.afterTaskId && $dragState.insertionPreview?.columnId === column.id)
                                         )}
                                         use:draggableTask={{ task }}
                                     >
                                        <TaskCard
                                            {task}
                                            {users}
                                            projectColumns={project.columns}
                                            canManageTask={canManageTasks ||
                                                (task.assigneeUids?.includes(
                                                    $currentUser?.uid || "",
                                                ) ??
                                                    false)}
                                            cardTypes={project.cardTypes || []}
                                            onEdit={(t: Task) =>
                                                handleEditTask(t)}
                                            onDelete={(taskId: string) =>
                                                handleDeleteTask(taskId)}
                                            onViewDetails={(t: Task) =>
                                                handleViewTaskDetails(t)}
                                            onMoveToNextColumn={(t: Task) =>
                                                handleMoveToNextColumn(t)}
                                            onMoveToPreviousColumn={(t: Task) =>
                                                handleMoveToPreviousColumn(t)}
                                            isSubmitting={$dragState.movingTaskId ===
                                                task.id}
                                             onUpdateTask={(
                                                 taskId: string,
                                                 updatedFields: Partial<Task>,
                                             ) =>
                                                 handleUpdateTask(
                                                     taskId,
                                                     updatedFields,
                                                 )}
                                         />
                                         <!-- Top half drop zone: insert before this task -->
                                         {#if $dragState.movingTaskId !== task.id}
                                             <div
                                                 class="absolute top-0 left-0 w-full h-1/2"
                                                 use:droppableTask={{
                                                     taskId: task.id,
                                                     columnId: column.id,
                                                 }}
                                             ></div>
                                         {/if}
                                         <!-- Bottom half drop zone: insert after this task -->
                                         {#if $dragState.movingTaskId !== task.id}
                                             {#if nextTask}
                                                 <div
                                                     class="absolute bottom-0 left-0 w-full h-1/2"
                                                     use:droppableTask={{
                                                         taskId: nextTask.id,
                                                         columnId: column.id,
                                                     }}
                                                 ></div>
                                             {:else}
                                                 <div
                                                     class="absolute bottom-0 left-0 w-full h-1/2"
                                                     use:droppableColumn={{ columnId: column.id }}
                                                 ></div>
                                             {/if}
                                         {/if}
                                     </div>
                                {/each}

                                <!-- Insertion preview at end of column -->
                                 {#if $dragState.insertionPreview && $dragState.insertionPreview.columnId === column.id && !$dragState.insertionPreview.afterTaskId}
                                     <div class="relative" use:droppableColumn={{ columnId: column.id }}>
                                         <div
                                             class="h-2 bg-primary/30 rounded-md border-2 border-dashed border-primary animate-pulse transition-all duration-200"
                                         ></div>
                                        {#if $dragState.movingTaskId}
                                            {@const movingTask =
                                                $tasksStore.find(
                                                    (t) =>
                                                        t.id ===
                                                        $dragState.movingTaskId,
                                                )}
                                            {@const columnTasks =
                                                $tasksStore.filter(
                                                    (t) =>
                                                        t.columnId ===
                                                        column.id,
                                                )}
                                            {#if movingTask}
                                                <div
                                                    class="absolute -top-1 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium z-50 whitespace-nowrap -translate-y-full"
                                                >
                                                    Drop "{movingTask.title}"
                                                    here (position {columnTasks.length +
                                                        1})
                                                </div>
                                            {/if}
                                        {/if}
                                    </div>
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
        {taskToEdit}
        assignableUsers={users}
        canManageTask={$currentUser?.uid === project.ownerId}
        onEditTask={handleUpdateTask}
        onOpenChange={(open) => {
            isEditDialogOpen = open;
            if (!open) taskToEdit = null;
        }}
        isSubmitting={isSubmittingTaskEdit}
        bind:isDeleteDialogOpen
        bind:taskToDelete
        bind:isDeletingTask
        {confirmDeleteTask}
        {cancelDeleteTask}
        onDeleteTask={handleDeleteTask}
    />

    <!-- View Task Dialog -->
    <ViewTaskDialog
        bind:isOpen={isViewDialogOpen}
        task={taskToView}
        {users}
        onAddComment={handleAddComment}
        onEditComment={handleEditComment}
        onDeleteComment={handleDeleteComment}
        currentUserId={$currentUser?.uid}
        cardTypes={project.cardTypes || []}
        onUpdateTask={handleUpdateTask}
        assignableUsers={users}
        canManageTask={canManageTasks}
        onOpenChange={(open: boolean) => {
            isViewDialogOpen = open;
            if (!open) taskToView = null;
        }}
    />

    <!-- Delete Task Confirmation Dialog -->
    <DeleteTaskDialog
        bind:isOpen={isDeleteDialogOpen}
        task={taskToDelete}
        isDeleting={isDeletingTask}
        onConfirm={confirmDeleteTask}
        onCancel={cancelDeleteTask}
    />

    <!-- Add Task Dialog -->
    <AddTaskDialog
        bind:isOpen={isAddDialogOpen}
        onOpenChange={(open) => {
            isAddDialogOpen = open;
            if (!open) selectedColumnId = null;
        }}
        onAddTask={handleAddTaskSubmit}
        columnId={selectedColumnId}
        assignableUsers={users}
        isSubmitting={isSubmittingTaskAdd}
        cardTypes={project.cardTypes || []}
    />
</div>

<style>
    .kanban-board {
        height: 100%;
        display: flex;
        flex-direction: column;
    }

    .top-glow::before {
        content: '';
        position: absolute;
        top: -2px;
        left: 15%;
        width: 70%;
        height: 2px;
        background: #ef4444;
        box-shadow: 0 -2px 8px 0 #ef4444, 0 -1px 4px 0 #ef4444;
        border-radius: 8px 8px 0 0;
        animation: top-glow-pulse 1.5s ease-in-out infinite;
    }

    .bottom-glow::after {
        content: '';
        position: absolute;
        bottom: -2px;
        left: 15%;
        width: 70%;
        height: 2px;
        background: #ef4444;
        box-shadow: 0 2px 8px 0 #ef4444, 0 1px 4px 0 #ef4444;
        border-radius: 0 0 8px 8px;
        animation: bottom-glow-pulse 1.5s ease-in-out infinite;
    }

    @keyframes top-glow-pulse {
        0%, 100% {
            box-shadow: 0 -2px 8px 0 #ef4444, 0 -1px 4px 0 #ef4444;
        }
        50% {
            box-shadow: 0 -4px 12px 0 #ef4444, 0 -2px 6px 0 #ef4444;
        }
    }

    @keyframes bottom-glow-pulse {
        0%, 100% {
            box-shadow: 0 2px 8px 0 #ef4444, 0 1px 4px 0 #ef4444;
        }
        50% {
            box-shadow: 0 4px 12px 0 #ef4444, 0 2px 6px 0 #ef4444;
        }
    }
</style>

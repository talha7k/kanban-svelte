// src/lib/dnd/kanban-dnd.ts

import { writable, get } from 'svelte/store';
import type { Writable } from 'svelte/store';
import {
  draggable,
  dropTargetForElements,
  monitorForElements,
} from '@atlaskit/pragmatic-drag-and-drop/element/adapter';
import { pointerOutsideOfPreview } from '@atlaskit/pragmatic-drag-and-drop/element/pointer-outside-of-preview';
import { setCustomNativeDragPreview } from '@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview';
import type { Task } from '$lib/types/types';

// Type definition for the data associated with a draggable task
type DraggableTaskData = {
  task: Task;
  type: 'task';
};

// Type definition for the data associated with a drop-target column
type DroppableColumnData = {
  columnId: string;
  type: 'column';
};

// Type definition for the data associated with a drop-target task (for reordering)
type DroppableTaskData = {
  taskId: string;
  columnId: string;
  type: 'task';
};

// A store to hold the state of the current drag operation for UI feedback
export const dragState = writable<{
  isDragging: boolean;
  isOverColumnId: string | null;
  isOverTaskId: string | null;
  movingTaskId: string | null;
  isSaving: boolean;
  insertionPreview: {
    columnId: string;
    afterTaskId: string | null;
  } | null;
}>({
  isDragging: false,
  isOverColumnId: null,
  isOverTaskId: null,
  movingTaskId: null,
  isSaving: false,
  insertionPreview: null,
});

/**
 * ## Svelte Action: `draggableTask`
 * Makes a DOM element a draggable task.
 * * @param node - The HTML element.
 * @param data - The task data associated with this element.
 */
export function draggableTask(node: HTMLElement, data: { task: Task }) {
  const { task } = data;
  const cleanup = draggable({
    element: node,
    getInitialData: (): DraggableTaskData => ({ task, type: 'task' }),
    onGenerateDragPreview: ({ nativeSetDragImage }) => {
      // Hides the default browser preview so we can use our own overlay
      setCustomNativeDragPreview({
        nativeSetDragImage,
        render: ({ container }) => {
          // This makes the preview invisible, but keeps the drag operation alive.
          // You will render your own preview/overlay in the component.
          Object.assign(container.style, { opacity: '0' });
          return () => {}; // Cleanup function
        },
      });
    },
    onDragStart: () => {
      dragState.update(state => ({ ...state, isDragging: true, movingTaskId: task.id, isSaving: false }));
    },
    onDrop: () => {
      dragState.set({ isDragging: false, isOverColumnId: null, isOverTaskId: null, movingTaskId: null, isSaving: false, insertionPreview: null });
    },
  });

  return {
    destroy: cleanup,
  };
}

/**
 * ## Svelte Action: `droppableColumn`
 * Makes a DOM element a drop target for tasks.
 *
 * @param node - The HTML element.
 * @param data - The column ID associated with this element.
 */
export function droppableColumn(node: HTMLElement, data: { columnId: string }) {
  const { columnId } = data;
  const cleanup = dropTargetForElements({
    element: node,
    getData: (): DroppableColumnData => ({ columnId, type: 'column' }),
    onDragEnter: () => {
      dragState.update(state => ({ ...state, isOverColumnId: columnId, isSaving: false, insertionPreview: { columnId, afterTaskId: null } }));
    },
    onDragLeave: () => {
      dragState.update(state => (state.isOverColumnId === columnId ? { ...state, isOverColumnId: null, isOverTaskId: null, isSaving: false, insertionPreview: null } : state));
    },
    onDrop: () => {
      dragState.update(state => ({ ...state, isOverColumnId: null, isOverTaskId: null, isSaving: false, insertionPreview: null }));
    },
  });

  return {
    destroy: cleanup,
  };
}

/**
 * ## Svelte Action: `droppableTask`
 * Makes a DOM element a drop target for reordering tasks.
 *
 * @param node - The HTML element.
 * @param data - The task ID and column ID associated with this element.
 */
export function droppableTask(node: HTMLElement, data: { taskId: string; columnId: string }) {
  const { taskId, columnId } = data;
  const cleanup = dropTargetForElements({
    element: node,
    getData: (): DroppableTaskData => ({ taskId, columnId, type: 'task' }),
    onDragEnter: () => {
      dragState.update(state => ({ ...state, isOverTaskId: taskId, isSaving: false, insertionPreview: { columnId, afterTaskId: taskId } }));
    },
    onDragLeave: () => {
      dragState.update(state => (state.isOverTaskId === taskId ? { ...state, isOverTaskId: null, isSaving: false, insertionPreview: null } : state));
    },
    onDrop: () => {
      dragState.update(state => ({ ...state, isOverTaskId: null, isSaving: false, insertionPreview: null }));
    },
  });

  return {
    destroy: cleanup,
  };
}

/**
 * ## Setup Function: `setupKanbanMonitor`
 * Creates and registers the central monitor to handle all drag-and-drop logic.
 * This should be called once in your main Kanban component.
 * * @param tasksStore - The writable store containing all tasks.
 * @param onUpdateTasks - The function to call to persist batched changes.
 * @returns A cleanup function to be called when the component is destroyed.
 */
export function setupKanbanMonitor(
  tasksStore: Writable<Task[]>,
  onUpdateTasks: (updates: { taskId: string; changes: Partial<Task> }[]) => Promise<void>
) {
  let initialTasks: Task[] = [];

  const cleanupMonitor = monitorForElements({
    onDragStart({ source }) {
      // Store the initial state when drag starts, for diffing and rollbacks
      initialTasks = get(tasksStore);
    },
    onDrop({ location, source }) {
      const targets = location.current.dropTargets;
      if (!targets || targets.length === 0) return; // Dropped outside a valid target

      const sourceData = source.data as DraggableTaskData;
      if (sourceData.type !== 'task') return;
      
      const draggedTask = sourceData.task;
      
      // Find the target - prioritize task drops for reordering, fallback to column drops
      let targetTask = targets.find(t => (t.data as DroppableTaskData).type === 'task');
      let targetColumn = targets.find(t => (t.data as DroppableColumnData).type === 'column');

      let newColumnId: string;
      let insertAfterTaskId: string | null = null;

      if (targetTask) {
        // Dropping on another task for reordering
        const targetTaskData = targetTask.data as DroppableTaskData;
        newColumnId = targetTaskData.columnId;
        insertAfterTaskId = targetTaskData.taskId;
      } else if (targetColumn) {
        // Dropping on a column (empty space or end of column)
        const targetColumnData = targetColumn.data as DroppableColumnData;
        newColumnId = targetColumnData.columnId;
        insertAfterTaskId = null; // Will add to end
      } else {
        return; // No valid target
      }

      // --- Calculate the new state ---
      const finalTasks = [...initialTasks];
      const draggedTaskIndex = finalTasks.findIndex(t => t.id === draggedTask.id);
      
      if (draggedTaskIndex === -1) return;

      // Remove the task from its original position
      const [movedTask] = finalTasks.splice(draggedTaskIndex, 1);
      movedTask.columnId = newColumnId;

      // Find the new position
      const tasksInNewColumn = finalTasks
        .filter(t => t.columnId === newColumnId)
        .sort((a, b) => a.order - b.order);

      let newOrder = 0;
      let insertIndex = 0;
      
      if (insertAfterTaskId) {
        const targetTaskIndex = tasksInNewColumn.findIndex(t => t.id === insertAfterTaskId);
        if (targetTaskIndex !== -1) {
          // Insert BEFORE the target task (where the indicator shows)
          if (targetTaskIndex === 0) {
            // Insert at the beginning
            newOrder = tasksInNewColumn[0].order - 1;
            insertIndex = 0;
          } else {
            // Insert between previous task and target task
            const prevOrder = tasksInNewColumn[targetTaskIndex - 1].order;
            const targetOrder = tasksInNewColumn[targetTaskIndex].order;
            newOrder = (prevOrder + targetOrder) / 2;
            insertIndex = targetTaskIndex;
          }
        } else {
          // Target task not found, add to end
          newOrder = tasksInNewColumn.length > 0 ? tasksInNewColumn[tasksInNewColumn.length - 1].order + 1 : 0;
          insertIndex = tasksInNewColumn.length;
        }
      } else {
        // Add to end of column
        newOrder = tasksInNewColumn.length > 0 ? tasksInNewColumn[tasksInNewColumn.length - 1].order + 1 : 0;
        insertIndex = tasksInNewColumn.length;
      }

      // Update the moved task
      movedTask.order = newOrder;
      
      // Insert the task at the correct position in finalTasks
      const finalTasksWithoutMoved = finalTasks.filter(t => t.id !== movedTask.id);
      finalTasksWithoutMoved.push(movedTask);

      // Build the final task state with proper sequential ordering
      const finalTaskState = [...finalTasksWithoutMoved];
      
      // Reorder all tasks in affected columns to have sequential orders
      const affectedColumns = [newColumnId];
      if (draggedTask.columnId !== newColumnId) {
        affectedColumns.push(draggedTask.columnId);
      }

      affectedColumns.forEach(columnId => {
        const columnTasks = finalTaskState
          .filter(t => t.columnId === columnId)
          .sort((a, b) => a.order - b.order);

        columnTasks.forEach((task, index) => {
          task.order = index;
        });
      });

      // Build updates for persistence - only send the moved task's new position
      const updates: { taskId: string; changes: Partial<Task> }[] = [];
      
      // Find the final order of the moved task after reordering
      const finalMovedTaskOrder = finalTaskState
        .filter(t => t.columnId === newColumnId)
        .sort((a, b) => a.order - b.order)
        .findIndex(t => t.id === movedTask.id);
      
      updates.push({
        taskId: movedTask.id,
        changes: { order: finalMovedTaskOrder, columnId: newColumnId },
      });

      if (updates.length > 0) {
        // Optimistically update the UI
        tasksStore.set(finalTaskState);
        // Persist changes to the backend
        onUpdateTasks(updates).catch(error => {
          console.error("Failed to save D&D changes, rolling back.", error);
          // On failure, roll back to the original state
          tasksStore.set(initialTasks);
        });
      }
    },
  });

  return cleanupMonitor;
}
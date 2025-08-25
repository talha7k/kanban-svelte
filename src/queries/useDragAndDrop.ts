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

// A store to hold the state of the current drag operation for UI feedback
export const dragState = writable<{
  isDragging: boolean;
  isOverColumnId: string | null;
}>({
  isDragging: false,
  isOverColumnId: null,
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
      dragState.update(state => ({ ...state, isDragging: true }));
    },
    onDrop: () => {
      dragState.set({ isDragging: false, isOverColumnId: null });
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
      dragState.update(state => ({ ...state, isOverColumnId: columnId }));
    },
    onDragLeave: () => {
      dragState.update(state => (state.isOverColumnId === columnId ? { ...state, isOverColumnId: null } : state));
    },
    onDrop: () => {
      dragState.update(state => ({ ...state, isOverColumnId: null }));
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
      const target = location.current.dropTargets[0];
      if (!target) return; // Dropped outside a valid target

      const sourceData = source.data as DraggableTaskData;
      const targetData = target.data as DroppableColumnData;
      
      if (sourceData.type !== 'task' || targetData.type !== 'column') return;
      
      const draggedTask = sourceData.task;
      const newColumnId = targetData.columnId;

      // --- Calculate the new state ---
      const finalTasks = [...initialTasks];
      const draggedTaskIndex = finalTasks.findIndex(t => t.id === draggedTask.id);
      
      if (draggedTaskIndex === -1) return;

      // Remove the task from its original position
      const [movedTask] = finalTasks.splice(draggedTaskIndex, 1);

      // Find the new position in the target column
      const tasksInNewColumn = finalTasks
        .filter(t => t.columnId === newColumnId)
        .sort((a, b) => a.order - b.order);
      
      // For this example, we add it to the end. For more complex reordering,
      // you would check if the drop was over another task to find the exact index.
      const newIndexInColumn = tasksInNewColumn.length;
      tasksInNewColumn.splice(newIndexInColumn, 0, movedTask);
      
      // Re-assign order and columnId for all affected tasks
      const updates: { taskId: string; changes: Partial<Task> }[] = [];
      const tasksToUpdate = [
        ...tasksInNewColumn, // Tasks in the new column
        ...finalTasks.filter(t => t.columnId !== newColumnId) // Other tasks
      ];

      const finalTaskStateWithCorrectOrder = tasksToUpdate.map(task => {
        const columnTasks = tasksToUpdate.filter(t => t.columnId === task.columnId).sort((a,b) => a.order - b.order);
        const order = columnTasks.findIndex(t => t.id === task.id);
        const columnId = task.id === draggedTask.id ? newColumnId : task.columnId;

        return { ...task, order, columnId };
      });

      // --- Diff final state with initial state to find changes ---
      const initialTaskMap = new Map(initialTasks.map(t => [t.id, t]));
      finalTaskStateWithCorrectOrder.forEach(task => {
        const initialTask = initialTaskMap.get(task.id);
        if (initialTask && (initialTask.order !== task.order || initialTask.columnId !== task.columnId)) {
          updates.push({
            taskId: task.id,
            changes: { order: task.order, columnId: task.columnId },
          });
        }
      });
      
      if (updates.length > 0) {
        // Optimistically update the UI
        tasksStore.set(finalTaskStateWithCorrectOrder);
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
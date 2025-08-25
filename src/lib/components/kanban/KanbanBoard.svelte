
"use client";

import type { Project, Column, Task, UserProfile, ColumnId, TaskId, NewTaskData, NewCommentData, UserProjectRole } from '@/lib/types';
import { KanbanColumn } from './KanbanColumn';
import { AddTaskDialog } from './AddTaskDialog';
import { EditTaskDialog } from './EditTaskDialog';
import { TaskDetailsDialog } from './TaskDetailsDialog';
import { TaskCard } from './TaskCard';
import { useState, useEffect, useMemo } from 'react';
import type { TaskFormData } from './TaskFormFields';
import { Button } from '@/components/ui/button';
import { Plus, Loader2, ListFilter, UserCheck, PlusCircleIcon } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/hooks/useAuth';
import {
  DndContext,
  closestCorners,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
} from '@dnd-kit/core';
import { useDragAndDrop } from '@/hooks/useDragAndDrop';
import { useTaskManagement } from '@/hooks/useTaskManagement';

interface KanbanBoardProps {
  project: Project;
  users: UserProfile[];
}

export function KanbanBoard({ project: initialProject, users }: KanbanBoardProps) {
  const [projectData, setProjectData] = useState<Project>(initialProject);
  const [isAddTaskDialogOpen, setIsAddTaskDialogOpen] = useState(false);
  const [isEditTaskDialogOpen, setIsEditTaskDialogOpen] = useState(false);
  const [isTaskDetailsDialogOpen, setIsTaskDetailsDialogOpen] = useState(false);
  const [selectedColumnIdForNewTask, setSelectedColumnIdForNewTask] = useState<ColumnId | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskViewFilter, setTaskViewFilter] = useState<'all' | 'mine'>('all');

  const { currentUser, userProfile } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setProjectData(initialProject);
  }, [initialProject]);

  const isOwner = useMemo(() => currentUser?.uid === projectData.ownerId, [currentUser, projectData.ownerId]);
  
  const currentUserProjectRole = useMemo((): UserProjectRole | null => {
    if (!currentUser || !projectData.memberRoles) return null;
    if (isOwner) return 'manager'; 
    return projectData.memberRoles[currentUser.uid] || null;
  }, [currentUser, projectData.memberRoles, isOwner]);

  const canManageTasks = useMemo(() => isOwner || currentUserProjectRole === 'manager', [isOwner, currentUserProjectRole]);

  const {
    taskToEdit,
    setTaskToEdit,
    taskToView,
    setTaskToView,
    showDeleteConfirm,
    setShowDeleteConfirm,
    taskToDeleteId,
    setTaskToDeleteId,
    handleAddTask,
    handleEditTask,
    handleUpdateTask,
    handleDeleteTask,
    handleAddComment,
  } = useTaskManagement(
    projectData.tasks,
    (tasks) => setProjectData(prev => ({ ...prev!, tasks })),
    projectData.id,
    currentUser?.uid || ''
  );

  // Update taskToView when the corresponding task in tasks array is updated
  useEffect(() => {
    if (taskToView && projectData.tasks) {
      const updatedTask = projectData.tasks.find(task => task.id === taskToView.id);
      if (updatedTask && updatedTask !== taskToView) {
        setTaskToView(updatedTask);
      }
    }
  }, [projectData.tasks, taskToView, setTaskToView]);

  // Initialize custom hooks
  const { dragHandlers, sensors, activeId, activeTask } = useDragAndDrop(
    projectData.tasks,
    (updatedTasks) => setProjectData(prev => ({ ...prev, tasks: updatedTasks })),
    currentUser?.uid || '',
    handleUpdateTask
  );

  const assignableUsers = useMemo(() => {
    if (!projectData || !users) return [];
    const projectMemberAndOwnerIds = new Set<string>([
      projectData.ownerId,
      ...(projectData.memberIds || [])
    ]);
    return users.filter(user => projectMemberAndOwnerIds.has(user.id));
  }, [projectData, users]);

  const filteredTasks = useMemo(() => {
    if (!projectData || !currentUser) return [];
    const tasksToFilter = projectData.tasks || [];
    if (taskViewFilter === 'mine') {
      return tasksToFilter.filter(task => task.assigneeUids?.includes(currentUser.uid));
    }
    return tasksToFilter;
  }, [projectData, currentUser, taskViewFilter]);

  if (!projectData || !users) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mr-2" /> Loading project board...
      </div>
    );
  }

  const allTasksForDependencies = projectData.tasks.map(t => ({ id: t.id, title: t.title }));

  // Custom collision detection that handles both column drops and task reordering
  const customCollisionDetection = (args: any) => {
    const { active, droppableContainers } = args;
    
    // Get all possible collisions
    const pointerCollisions = pointerWithin(args);
    const rectCollisions = rectIntersection(args);
    const closestCornersCollisions = closestCorners(args);
    
    // Separate task and column collisions
    const taskCollisions = closestCornersCollisions.filter(collision => 
      projectData.tasks.some(task => task.id === collision.id)
    );
    
    const columnCollisions = pointerCollisions.filter(collision => 
      projectData.columns.some(col => col.id === collision.id)
    );
    
    // If dragging over a different column than the active task's column
    const activeTask = projectData.tasks.find(task => task.id === active.id);
    if (activeTask && columnCollisions.length > 0) {
      const targetColumn = columnCollisions[0];
      
      // If it's a different column, prioritize column collision for inter-column moves
      if (targetColumn.id !== activeTask.columnId) {
        return [targetColumn];
      }
    }
    
    // For same column or no column collision, use task collisions for reordering
    if (taskCollisions.length > 0) {
      return taskCollisions;
    }
    
    // Fall back to column collisions
    if (columnCollisions.length > 0) {
      return columnCollisions;
    }
    
    // Final fallback
    return closestCornersCollisions.length > 0 ? closestCornersCollisions : rectCollisions;
  };

  const handleAddTaskWrapper = async (taskData: TaskFormData, columnId: string) => {
    setIsSubmitting(true);
    try {
      await handleAddTask(taskData, columnId);
      setIsAddTaskDialogOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditTaskWrapper = async (taskId: string, taskData: TaskFormData) => {
    setIsSubmitting(true);
    try {
      await handleEditTask(taskId, taskData);
      setIsEditTaskDialogOpen(false);
      setTaskToEdit(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTaskWrapper = async () => {
    if (!taskToDeleteId) return;
    setIsSubmitting(true);
    try {
      await handleDeleteTask(taskToDeleteId);
      setShowDeleteConfirm(false);
      setTaskToDeleteId(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTaskClick = (task: Task) => {
    setTaskToView(task);
    setIsTaskDetailsDialogOpen(true);
  };

  const handleTaskEdit = (task: Task) => {
    setTaskToEdit(task);
    setIsEditTaskDialogOpen(true);
  };

  const handleTaskDelete = (taskId: TaskId) => {
    setTaskToDeleteId(taskId);
    setShowDeleteConfirm(true);
  };

  const handleAddCommentWrapper = async (taskId: string, commentText: string) => {
    const commentData = {
      userId: currentUser?.uid || '',
      userName: userProfile?.name || currentUser?.displayName || userProfile?.email || currentUser?.email || 'Anonymous',
      content: commentText,
      ...(userProfile?.avatarUrl && { avatarUrl: userProfile.avatarUrl }),
    };
    await handleAddComment(taskId, commentData);
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b space-y-4 md:space-y-0">
        {/* Mobile: Stack vertically, Desktop: Side by side */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <h1 className="text-xl md:text-2xl font-bold">{projectData.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              <Button
                variant={taskViewFilter === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTaskViewFilter('all')}
                className="flex items-center gap-2"
              >
                <ListFilter className="h-4 w-4" />
                <span className="hidden sm:inline">All Tasks</span>
                <span className="sm:hidden">All</span>
              </Button>
              <Button
                variant={taskViewFilter === 'mine' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTaskViewFilter('mine')}
                className="flex items-center gap-2"
              >
                <UserCheck className="h-4 w-4" />
                <span className="hidden sm:inline">My Tasks</span>
                <span className="sm:hidden">Mine</span>
              </Button>
            </div>
          </div>
          {canManageTasks && (
            <Button
              onClick={() => {
                setSelectedColumnIdForNewTask(projectData.columns[0]?.id || null);
                setIsAddTaskDialogOpen(true);
              }}
              className="flex items-center gap-2 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4" />
              Add Task
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={customCollisionDetection}
          onDragStart={dragHandlers.handleDragStart}
          onDragOver={dragHandlers.handleDragOver}
          onDragEnd={dragHandlers.handleDragEnd}
        >
          {/* Mobile: Stack columns vertically, Desktop: Horizontal scroll */}
          <div className="h-full">
            <div className="flex flex-col md:flex-row gap-4 md:gap-6 p-4 md:p-6 h-full md:overflow-x-auto">
              {projectData.columns.map((column) => {
                const columnTasks = filteredTasks.filter(task => task.columnId === column.id);
                return (
                  <KanbanColumn
                    key={column.id}
                    column={column}
                    tasks={columnTasks}
                    users={assignableUsers}
                    projectColumns={projectData.columns}
                    canManageTasks={canManageTasks}
                    onAddTask={(columnId: string) => {
                        if (canManageTasks) {
                          setSelectedColumnIdForNewTask(columnId);
                          setIsAddTaskDialogOpen(true);
                        }
                      }}
                    onEditTask={handleTaskEdit}
                    onDeleteTask={handleTaskDelete}
                    onViewTaskDetails={handleTaskClick}
                    onMoveToNextColumn={() => {}}
                    onMoveToPreviousColumn={() => {}}
                    onUpdateTask={handleUpdateTask}
                    isSubmitting={isSubmitting}
                  />
                );
              })}
            </div>
          </div>
          <DragOverlay>
            {activeTask ? (
              <TaskCard
                task={activeTask}
                users={assignableUsers}
                projectColumns={projectData.columns}
                canManageTask={canManageTasks}
                onEdit={() => {}}
                onDelete={() => {}}
                onViewDetails={() => {}}
                onMoveToNextColumn={() => {}}
                onMoveToPreviousColumn={() => {}}
                onUpdateTask={() => {}}
              />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Dialogs */}
      <AddTaskDialog
        isOpen={isAddTaskDialogOpen}
        onOpenChange={setIsAddTaskDialogOpen}
        onAddTask={handleAddTaskWrapper}
        columnId={selectedColumnIdForNewTask}
        assignableUsers={assignableUsers}
        allTasksForDependencies={allTasksForDependencies}
        isSubmitting={isSubmitting}
      />

      <EditTaskDialog
        isOpen={isEditTaskDialogOpen}
        onOpenChange={(open) => {
          setIsEditTaskDialogOpen(open);
          if (!open) setTaskToEdit(null);
        }}
        onEditTask={handleEditTaskWrapper}
        taskToEdit={taskToEdit}
        assignableUsers={assignableUsers}
        allTasksForDependencies={allTasksForDependencies}
        isSubmitting={isSubmitting}
      />

      <TaskDetailsDialog
        isOpen={isTaskDetailsDialogOpen}
        onOpenChange={(open) => {
          setIsTaskDetailsDialogOpen(open);
          if (!open) setTaskToView(null);
        }}
        task={taskToView}
        users={assignableUsers}
        canManageTask={canManageTasks}
        onAddComment={handleAddCommentWrapper}
        onEditTask={canManageTasks ? handleTaskEdit : () => {}}
        onDeleteTask={canManageTasks ? handleTaskDelete : () => {}}
        isSubmittingComment={isSubmitting}
      />

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this task? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setShowDeleteConfirm(false);
              setTaskToDeleteId(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTaskWrapper}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    

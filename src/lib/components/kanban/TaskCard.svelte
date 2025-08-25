"use client";

import type { Task, UserProfile, Column } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Edit2,
  Trash2,
  MessageSquare,
  Loader2,
  Clock,
  ArrowRightCircle,
  ArrowLeftCircle,
  Eye,
  Clock2Icon,
} from "lucide-react";
import {
  format,
  formatDistanceToNowStrict,
  differenceInDays,
  isToday,
  isPast,
  isValid,
  parseISO,
} from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface TaskCardProps {
  task: Task;
  users: UserProfile[];
  projectColumns: Column[];
  canManageTask: boolean;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onViewDetails: (task: Task) => void;
  onMoveToNextColumn: (task: Task) => void;
  onMoveToPreviousColumn: (task: Task) => void;
  isSubmitting?: boolean;
  onUpdateTask: (taskId: string, updatedFields: Partial<Task>) => void;
}

export function TaskCard({
  task,
  users,
  projectColumns,
  canManageTask,
  onEdit,
  onDelete,
  onViewDetails,
  onMoveToNextColumn,
  onMoveToPreviousColumn,
  isSubmitting,
  onUpdateTask,
}: TaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      task,
    },
  });
  const { currentUser } = useAuth();
  const assignees =
    (task.assigneeUids
      ?.map((uid) => users.find((u) => u.id === uid))
      .filter(Boolean) as UserProfile[]) || [];

  const getPriorityBadgeVariant = (priority: Task["priority"]) => {
    switch (priority) {
      case "HIGH":
        return "destructive";
      case "MEDIUM":
        return "secondary";
      case "LOW":
        return "outline";
      default:
        return "default";
    }
  };

  const getDueDateStatus = (): {
    text: string;
    colorClass: string;
    icon?: React.ReactNode;
  } | null => {
    if (!task.dueDate) return null;

    const dueDate = parseISO(task.dueDate);
    if (!isValid(dueDate)) return null;

    const now = new Date();
    const dueDateStartOfDay = new Date(
      dueDate.getFullYear(),
      dueDate.getMonth(),
      dueDate.getDate()
    );
    const nowStartOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

    const daysDiff = differenceInDays(dueDateStartOfDay, nowStartOfDay);

    if (daysDiff < 0) {
      return {
        text: `Overdue by ${Math.abs(daysDiff)}d`,
        colorClass: "text-red-500 dark:text-red-400",
        icon: <Clock className="h-3 w-3 mr-1" />,
      };
    } else if (daysDiff === 0) {
      return {
        text: "Due today",
        colorClass: "text-orange-500 dark:text-orange-400",
        icon: <Clock className="h-3 w-3 mr-1" />,
      };
    } else {
      return {
        text: `${daysDiff}d left`,
        colorClass: "text-green-600 dark:text-green-400",
        icon: <Clock className="h-3 w-3 mr-1" />,
      };
    }
  };

  const dueDateStatus = getDueDateStatus();

  const sortedColumns = [...projectColumns].sort((a, b) => a.order - b.order);
  const currentColumnIndex = sortedColumns.findIndex(
    (col) => col.id === task.columnId
  );
  const hasNextColumn =
    currentColumnIndex !== -1 && currentColumnIndex < sortedColumns.length - 1;
  const hasPreviousColumn = currentColumnIndex !== -1 && currentColumnIndex > 0;
  const canMoveTask =
    canManageTask || task.assigneeUids?.includes(currentUser?.uid || "");

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 1000 : 'auto',
    touchAction: 'none',
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`hover:bg-gradient-to-r hover:from-pink-100 hover:to-purple-100 mb-3 shadow-md hover:shadow-lg transition-shadow duration-200 select-none touch-none ${
        isDragging
          ? "opacity-50 z-[1000]"
          : isSubmitting
          ? " opacity-70 cursor-not-allowed"
          : canMoveTask
          ? "cursor-grab active:cursor-grabbing bg-gradient-to-r from-purple-100 to-white"
          : "cursor-default"
      }`}
      aria-label={`Task: &quot;${task.title}&quot;, Priority: &quot;${task.priority}&quot;`}
    >
      <CardHeader className="">
        <div className="flex justify-between items-start">
          <CardTitle className="text-base font-semibold leading-tight text-card-foreground">
            {task.title}
          </CardTitle>
          {task.priority !== "NONE" && (
            <Badge
              variant={getPriorityBadgeVariant(task.priority)}
              className={
                task.priority === "MEDIUM"
                  ? "bg-accent text-accent-foreground"
                  : ""
              }
            >
              {task.priority}
            </Badge>
          )}
        </div>
      </CardHeader>
      {task.description && (
        <CardContent className="px-4 py-0 my-0">
          <p className="text-xs text-muted-foreground line-clamp-3">
            {task.description}
          </p>
        </CardContent>
      )}
      <CardFooter className="flex flex-col items-start ">
        <div className="flex justify-between w-full items-center ">
          <div className="flex -space-x-2 mt-3">
            {assignees.slice(0, 3).map((assignee) => (
              <Avatar
                key={assignee.id}
                className="h-6 w-6 border-2 border-card"
              >
                <AvatarImage
                  src={assignee.avatarUrl}
                  alt={assignee.name}
                  data-ai-hint="profile small"
                />
                <AvatarFallback>{assignee.name.substring(0, 1)}</AvatarFallback>
              </Avatar>
            ))}
            {assignees.length > 3 && (
              <Avatar className="h-6 w-6 border-2 border-card">
                <AvatarFallback>+{assignees.length - 3}</AvatarFallback>
              </Avatar>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs gap-3 text-muted-foreground mt-3 mr-2">
            {task.comments && task.comments.length > 0 && (
              <span className="flex text-xs font-bold items-center text-blue-400">
                <MessageSquare className="h-4 w-4 mr-1" />{" "}
                {task.comments.length}
              </span>
            )}
            {dueDateStatus && (
              <span
                className={`flex text-xs font-semibold items-center ${dueDateStatus.colorClass}`}
                title={`Due: ${
                  task.dueDate
                    ? format(parseISO(task.dueDate), "MMM d, yyyy")
                    : "N/A"
                }`}
              >
                <Clock2Icon className="h-4 w-4 mr-1" /> {dueDateStatus.text}
              </span>
            )}
          </div>
        </div>

        <div className="flex space-x-1 w-full justify-end items-center gap-4 mt-2">
          {canMoveTask && hasPreviousColumn && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onMoveToPreviousColumn(task);
              }}
              aria-label="Move to previous column"
              title="Move to previous column"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowLeftCircle className="h-4 w-4" />
              )}
            </Button>
          )}
          {canMoveTask && hasNextColumn && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={(e) => {
                e.stopPropagation();
                onMoveToNextColumn(task);
              }}
              aria-label="Move to next column"
              title="Move to next column"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ArrowRightCircle className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation();
              onViewDetails(task);
            }}
            aria-label="View task details"
            title="View task details"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </Button>
          {canManageTask && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                aria-label="Edit task"
                title="Edit task"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Edit2 className="h-4 w-4" />
                )}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(task.id);
                }}
                aria-label="Delete task"
                title="Delete task"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
              </Button>
            </>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}

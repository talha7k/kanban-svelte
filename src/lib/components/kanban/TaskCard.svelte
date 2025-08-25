<script lang="ts">
	import type { Task, UserProfile, Column } from '$lib/types/types';
	import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import {
		Edit2,
		Trash2,
		MessageSquare,
		Loader2,
		Clock,
		ArrowRightCircle,
		ArrowLeftCircle,
		Eye,
		Clock as Clock2Icon,
	} from '@lucide/svelte';
	import {
		format,
		formatDistanceToNowStrict,
		differenceInDays,
		isToday,
		isPast,
		isValid,
		parseISO,
	} from 'date-fns';
	import { currentUser } from '$lib/stores/auth';

	export let task: Task;
	export let users: UserProfile[];
	export let projectColumns: Column[];
	export let canManageTask: boolean;
	export let onEdit: (task: Task) => void;
	export let onDelete: (taskId: string) => void;
	export let onViewDetails: (task: Task) => void;
	export let onMoveToNextColumn: (task: Task) => void;
	export let onMoveToPreviousColumn: (task: Task) => void;
	export let isSubmitting: boolean = false;
	export let onUpdateTask: (taskId: string, updatedFields: Partial<Task>) => void;

	$: assignees = (task.assigneeUids
		?.map((uid) => users.find((u) => u.id === uid))
		.filter(Boolean) as UserProfile[]) || [];

	function getPriorityBadgeVariant(priority: Task['priority']) {
		switch (priority) {
			case 'HIGH':
				return 'destructive';
			case 'MEDIUM':
				return 'secondary';
			case 'LOW':
				return 'outline';
			default:
				return 'default';
		}
	}

	function getDueDateStatus(): {
		text: string;
		colorClass: string;
	} | null {
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
				colorClass: 'text-red-500 dark:text-red-400',
			};
		} else if (daysDiff === 0) {
			return {
				text: 'Due today',
				colorClass: 'text-orange-500 dark:text-orange-400',
			};
		} else {
			return {
				text: `${daysDiff}d left`,
				colorClass: 'text-green-600 dark:text-green-400',
			};
		}
	}

	$: dueDateStatus = getDueDateStatus();

	$: sortedColumns = [...projectColumns].sort((a, b) => a.order - b.order);
	$: currentColumnIndex = sortedColumns.findIndex((col) => col.id === task.columnId);
	$: hasNextColumn = currentColumnIndex !== -1 && currentColumnIndex < sortedColumns.length - 1;
	$: hasPreviousColumn = currentColumnIndex !== -1 && currentColumnIndex > 0;
	$: canMoveTask = canManageTask || task.assigneeUids?.includes($currentUser?.uid || '');
</script>

<Card
	class="hover:bg-gradient-to-r hover:from-pink-100 hover:to-purple-100 mb-3 shadow-md hover:shadow-lg transition-shadow duration-200 select-none touch-none {isSubmitting
		? 'opacity-70 cursor-not-allowed'
		: canMoveTask
		? 'cursor-grab active:cursor-grabbing bg-gradient-to-r from-purple-100 to-white'
		: 'cursor-default'}"
	aria-label="Task: '{task.title}', Priority: '{task.priority}'"
>
	<CardHeader class="">
		<div class="flex justify-between items-start">
			<CardTitle class="text-base font-semibold leading-tight text-card-foreground">
				{task.title}
			</CardTitle>
			{#if task.priority !== 'NONE'}
				<Badge
					variant={getPriorityBadgeVariant(task.priority)}
					class={task.priority === 'MEDIUM' ? 'bg-accent text-accent-foreground' : ''}
				>
					{task.priority}
				</Badge>
			{/if}
		</div>
	</CardHeader>
	{#if task.description}
		<CardContent class="px-4 py-0 my-0">
			<p class="text-xs text-muted-foreground line-clamp-3">
				{task.description}
			</p>
		</CardContent>
	{/if}
	<CardFooter class="flex flex-col items-start">
		<div class="flex justify-between w-full items-center">
			<div class="flex -space-x-2 mt-3">
				{#each assignees.slice(0, 3) as assignee (assignee.id)}
					<Avatar class="h-6 w-6 border-2 border-card">
						<AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
						<AvatarFallback>{assignee.name.substring(0, 1)}</AvatarFallback>
					</Avatar>
				{/each}
				{#if assignees.length > 3}
					<Avatar class="h-6 w-6 border-2 border-card">
						<AvatarFallback>+{assignees.length - 3}</AvatarFallback>
					</Avatar>
				{/if}
			</div>
			<div class="flex items-center space-x-2 text-xs gap-3 text-muted-foreground mt-3 mr-2">
				{#if task.comments && task.comments.length > 0}
					<span class="flex text-xs font-bold items-center text-blue-400">
						<MessageSquare class="h-4 w-4 mr-1" />
						{task.comments.length}
					</span>
				{/if}
				{#if dueDateStatus}
					<span
						class="flex text-xs font-semibold items-center {dueDateStatus.colorClass}"
						title="Due: {task.dueDate ? format(parseISO(task.dueDate), 'MMM d, yyyy') : 'N/A'}"
					>
						<Clock2Icon class="h-4 w-4 mr-1" />
						{dueDateStatus.text}
					</span>
				{/if}
			</div>
		</div>

		<div class="flex space-x-1 w-full justify-end items-center gap-4 mt-2">
			{#if canMoveTask && hasPreviousColumn}
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7"
					onclick={(e) => {
						e.stopPropagation();
						onMoveToPreviousColumn(task);
					}}
					aria-label="Move to previous column"
					title="Move to previous column"
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<ArrowLeftCircle class="h-4 w-4" />
					{/if}
				</Button>
			{/if}
			{#if canMoveTask && hasNextColumn}
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7"
					onclick={(e) => {
						e.stopPropagation();
						onMoveToNextColumn(task);
					}}
					aria-label="Move to next column"
					title="Move to next column"
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<ArrowRightCircle class="h-4 w-4" />
					{/if}
				</Button>
			{/if}
			<Button
				variant="ghost"
				size="icon"
				class="h-7 w-7"
				onclick={(e) => {
					e.stopPropagation();
					onViewDetails(task);
				}}
				aria-label="View task details"
				title="View task details"
				disabled={isSubmitting}
			>
				{#if isSubmitting}
					<Loader2 class="h-4 w-4 animate-spin" />
				{:else}
					<Eye class="h-4 w-4" />
				{/if}
			</Button>
			{#if canManageTask}
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7"
					onclick={(e) => {
						e.stopPropagation();
						onEdit(task);
					}}
					aria-label="Edit task"
					title="Edit task"
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<Edit2 class="h-4 w-4" />
					{/if}
				</Button>
				<Button
					variant="ghost"
					size="icon"
					class="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
					onclick={(e) => {
						e.stopPropagation();
						onDelete(task.id);
					}}
					aria-label="Delete task"
					title="Delete task"
					disabled={isSubmitting}
				>
					{#if isSubmitting}
						<Loader2 class="h-4 w-4 animate-spin" />
					{:else}
						<Trash2 class="h-4 w-4" />
					{/if}
				</Button>
			{/if}
		</div>
	</CardFooter>
</Card>


<script lang="ts">
	import type { Task, UserProfile, Comment as CommentType } from '$lib/types/types';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogDescription,
		DialogFooter,
	} from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Badge } from '$lib/components/ui/badge';
	import { CalendarDays, User, Tag, Users, MessageSquare, Edit2, Trash2, Info, Loader2, Clock } from '@lucide/svelte';
	import { format, parseISO, isValid, differenceInDays, isToday, isPast } from 'date-fns';
	import CommentItem from './CommentItem.svelte';
	import { onMount } from 'svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';

	import { toast } from 'svelte-sonner';
	import { Input } from '$lib/components/ui/input';

	export let isOpen: boolean;
	export let onOpenChange: (isOpen: boolean) => void;
	export let task: Task | null;
	export let users: UserProfile[];
	export let canManageTask: boolean;
	export let onAddComment: (taskId: string, commentText: string) => Promise<void> | void;
	export let onEditTask: (task: Task) => void;
	export let onDeleteTask: (taskId: string) => void;
	export let isSubmittingComment: boolean = false;

	let newComment = '';
	let comments: CommentType[] = [];
	let isSubmittingLocalComment = false;
	let lastTaskId: string | null = null;

	// Update comments when task changes or when task.comments changes
	$: if (task) {
		// If this is a different task, reset comments
		if (lastTaskId !== task.id) {
			lastTaskId = task.id;
			comments = task.comments ? [...task.comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) : [];
		} else if (task.comments) {
			// Same task, update comments if they exist
			comments = [...task.comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		}
	} else {
		comments = [];
		lastTaskId = null;
	}

	$: if (isOpen && task) {
		newComment = '';
		// Ensure comments are loaded when dialog opens
		if (task.comments) {
			comments = [...task.comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
		}
	}

	$: assignees = task?.assigneeUids?.map(uid => users.find(u => u.id === uid)).filter(Boolean) as UserProfile[] || [];
	$: reporter = users.find(u => u.id === task?.reporterId);

	async function handleAddCommentSubmit() {
		if (newComment.trim() === '') {
			toast.error('Cannot add an empty comment.');
			return;
		}
		isSubmittingLocalComment = true;
		try {
			if (task) {
				await onAddComment(task.id, newComment);
				newComment = ''; // Clear the input after successful submission
				toast.success('Your comment has been added successfully.');
				// Force refresh comments after adding
				if (task.comments) {
					comments = [...task.comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
				}
			}
		} catch (error) {
			toast.error('Failed to add comment. Please try again.');
		} finally {
			isSubmittingLocalComment = false;
		}
	}

	function getPriorityBadgeVariant(priority: Task['priority']) {
		switch (priority) {
			case 'HIGH': return 'destructive';
			case 'MEDIUM': return 'secondary';
			case 'LOW': return 'outline';
			default: return 'default';
		}
	}

	function getDueDateStatusText(): string | null {
		if (!task?.dueDate) return null;
		const dueDate = parseISO(task.dueDate);
		if (!isValid(dueDate)) return null;

		const now = new Date();
		const daysDiff = differenceInDays(dueDate, now);

		if (isToday(dueDate)) return "Due today";
		if (isPast(dueDate)) {
			const daysOverdue = differenceInDays(now, dueDate);
			return `Overdue by ${daysOverdue} day${daysOverdue > 1 ? 's' : ''}`;
		}
		return `${daysDiff + 1} day${daysDiff + 1 > 1 ? 's' : ''} left`;
	}

	$: dueDateStatusText = getDueDateStatusText();
</script>

{#if isOpen && task}
	<Dialog open={isOpen} {onOpenChange}>
		<DialogContent class="sm:max-w-2xl max-h-[90vh] flex flex-col">
			<DialogHeader class="flex-shrink-0">
				<DialogDescription class="sr-only">
					Task details dialog for {task.title}
				</DialogDescription>
				<div class="flex justify-between items-start">
					<DialogTitle class="text-2xl font-bold text-foreground">{task.title}</DialogTitle>
				</div>
				<div class="flex items-center justify-between space-x-3 mt-1">
					{#if task.priority !== 'NONE'}
						<Badge variant={getPriorityBadgeVariant(task.priority)} class={`w-fit ${task.priority === 'MEDIUM' ? 'bg-accent text-accent-foreground' : ''}`}>
							Priority: {task.priority}
						</Badge>
					{/if}
					{#if dueDateStatusText}
						<span class="text-xs text-muted-foreground flex items-center">
							<Clock class="h-3.5 w-3.5 mr-1.5" /> {dueDateStatusText}
						</span>
					{/if}
					{#if canManageTask}
						<div class="flex gap-2 mt-2">
							<Button variant="outline" size="icon" onclick={() => { onOpenChange(false); onEditTask(task);}} aria-label="Edit task" disabled={isSubmittingComment}>
								<Edit2 class="h-3 w-3" />
							</Button>
							<Button variant="destructive" size="icon" onclick={() => { onDeleteTask(task.id);}} aria-label="Delete task">
								<Trash2 class="h-3 w-3" />
							</Button>
						</div>
					{/if}
				</div>
			</DialogHeader>

			<div class="flex-1 flex flex-col min-h-0 overflow-y-auto max-h-[88vh]">
				<div class="space-y-4 py-4">
					{#if task.description}
						<div>
							<h3 class="font-semibold text-sm mb-1 text-muted-foreground">Description</h3>
							<p class="text-sm text-foreground whitespace-pre-wrap bg-muted/30 p-3 rounded-md">{task.description}</p>
						</div>
					{/if}

					<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
						{#if task.dueDate && isValid(parseISO(task.dueDate))}
							<div class="flex items-center">
								<CalendarDays class="h-4 w-4 mr-2 text-muted-foreground" />
								<strong>Due Date:</strong>&nbsp; <span class="text-foreground">{format(parseISO(task.dueDate), 'MMM d, yyyy')}</span>
							</div>
						{/if}
						{#if reporter}
							<div class="flex items-center">
								<User class="h-4 w-4 mr-2 text-muted-foreground" />
								<strong>Reporter:</strong>&nbsp; <span class="text-foreground">{reporter.name}</span>
							</div>
						{/if}
						{#if task.createdAt && isValid(parseISO(task.createdAt))}
							<div class="flex items-center">
								<CalendarDays class="h-4 w-4 mr-2 text-muted-foreground" />
								<strong>Created:</strong>&nbsp; <span class="text-foreground">{format(parseISO(task.createdAt), 'MMM d, yyyy HH:mm')}</span>
							</div>
						{/if}
						{#if task.updatedAt && isValid(parseISO(task.updatedAt))}
							<div class="flex items-center">
								<CalendarDays class="h-4 w-4 mr-2 text-muted-foreground" />
								<strong>Updated:</strong>&nbsp; <span class="text-foreground">{format(parseISO(task.updatedAt), 'MMM d, yyyy HH:mm')}</span>
							</div>
						{/if}
					</div>

					{#if assignees.length > 0}
						<div>
							<h3 class="font-semibold text-sm mb-1 text-muted-foreground flex items-center"><Users class="h-4 w-4 mr-2" />Assignees</h3>
							<div class="flex flex-wrap gap-2">
								{#each assignees as user (user.id)}
									<Badge variant="secondary" class="flex items-center gap-1.5 pr-1">
										<Avatar class="h-5 w-5">
											<AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="profile small" />
											<AvatarFallback>{user.name?.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
										</Avatar>
										{user.name}
									</Badge>
								{/each}
							</div>
						</div>
					{/if}

					{#if task.tags && task.tags.length > 0}
						<div>
							<h3 class="font-semibold text-sm mb-1 text-muted-foreground flex items-center"><Tag class="h-4 w-4 mr-2" />Tags</h3>
							<div class="flex flex-wrap gap-2">
								{#each task.tags as tag (tag)}
									<Badge variant="outline">{tag}</Badge>
								{/each}
							</div>
						</div>
					{/if}



					<Separator class="my-4" />

					<div class="flex-1 flex flex-col min-h-0">
						<h3 class="font-semibold text-lg mb-2 text-foreground flex items-center flex-shrink-0"><MessageSquare class="h-5 w-5 mr-2" />Comments ({comments.length})</h3>
						<div class="space-y-2 pr-4">
							{#each comments as comment (comment.id)}
								<CommentItem {comment} />
							{/each}
							{#if comments.length === 0}
								<p class="text-sm text-muted-foreground">No comments yet.</p>
							{/if}
						</div>
					</div>
				</div>
			</div>

			<DialogFooter class="flex-col sm:flex-row gap-3 sm:gap-2 pt-4 border-t flex-shrink-0">
				<Input
					placeholder="Add a comment..."
					bind:value={newComment}
					class="flex-1"
					disabled={isSubmittingLocalComment}
				/>
				<Button onclick={handleAddCommentSubmit} disabled={newComment.trim() === '' || isSubmittingLocalComment} class="w-full sm:w-auto">
					{#if isSubmittingLocalComment}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Add Comment
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
{/if}


<script lang="ts">
	import type { Task, UserProfile, Comment as CommentType, CardType } from '$lib/types/types';
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
	import { Label } from '$lib/components/ui/label';
	import { CalendarDays, User, Tag, Users, MessageSquare, Info, Loader2, Clock } from '@lucide/svelte';
	import { format, parseISO, isValid, differenceInDays, isToday, isPast } from 'date-fns';
	import CommentItem from './CommentItem.svelte';
	import { onMount } from 'svelte';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Separator } from '$lib/components/ui/separator';

	import { toast } from 'svelte-sonner';
	import { Input } from '$lib/components/ui/input';

	let {
		isOpen,
		onOpenChange,
		task,
		users,
		onAddComment,
		onEditComment = undefined,
		onDeleteComment = undefined,
		currentUserId = undefined,
		cardTypes = [],
		onUpdateTask = undefined,
		assignableUsers = [],
		canManageTask = false
	} = $props();

	let newComment = $state('');
	let comments = $state<CommentType[]>([]);
	let isSubmittingLocalComment = $state(false);
	let lastTaskId: string | null = $state(null);
	let isEditingFields = $state(false);
	let fieldValues: Record<string, any> = $state({});
	let isSubmittingFieldUpdate = $state(false);

	// Update comments when task changes or when task.comments changes
	$effect(() => {
		if (task) {
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
	});

	$effect(() => {
		if (isOpen && task) {
			newComment = '';
			// Ensure comments are loaded when dialog opens
			if (task.comments) {
				comments = [...task.comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
			}
		}
	});

	const assignees = $derived(task?.assigneeUids?.map((uid: string) => users.find((u: UserProfile) => u.id === uid)).filter(Boolean) as UserProfile[] || []);
	const reporter = $derived(users.find((u: UserProfile) => u.id === task?.reporterId));
	const selectedCardType = $derived(cardTypes.find((ct: CardType) => ct.id === task?.cardTypeId) || null);

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

	const dueDateStatusText = $derived(getDueDateStatusText());

	async function handleEditComment(commentId: string, newContent: string) {
		if (!onEditComment || !task) return;
		try {
			await onEditComment(task.id, commentId, newContent);
			// Force refresh comments after editing
			if (task.comments) {
				comments = [...task.comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
			}
		} catch (error) {
			throw error;
		}
	}

	async function handleDeleteComment(commentId: string) {
		if (!onDeleteComment || !task) return;
		try {
			await onDeleteComment(task.id, commentId);
			// Force refresh comments after deleting
			if (task.comments) {
				comments = [...task.comments].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
			}
		} catch (error) {
			throw error;
		}
	}

	async function handleSaveFieldValues() {
		if (!onUpdateTask || !task) return;

		isSubmittingFieldUpdate = true;
		try {
			await onUpdateTask(task.id, { fieldValues });
			isEditingFields = false;
			fieldValues = {};
			toast.success('Custom fields updated successfully.');
		} catch (error) {
			toast.error('Failed to update custom fields. Please try again.');
		} finally {
			isSubmittingFieldUpdate = false;
		}
	}
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

					{#if selectedCardType && selectedCardType.fields && selectedCardType.fields.length > 0}
						<div>
							<div class="flex justify-between items-center mb-1">
								<h3 class="font-semibold text-sm text-muted-foreground flex items-center"><Info class="h-4 w-4 mr-2" />Custom Fields</h3>
								{#if canManageTask}
									<Button
										variant="ghost"
										size="sm"
										class="h-6 px-2 text-xs"
										onclick={() => {
											isEditingFields = !isEditingFields;
											if (isEditingFields) {
												fieldValues = { ...(task.fieldValues || {}) };
											}
										}}
									>
										{isEditingFields ? 'Cancel' : 'Edit'}
									</Button>
								{/if}
							</div>
							<div class="space-y-3">
								{#each selectedCardType.fields as field (field.id)}
									<div class="flex flex-col space-y-1">
										<Label class="text-xs font-medium text-muted-foreground">
											{field.name}
											{#if field.config.required}
												<span class="text-red-500 ml-1">*</span>
											{/if}
										</Label>
										{#if isEditingFields}
											{#if field.type === 'text_input'}
												<Input
													bind:value={fieldValues[field.id]}
													placeholder="Enter text..."
													class="text-sm"
												/>
											{:else if field.type === 'number_input'}
												<Input
													type="number"
													bind:value={fieldValues[field.id]}
													placeholder="Enter number..."
													class="text-sm"
												/>
											{:else if field.type === 'textarea'}
												<Textarea
													bind:value={fieldValues[field.id]}
													placeholder="Enter description..."
													class="text-sm"
													rows={3}
												/>
											{:else if field.type === 'date_input'}
												<Input
													type="date"
													bind:value={fieldValues[field.id]}
													class="text-sm"
												/>
											{:else if field.type === 'checkbox'}
												<div class="flex items-center space-x-2">
													<input
														type="checkbox"
														bind:checked={fieldValues[field.id]}
														class="rounded"
													/>
													<span class="text-sm">{fieldValues[field.id] ? 'Yes' : 'No'}</span>
												</div>
											{:else if field.type === 'dropdown'}
												<select
													bind:value={fieldValues[field.id]}
													class="w-full p-2 text-sm border rounded-md bg-background"
												>
													<option value="">Select an option...</option>
													{#each field.config?.options || [] as option}
														<option value={option}>{option}</option>
													{/each}
												</select>
											{:else}
												<div class="text-sm text-muted-foreground bg-muted/30 p-2 rounded-md">
													{field.type} field (not editable in view)
												</div>
											{/if}
										{:else}
											<div class="text-sm text-foreground bg-muted/30 p-2 rounded-md">
												{#if field.type === 'fixed'}
													{task.fieldValues?.[field.id] || 'Not set'}
												{:else if field.type === 'dropdown'}
													{task.fieldValues?.[field.id] || 'Not selected'}
												{:else if field.type === 'text_input'}
													{task.fieldValues?.[field.id] || 'Not filled'}
												{:else if field.type === 'number_input'}
													{task.fieldValues?.[field.id] || 'Not set'}
												{:else if field.type === 'date_input'}
													{task.fieldValues?.[field.id] ? format(parseISO(task.fieldValues[field.id]), 'MMM d, yyyy') : 'Not set'}
												{:else if field.type === 'textarea'}
													<div class="whitespace-pre-wrap">{task.fieldValues?.[field.id] || 'Not filled'}</div>
												{:else if field.type === 'checkbox'}
													{task.fieldValues?.[field.id] ? 'Yes' : 'No'}
												{:else}
													{task.fieldValues?.[field.id] || 'Not set'}
												{/if}
											</div>
										{/if}
									</div>
								{/each}
								{#if isEditingFields}
									<div class="flex justify-end space-x-2 pt-2">
										<Button
											variant="outline"
											size="sm"
											onclick={() => {
												isEditingFields = false;
												fieldValues = {};
											}}
											disabled={isSubmittingFieldUpdate}
										>
											Cancel
										</Button>
										<Button
											size="sm"
											onclick={handleSaveFieldValues}
											disabled={isSubmittingFieldUpdate}
										>
											{#if isSubmittingFieldUpdate}
												<Loader2 class="mr-2 h-4 w-4 animate-spin" />
											{/if}
											Save Changes
										</Button>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<Separator class="my-4" />

					<div class="flex-1 flex flex-col min-h-0">
						<h3 class="font-semibold text-lg mb-2 text-foreground flex items-center flex-shrink-0"><MessageSquare class="h-5 w-5 mr-2" />Comments ({comments.length})</h3>
						<div class="space-y-2 pr-4">
							{#each comments as comment (comment.id)}
								<CommentItem 
									{comment} 
									{currentUserId}
									onEditComment={handleEditComment}
									onDeleteComment={handleDeleteComment}
								/>
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

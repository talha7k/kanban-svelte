
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
	import {
		Popover,
		PopoverContent,
		PopoverTrigger,
		PopoverClose,
	} from '$lib/components/ui/popover';

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
	let isEditingFields = $state(canManageTask);
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
			fieldValues = { ...(task.fieldValues || {}) };
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

	function getFieldTypeLabel(type: string): string {
		switch (type) {
			case 'fixed': return 'Fixed Value';
			case 'dropdown': return 'Dropdown';
			case 'text_input': return 'Text Input';
			case 'number_input': return 'Number Input';
			case 'date_input': return 'Date Input';
			case 'textarea': return 'Textarea';
			case 'checkbox': return 'Checkbox';
			default: return 'Unknown';
		}
	}

	function getFieldTypeColor(type: string): string {
		switch (type) {
			case 'fixed': return 'bg-purple-100 text-purple-800 border-purple-200';
			case 'dropdown': return 'bg-blue-100 text-blue-800 border-blue-200';
			case 'text_input': return 'bg-green-100 text-green-800 border-green-200';
			case 'number_input': return 'bg-orange-100 text-orange-800 border-orange-200';
			case 'date_input': return 'bg-red-100 text-red-800 border-red-200';
			case 'textarea': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
			case 'checkbox': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
			default: return 'bg-gray-100 text-gray-800 border-gray-200';
		}
	}

	function getFieldDisplayValue(field: any, task: Task): string {
		const value = task.fieldValues?.[field.id];
		if (field.type === 'fixed') {
			return field.config?.value || 'N/A';
		} else if (field.type === 'checkbox') {
			return value ? 'Yes' : 'No';
		} else if (field.type === 'date_input' && value) {
			return format(parseISO(value), 'MMM d, yyyy');
		} else {
			return value || 'Not set';
		}
	}

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
			// Send all field values, using null for unset fields
			const fullFieldValues: Record<string, any> = {};
			if (selectedCardType && selectedCardType.fields) {
				for (const field of selectedCardType.fields) {
					if (field.name !== "title" && field.name !== "description") {
						fullFieldValues[field.id] = fieldValues[field.id] ?? null;
					}
				}
			}
			await onUpdateTask(task.id, { fieldValues: fullFieldValues });
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

					<div class="flex flex-wrap gap-2">
						{#if task.dueDate && isValid(parseISO(task.dueDate))}
							<Badge variant="secondary" class="flex items-center gap-1">
								<CalendarDays class="h-4 w-4" />
								Due Date: {format(parseISO(task.dueDate), 'MMM d, yyyy')}
							</Badge>
						{/if}
						{#if reporter}
							<Badge variant="secondary" class="flex items-center gap-1">
								<User class="h-4 w-4" />
								Reporter: {reporter.name}
							</Badge>
						{/if}
						{#if task.createdAt && isValid(parseISO(task.createdAt))}
							<Badge variant="secondary" class="flex items-center gap-1">
								<CalendarDays class="h-4 w-4" />
								Created: {format(parseISO(task.createdAt), 'MMM d, yyyy HH:mm')}
							</Badge>
						{/if}
						{#if task.updatedAt && isValid(parseISO(task.updatedAt))}
							<Badge variant="secondary" class="flex items-center gap-1">
								<CalendarDays class="h-4 w-4" />
								Updated: {format(parseISO(task.updatedAt), 'MMM d, yyyy HH:mm')}
							</Badge>
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

					{#if !task?.cardTypeId && cardTypes && cardTypes.length > 0}
						<div class="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
							<div class="flex items-center text-amber-800">
								<Info class="h-4 w-4 mr-2" />
								<span class="text-sm font-medium">No Card Type Assigned</span>
							</div>
							<p class="text-xs text-amber-700 mt-1">
								This task was created before card types were implemented. Custom fields are only available for tasks with assigned card types.
							</p>
						</div>
					{:else if selectedCardType && selectedCardType.fields && selectedCardType.fields.length > 0}
						<div>
							<h3 class="font-semibold text-sm mb-3 text-muted-foreground flex items-center"><Info class="h-4 w-4 mr-2" />Custom Fields</h3>
							<div class="flex flex-wrap gap-2">
								{#each selectedCardType.fields as field (field.id)}
									{#if field.name !== "title" && field.name !== "description"}
										{#if field.type === "fixed"}
											<Badge variant="secondary" class="bg-purple-100 text-purple-800 border-purple-200">
												{field.name}: {field.config?.value || "N/A"}
												{#if field.config?.required && task?.assigneeUids?.length}
													<span class="ml-1 text-red-500">*</span>
												{/if}
											</Badge>
										{:else}
											<Popover>
												<PopoverTrigger>
													<Badge variant="secondary" class="{getFieldTypeColor(field.type)} cursor-pointer hover:opacity-80">
														{field.name}: {getFieldDisplayValue(field, task)}
														{#if field.config?.required && task?.assigneeUids?.length}
															<span class="ml-1 text-red-500">*</span>
														{/if}
														{#if isSubmittingFieldUpdate}
															<Loader2 class="ml-2 h-3 w-3 animate-spin" />
														{/if}
													</Badge>
												</PopoverTrigger>
												<PopoverContent class="w-80">
													<div class="space-y-2">
														<Label for="field-{field.id}">{field.name}</Label>
														{#if field.type === "dropdown"}
															<select
																id="field-{field.id}"
																bind:value={fieldValues[field.id]}
																class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
																required={field.config?.required && task?.assigneeUids?.length}
															>
																<option value="">Select {field.name.toLowerCase()}</option>
																{#each field.config?.options || [] as option}
																	<option value={option}>{option}</option>
																{/each}
															</select>
														{:else if field.type === "text_input"}
															<Input
																id="field-{field.id}"
																bind:value={fieldValues[field.id]}
																placeholder={field.config?.placeholder || ""}
																required={field.config?.required && task?.assigneeUids?.length}
															/>
														{:else if field.type === "number_input"}
															<Input
																id="field-{field.id}"
																type="number"
																bind:value={fieldValues[field.id]}
																placeholder={field.config?.placeholder || ""}
																min={field.config?.min}
																max={field.config?.max}
																required={field.config?.required && task?.assigneeUids?.length}
															/>
														{:else if field.type === "date_input"}
															<Input
																id="field-{field.id}"
																type="date"
																bind:value={fieldValues[field.id]}
																required={field.config?.required && task?.assigneeUids?.length}
															/>
														{:else if field.type === "textarea"}
															<Textarea
																id="field-{field.id}"
																bind:value={fieldValues[field.id]}
																placeholder={field.config?.placeholder || ""}
																required={field.config?.required && task?.assigneeUids?.length}
															/>
														{:else if field.type === "checkbox"}
															<div class="flex items-center space-x-2">
																<input
																	id="field-{field.id}"
																	type="checkbox"
																	bind:checked={fieldValues[field.id]}
																	class="h-4 w-4 rounded border border-input"
																	required={field.config?.required && task?.assigneeUids?.length}
																/>
																<label
																	for="field-{field.id}"
																	class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
																>
																	{field.config?.label || "Required"}
																</label>
															</div>
														{/if}
														<div class="flex justify-end space-x-2 pt-2">
															<Button
																variant="outline"
																size="sm"
																onclick={() => {
																	fieldValues = { ...(task.fieldValues || {}) };
																}}
															>
																Reset
															</Button>
															<PopoverClose>
																<Button
																	size="sm"
																	onclick={handleSaveFieldValues}
																	disabled={isSubmittingFieldUpdate}
																>
																	{#if isSubmittingFieldUpdate}
																		<Loader2 class="mr-2 h-4 w-4 animate-spin" />
																	{/if}
																	Save
																</Button>
															</PopoverClose>
														</div>
													</div>
												</PopoverContent>
											</Popover>
										{/if}
									{/if}
								{/each}
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

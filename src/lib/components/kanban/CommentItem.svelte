<script lang="ts">
	import type { Comment } from '$lib/types/types';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { formatDistanceToNow, differenceInMinutes } from 'date-fns';
	import { Edit2, Trash2, Check, X } from '@lucide/svelte';

	export let comment: Comment;
	export let currentUserId: string | undefined = undefined;
	export let onEditComment: ((commentId: string, newContent: string) => Promise<void>) | undefined = undefined;
	export let onDeleteComment: ((commentId: string) => Promise<void>) | undefined = undefined;

	let isEditing = false;
	let editContent = comment.content;
	let isSubmitting = false;

	$: canEdit = currentUserId && comment.userId === currentUserId && differenceInMinutes(new Date(), new Date(comment.createdAt)) < 5;

	async function handleSaveEdit() {
		if (!onEditComment || editContent.trim() === comment.content.trim()) {
			isEditing = false;
			return;
		}
		
		isSubmitting = true;
		try {
			await onEditComment(comment.id, editContent.trim());
			isEditing = false;
		} catch (error) {
			console.error('Failed to edit comment:', error);
		} finally {
			isSubmitting = false;
		}
	}

	async function handleDelete() {
		if (!onDeleteComment) return;
		
		isSubmitting = true;
		try {
			await onDeleteComment(comment.id);
		} catch (error) {
			console.error('Failed to delete comment:', error);
		} finally {
			isSubmitting = false;
		}
	}

	function startEdit() {
		isEditing = true;
		editContent = comment.content;
	}

	function cancelEdit() {
		isEditing = false;
		editContent = comment.content;
	}
</script>

<div class="flex items-start space-x-3 py-2">
	<Avatar class="h-8 w-8">
		<AvatarImage src={comment.avatarUrl} alt={comment.userName} data-ai-hint="profile avatar" />
		<AvatarFallback>{comment.userName?.substring(0, 2).toUpperCase() || 'U'}</AvatarFallback>
	</Avatar>
	<div class="flex-1">
		<div class="flex items-center justify-between">
			<p class="text-sm font-medium text-foreground">{comment.userName}</p>
			<div class="flex items-center gap-2">
				<p class="text-xs text-muted-foreground">
					{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
				</p>
				{#if canEdit && !isEditing}
					<Button variant="ghost" size="icon" class="h-6 w-6" onclick={startEdit} disabled={isSubmitting}>
						<Edit2 class="h-3 w-3" />
					</Button>
					<Button variant="ghost" size="icon" class="h-6 w-6 hover:bg-destructive/10 hover:text-destructive" onclick={handleDelete} disabled={isSubmitting}>
						<Trash2 class="h-3 w-3" />
					</Button>
				{/if}
			</div>
		</div>
		{#if isEditing}
			<div class="mt-2 space-y-2">
				<Textarea bind:value={editContent} class="min-h-[60px]" disabled={isSubmitting} />
				<div class="flex gap-2">
					<Button size="sm" onclick={handleSaveEdit} disabled={isSubmitting || editContent.trim() === ''}>
						<Check class="h-3 w-3 mr-1" /> Save
					</Button>
					<Button size="sm" variant="outline" onclick={cancelEdit} disabled={isSubmitting}>
						<X class="h-3 w-3 mr-1" /> Cancel
					</Button>
				</div>
			</div>
		{:else}
			<p class="text-sm text-muted-foreground whitespace-pre-wrap">{comment.content}</p>
		{/if}
	</div>
</div>

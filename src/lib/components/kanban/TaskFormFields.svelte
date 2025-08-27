 
<script lang="ts">
	import type { Task, UserProfile, AIPrioritySuggestion } from '$lib/types/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';

	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Check, ChevronsUpDown, X } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { Command } from 'bits-ui';
	import { Badge } from '$lib/components/ui/badge';
	import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '$lib/components/ui/dialog';
	import type { TaskFormData } from '$lib/types/types';
	import AITaskDetailGenerator from './AITaskDetailGenerator.svelte';
	import UserSelectionCombobox from '../dashboard/UserSelectionCombobox.svelte';

	export let assignableUsers: UserProfile[];
	
	export const isEditing: boolean = false;
	export let formErrors: Record<string, string> = {};
	export let updateFormData: (field: keyof TaskFormData, value: any) => void;
	export let formData: TaskFormData;

	$: selectedAssignees = formData.assigneeUids || [];
	
	let aiBrief = '';
	let isAiDialogOpen = false;

	function handleAIDetailsGenerated(details: { title: string; description: string }) {
		updateFormData('title', details.title);
		updateFormData('description', details.description);
		// Close the AI dialog after applying the generated details
		isAiDialogOpen = false;
	}






	function toggleAssignee(userId: string) {
		const currentSelection = formData.assigneeUids || [];
		const newSelection = currentSelection.includes(userId)
			? currentSelection.filter(id => id !== userId)
			: [...currentSelection, userId];
		updateFormData('assigneeUids', newSelection);
	}

	


</script>

<div class="grid gap-4 py-4">
	<div class="space-y-1">
		<div class="flex justify-between items-center">
			<Label for="title">Title</Label>
			<Button type="button" variant="outline" size="sm" class="ml-2" onclick={() => isAiDialogOpen = true}>
				Generate with AI
			</Button>
		</div>
		<Input 
			id="title" 
			bind:value={formData.title} 
			placeholder="e.g., Implement feature X" 
		/>
		{#if formErrors.title}
			<p class="text-xs text-destructive">{formErrors.title}</p>
		{/if}
	</div>
	<div class="space-y-1">
		<Label for="description">Description</Label>
		<Textarea 
			id="description" 
			bind:value={formData.description} 
			placeholder="Provide a detailed description of the task..." 
		/>
		{#if formErrors.description}
			<p class="text-xs text-destructive">{formErrors.description}</p>
		{/if}
	</div>
	<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
		<div class="space-y-1">
			<Label for="priority">Priority</Label>
			<select 
				id="priority" 
				bind:value={formData.priority}
				class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
			>
				<option value="NONE">None</option>
				<option value="LOW">Low</option>
				<option value="MEDIUM">Medium</option>
				<option value="HIGH">High</option>
			</select>
			{#if formErrors.priority}
				<p class="text-xs text-destructive">{formErrors.priority}</p>
			{/if}
		</div>
		<div class="space-y-1">
			<Label for="dueDate">Due Date</Label>
			<Input
				id="dueDate"
				type="date"
				bind:value={formData.dueDate}
				class="w-full [&::-webkit-calendar-picker-indicator]:ml-auto"
			/>
			{#if formErrors.dueDate}
				<p class="text-xs text-destructive">{formErrors.dueDate}</p>
			{/if}
		</div>
	</div>
	<div class="space-y-1">
		<Label>Assignees</Label>
		<UserSelectionCombobox
			selectedUsers={assignableUsers.filter(user => selectedAssignees.includes(user.id))}
			users={assignableUsers}
			placeholder="Select assignees..."
			emptyText="No users found in this project."
			multiSelect={true}
			showSubmitButton={false}
			showAvatars={false}
			onToggleUser={(user) => toggleAssignee(user.id)}
		/>
		{#if formErrors.assigneeUids}
			<p class="text-xs text-destructive">{formErrors.assigneeUids}</p>
		{/if}
	</div>

</div>

<!-- AI Dialog - Outside main form to prevent nesting issues -->
<Dialog bind:open={isAiDialogOpen}>
	<DialogContent class="sm:max-w-[425px]">
		<DialogHeader>
			<DialogTitle>Generate Task Details with AI</DialogTitle>
		</DialogHeader>
		<div class="grid gap-4 py-4">
			<div class="space-y-1">
				<Label for="ai-brief">Brief Input</Label>
				<Textarea
					id="ai-brief"
					bind:value={aiBrief}
					placeholder="e.g., Create a new user authentication module with OAuth2 support."
				/>
			</div>
			<AITaskDetailGenerator 
				briefInput={aiBrief} 
				onDetailsGenerated={handleAIDetailsGenerated}
			/>
		</div>
		<DialogFooter>
			<Button type="button" variant="outline" onclick={() => isAiDialogOpen = false}>Cancel</Button>
		</DialogFooter>
	</DialogContent>
</Dialog>

    
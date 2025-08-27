
<script lang="ts">
	import { z } from 'zod';
	import { Button } from '$lib/components/ui/button';
	import {
		Dialog,
		DialogContent,
		DialogDescription,
		DialogFooter,
		DialogHeader,
		DialogTitle,
	} from '$lib/components/ui/dialog';
	import type { Task, UserProfile, AIPrioritySuggestion } from '$lib/types/types';
	import TaskFormFields from './TaskFormFields.svelte';
	import type { TaskFormData } from '$lib/types/types';
	import AITaskDetailGenerator from './AITaskDetailGenerator.svelte';
	import { Loader2 } from '@lucide/svelte';

	const taskFormSchema = z.object({
		title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less.'),
		description: z.string().max(500, 'Description must be 500 characters or less.').optional(),
		priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'NONE']),
		assigneeUids: z.array(z.string()).optional(),
		dueDate: z.string().optional(),
		tags: z.array(z.string()).optional(),
		dependentTaskTitles: z.array(z.string()).optional(),
	});

	export let isOpen: boolean;
	export let onOpenChange: (isOpen: boolean) => void;
	export let onEditTask: (taskId: string, taskData: TaskFormData) => Promise<void> | void;
	export let taskToEdit: Task | null;
	export let assignableUsers: UserProfile[];
	export let allTasksForDependencies: Pick<Task, 'id' | 'title'>[];
	export let isSubmitting: boolean = false;

	let formData: TaskFormData = {
		title: '',
		description: '',
		priority: 'NONE',
		assigneeUids: [],
		dependentTaskTitles: [],
		tags: [],
		dueDate: undefined,
	};

	let currentTaskDataForAI: Partial<TaskFormData> = {};
	let formErrors: Record<string, string> = {};

	$: {
		currentTaskDataForAI = {
			title: formData.title,
			description: formData.description,
			dueDate: formData.dueDate,
			dependentTaskTitles: formData.dependentTaskTitles,
		};
	}

	// Reset form when taskToEdit changes or dialog opens/closes
	$: if (taskToEdit && isOpen) {
		formData = {
			title: taskToEdit.title,
			description: taskToEdit.description || '',
			priority: taskToEdit.priority,
			assigneeUids: taskToEdit.assigneeUids || [],
			dueDate: taskToEdit.dueDate || undefined,
			tags: taskToEdit.tags || [],
			dependentTaskTitles: taskToEdit.dependentTaskTitles || [],
		};
		currentTaskDataForAI = formData;
	} else if (!isOpen) {
		resetForm();
	}

	function validateForm(): boolean {
		formErrors = {};
		try {
			taskFormSchema.parse(formData);
			return true;
		} catch (error) {
			if (error instanceof z.ZodError) {
				error.errors.forEach((err) => {
					if (err.path.length > 0) {
						formErrors[err.path[0] as string] = err.message;
					}
				});
			}
			return false;
		}
	}

	async function onSubmit(event: Event) {
		event.preventDefault();
		if (!taskToEdit) return;
		
		if (!validateForm()) return;
		
		try {
			await onEditTask(taskToEdit.id, formData);
			// Close dialog after successful submission
			onOpenChange(false);
		} catch (error) {
			console.error('Error submitting task edit:', error);
		}
	}

	function resetForm() {
		formData = {
			title: '',
			description: '',
			priority: 'NONE',
			assigneeUids: [],
			dependentTaskTitles: [],
			tags: [],
			dueDate: undefined,
		};
		currentTaskDataForAI = {};
		formErrors = {};
	}

	function handleAISuggestion(suggestion: AIPrioritySuggestion) {
		formData.priority = suggestion.suggestedPriority;
	}

	function updateFormData(field: keyof TaskFormData, value: any) {
		formData = { ...formData, [field]: value };
	}

	// Filter out the current task from dependencies
	$: filteredTasksForDependencies = taskToEdit 
		? allTasksForDependencies.filter(t => t.id !== taskToEdit.id)
		: allTasksForDependencies;
</script>

{#if isOpen && taskToEdit}
	<Dialog open={isOpen} onOpenChange={onOpenChange}>
		<DialogContent class="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle>Edit Task</DialogTitle>
				<DialogDescription>
					Update the details for your task. Click save when you're done.
				</DialogDescription>
			</DialogHeader>
			<form on:submit={onSubmit}>
				<TaskFormFields 
					bind:formData 
					{assignableUsers} 
					allTasksForDependencies={filteredTasksForDependencies}
					{formErrors}
					{updateFormData}
					isEditing={true}
				/>
				
				<DialogFooter class="mt-4">
					<Button type="button" variant="outline" onclick={() => onOpenChange(false)} disabled={isSubmitting}>Cancel</Button>
					<Button type="submit" disabled={isSubmitting}>
						{#if isSubmitting}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Save Changes
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

    
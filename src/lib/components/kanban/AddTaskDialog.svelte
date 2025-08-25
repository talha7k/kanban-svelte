
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
	import type { TaskFormData } from './TaskFormFields.svelte';
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
	export let onAddTask: (taskData: TaskFormData, columnId: string) => Promise<void> | void;
	export let columnId: string | null;
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
		if (!columnId) return;
		
		if (!validateForm()) return;
		
		try {
			await onAddTask(formData, columnId);
			resetForm();
			onOpenChange(false);
		} catch (error) {
			console.error('Error submitting task from dialog:', error);
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

	function handleDialogClose() {
		if (!isSubmitting) {
			resetForm();
			onOpenChange(false);
		}
	}

	function handleAISuggestion(suggestion: AIPrioritySuggestion) {
		formData.priority = suggestion.suggestedPriority;
	}

	function updateFormData(field: keyof TaskFormData, value: any) {
		formData = { ...formData, [field]: value };
	}
</script>

{#if isOpen && columnId}
	<Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); else onOpenChange(open); }}>
		<DialogContent class="sm:max-w-[525px] max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle>Add New Task</DialogTitle>
				<DialogDescription>
					Fill in the details for your new task. Click save when you're done.
				</DialogDescription>
			</DialogHeader>
			<form on:submit={onSubmit}>
				<TaskFormFields 
					bind:formData 
					{assignableUsers} 
					{allTasksForDependencies}
					{formErrors}
					{updateFormData}
				/>
				
				<DialogFooter class="mt-4">
					<Button type="button" variant="outline" onclick={handleDialogClose} disabled={isSubmitting}>Cancel</Button>
					<Button type="submit" disabled={isSubmitting}>
						{#if isSubmitting}
							<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						{/if}
						Save Task
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	</Dialog>
{/if}

    
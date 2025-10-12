
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
	import type { Task, UserProfile, AIPrioritySuggestion, CardType, CardTypeId } from '$lib/types/types';
	import TaskFormFields from './TaskFormFields.svelte';
	import type { TaskFormData } from '$lib/types/types';
	import AITaskDetailGenerator from './AITaskDetailGenerator.svelte';
	import { Loader2, ChevronRight } from '@lucide/svelte';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';

	const taskFormSchema = z.object({
		title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less.'),
		description: z.string().max(500, 'Description must be 500 characters or less.').optional(),
		priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'NONE']),
		assigneeUids: z.array(z.string()).optional(),
		dueDate: z.string().optional(),
		tags: z.array(z.string()).optional(),
	});

	export let isOpen: boolean;
	export let onOpenChange: (isOpen: boolean) => void;
	export let onAddTask: (taskData: TaskFormData, columnId: string, cardTypeId?: CardTypeId) => Promise<void> | void;
	export let columnId: string | null;
	export let assignableUsers: UserProfile[];
	export let cardTypes: CardType[] = [];

	export let isSubmitting: boolean = false;

	let selectedCardType: CardType | null = null;
	let showTypeSelection = true;

	let formData: TaskFormData = {
		title: '',
		description: '',
		priority: 'NONE',
		assigneeUids: [],
		tags: [],
		dueDate: undefined,
		fieldValues: {},
	};

	let currentTaskDataForAI: Partial<TaskFormData> = {};
	let formErrors: Record<string, string> = {};

	$: {
		currentTaskDataForAI = {
			title: formData.title,
			description: formData.description,
			dueDate: formData.dueDate,
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
		if (!columnId || !selectedCardType) return;

		if (!validateForm()) return;

		try {
			await onAddTask(formData, columnId, selectedCardType.id);
			resetForm();
			onOpenChange(false);
		} catch (error) {
			console.error('Error submitting task from dialog:', error);
		}
	}

	function resetForm() {
		selectedCardType = null;
		showTypeSelection = true;
		formData = {
			title: '',
			description: '',
			priority: 'NONE',
			assigneeUids: [],
			tags: [],
			dueDate: undefined,
			fieldValues: {},
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

	function selectCardType(cardType: CardType) {
		selectedCardType = cardType;
		showTypeSelection = false;
		// Reset field values when changing card type
		formData.fieldValues = {};
	}

	function goBackToTypeSelection() {
		showTypeSelection = true;
		selectedCardType = null;
	}
</script>

{#if isOpen && columnId}
	<Dialog open={isOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); else onOpenChange(open); }}>
		<DialogContent class="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
			<DialogHeader>
				<DialogTitle>
					{#if showTypeSelection}
						Select Card Type
					{:else}
						Add New {selectedCardType?.name || 'Task'}
					{/if}
				</DialogTitle>
				<DialogDescription>
					{#if showTypeSelection}
						Choose the type of card you want to create. Each type has different fields and requirements.
					{:else}
						Fill in the details for your new {selectedCardType?.name.toLowerCase() || 'task'}. Click save when you're done.
					{/if}
				</DialogDescription>
			</DialogHeader>

			{#if showTypeSelection}
				<!-- Card Type Selection -->
				<div class="space-y-4">
					{#if cardTypes.length === 0}
						<div class="text-center py-8 text-muted-foreground">
							<p>No card types available. Please create card types first.</p>
						</div>
					{:else}
						<div class="grid gap-3">
							{#each cardTypes as cardType (cardType.id)}
								<Card
									class="cursor-pointer hover:bg-accent/50 transition-colors"
									onclick={() => selectCardType(cardType)}
								>
									<CardContent class="p-4">
										<div class="flex items-center justify-between">
											<div class="flex items-center gap-3">
												<div
													class="w-4 h-4 rounded-full border-2 border-white shadow-sm"
													style="background-color: {cardType.color || '#3b82f6'}"
												></div>
												<div>
													<h3 class="font-medium">{cardType.name}</h3>
													{#if cardType.description}
														<p class="text-sm text-muted-foreground">{cardType.description}</p>
													{/if}
												</div>
											</div>
											<div class="flex items-center gap-2">
												{#if cardType.fields.length > 0}
													<Badge variant="secondary" class="text-xs">
														{cardType.fields.length} field{cardType.fields.length !== 1 ? 's' : ''}
													</Badge>
												{/if}
												<ChevronRight class="h-4 w-4 text-muted-foreground" />
											</div>
										</div>
									</CardContent>
								</Card>
							{/each}
						</div>
					{/if}
				</div>

				<DialogFooter class="mt-4">
					<Button type="button" variant="outline" onclick={handleDialogClose} disabled={isSubmitting}>
						Cancel
					</Button>
				</DialogFooter>
			{:else}
				<!-- Task Form -->
				<form on:submit={onSubmit}>
					<TaskFormFields
						bind:formData
						{assignableUsers}
						{formErrors}
						{updateFormData}
						{selectedCardType}
					/>

					<DialogFooter class="mt-4">
						<Button type="button" variant="outline" onclick={goBackToTypeSelection} disabled={isSubmitting}>
							Back
						</Button>
						<Button type="button" variant="outline" onclick={handleDialogClose} disabled={isSubmitting}>
							Cancel
						</Button>
						<Button type="submit" disabled={isSubmitting}>
							{#if isSubmitting}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{/if}
							Save {selectedCardType?.name || 'Task'}
						</Button>
					</DialogFooter>
				</form>
			{/if}
		</DialogContent>
	</Dialog>
{/if}

    
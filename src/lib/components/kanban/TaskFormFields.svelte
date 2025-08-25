 
<script lang="ts">
	import type { Task, UserProfile, AIPrioritySuggestion } from '$lib/types/types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Check, ChevronsUpDown, X } from '@lucide/svelte';
	import { cn } from '$lib/utils';
	import { Command } from 'bits-ui';
	import { Badge } from '$lib/components/ui/badge';
	import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
	import type { TaskFormData } from '$lib/types/types';

	export let assignableUsers: UserProfile[];
	export let allTasksForDependencies: Pick<Task, 'id' | 'title'>[];
	export const isEditing: boolean = false;
	export let formErrors: Record<string, string> = {};
	export let updateFormData: (field: keyof TaskFormData, value: any) => void;
	export let formData: TaskFormData;

	$: selectedAssignees = formData.assigneeUids || [];
	$: selectedDependencies = formData.dependentTaskTitles || [];
	let aiBrief = '';
	let isAiDialogOpen = false;

	function handleAIDetailsGenerated(details: { title: string; description: string }) {
		updateFormData('title', details.title);
		updateFormData('description', details.description);
		isAiDialogOpen = false;
	}

	function handlePriorityChange(value: string | undefined) {
		if (value) {
			updateFormData('priority', value as Task['priority']);
		}
	}




	function toggleAssignee(userId: string) {
		const currentSelection = formData.assigneeUids || [];
		const newSelection = currentSelection.includes(userId)
			? currentSelection.filter(id => id !== userId)
			: [...currentSelection, userId];
		updateFormData('assigneeUids', newSelection);
	}

	function toggleDependentTask(taskTitle: string) {
		const currentSelection = formData.dependentTaskTitles || [];
		const newSelection = currentSelection.includes(taskTitle)
			? currentSelection.filter(title => title !== taskTitle)
			: [...currentSelection, taskTitle];
		updateFormData('dependentTaskTitles', newSelection);
	}


</script>

<div class="grid gap-4 py-4">
	<div class="space-y-1">
		<div class="flex justify-between items-center">
			<Label for="title">Title</Label>
			<Dialog bind:open={isAiDialogOpen}>
				<DialogTrigger>
					<Button variant="outline" size="sm" class="ml-2">
						Generate with AI
					</Button>
				</DialogTrigger>
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
						<!-- AITaskDetailGenerator component removed due to missing dependencies -->
					</div>
				</DialogContent>
			</Dialog>
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
	<div class="grid grid-cols-2 gap-4">
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
				class="w-full"
			/>
			{#if formErrors.dueDate}
				<p class="text-xs text-destructive">{formErrors.dueDate}</p>
			{/if}
		</div>
	</div>
	<div class="space-y-1">
		<Label>Assignees</Label>
		<Popover>
			<PopoverTrigger>
				<Button variant="outline" role="combobox" class="w-full justify-between">
					{selectedAssignees.length > 0
						? assignableUsers.filter(user => selectedAssignees.includes(user.id)).map(user => user.name).join(', ')
						: "Select assignees..."}
					<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent class="w-[--radix-popover-trigger-width] p-0">
				<Command.Root>
					<Command.Input placeholder="Search users..." />
					<Command.List>
						<Command.Empty>No users found in this project.</Command.Empty>
						<Command.Group>
							{#each assignableUsers as user (user.id)}
								<Command.Item
									value={user.name}
									onSelect={() => toggleAssignee(user.id)}
								>
									<Check
										class={cn(
											"mr-2 h-4 w-4",
											selectedAssignees.includes(user.id) ? "opacity-100" : "opacity-0"
										)}
									/>
									{user.name}
								</Command.Item>
							{/each}
						</Command.Group>
					</Command.List>
				</Command.Root>
			</PopoverContent>
		</Popover>
		{#if formErrors.assigneeUids}
			<p class="text-xs text-destructive">{formErrors.assigneeUids}</p>
		{/if}
	</div>
	<div class="space-y-1">
		<Label>Dependent Tasks (for AI)</Label>
		<Popover>
			<PopoverTrigger>
				<Button variant="outline" role="combobox" class="w-full justify-between">
					{selectedDependencies.length > 0
						? selectedDependencies.join(', ')
						: "Select dependent tasks..."}
					<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
				</Button>
			</PopoverTrigger>
			<PopoverContent class="w-[--radix-popover-trigger-width] p-0">
				<Command.Root>
					<Command.Input placeholder="Search tasks..." />
					<Command.List>
						<Command.Empty>No tasks found.</Command.Empty>
						<Command.Group>
							{#each allTasksForDependencies as taskDep (taskDep.id)}
								<Command.Item
									value={taskDep.title}
									onSelect={() => toggleDependentTask(taskDep.title)}
								>
									<Check
										class={cn(
											"mr-2 h-4 w-4",
											selectedDependencies.includes(taskDep.title) ? "opacity-100" : "opacity-0"
										)}
									/>
									{taskDep.title}
								</Command.Item>
							{/each}
						</Command.Group>
					</Command.List>
				</Command.Root>
			</PopoverContent>
		</Popover>
		{#if formErrors.dependentTaskTitles}
			<p class="text-xs text-destructive">{formErrors.dependentTaskTitles}</p>
		{/if}
	</div>
</div>

    
<script lang="ts">
	import type { Task } from '$lib/types/types';
	import type { GenerateTaskDetailsInput, GenerateTaskDetailsOutput } from '$lib/server/ai/flows/generate-task-details';
	import { generateTaskDetailsAction } from '$lib/server/actions/project';
	import { Button } from '$lib/components/ui/button';
	import { Wand2 } from '@lucide/svelte';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import { toast } from 'svelte-sonner';

	export let briefInput: string;
	export let onDetailsGenerated: ((details: GenerateTaskDetailsOutput) => void) | undefined = undefined;

	let isLoading = false;
	let generatedDetails: GenerateTaskDetailsOutput | null = null;
	let error: string | null = null;

	async function handleGenerateDetails() {
		isLoading = true;
		error = null;
		generatedDetails = null;

		const input: GenerateTaskDetailsInput = {
			briefInput: briefInput,
		};

		try {
			const response = await generateTaskDetailsAction(input);
			if (response.success && response.details) {
				generatedDetails = response.details;
				if (onDetailsGenerated) {
					onDetailsGenerated(response.details);
				}
				toast.success(`AI Task Details Generated - Title: ${response.details.title}`);
			} else if (response.error) {
				throw new Error(response.error);
			} else {
				throw new Error("Unknown error during AI task details generation.");
			}
		} catch (err) {
			console.error("Error generating AI task details:", err);
			error = err instanceof Error ? err.message : "An unknown error occurred.";
			toast.error("AI Generation Failed - Could not generate task details at this time.");
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="space-y-3 my-4">
	<Button onclick={handleGenerateDetails} disabled={isLoading} variant="outline" size="sm">
		<Wand2 class="mr-2 h-4 w-4" />
		{isLoading ? 'Generating Details...' : 'Generate Task Details with AI'}
	</Button>

	{#if error}
		<Alert variant="destructive">
			<AlertTitle>Error</AlertTitle>
			<AlertDescription>{error}</AlertDescription>
		</Alert>
	{/if}

	{#if generatedDetails && !error}
		<Alert variant="default" class="bg-primary/10 border-primary/30">
			<AlertTitle class="text-primary flex items-center">
				<Wand2 class="mr-2 h-4 w-4" /> AI Generated Details:
			</AlertTitle>
			<AlertDescription>
				<strong>Title:</strong> {generatedDetails.title}
				<br />
				<strong>Description:</strong> {generatedDetails.description}
			</AlertDescription>
		</Alert>
	{/if}
</div>

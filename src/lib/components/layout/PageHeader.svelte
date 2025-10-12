<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowLeft } from '@lucide/svelte';
	import type { UserProfile } from '$lib/types/types';

	interface Props {
		title: string;
		description?: string;
		creator?: UserProfile | null;
		backUrl?: string;
		actions?: Array<{
			label: string;
			icon?: any;
			variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
			onClick: () => void;
			disabled?: boolean;
		}>;
	}

	let { title, description, creator, backUrl, actions = [] }: Props = $props();
</script>

{#if title || backUrl || actions.length > 0}
	<div class="p-4 border-b bg-card">
		<div class="container mx-auto">
			<div class="flex items-center justify-between w-full">
				<div class="flex items-center gap-4">
					{#if backUrl}
						<Button onclick={() => window.location.href = backUrl} variant="outline" size="icon">
							<ArrowLeft class="h-4 w-4" />
						</Button>
					{/if}
					<div class="flex flex-col">
						<h1 class="text-2xl font-bold text-card-foreground">
							{title}
						</h1>
						{#if description}
							<p class="text-sm text-muted-foreground mt-1">
								{description}
							</p>
						{/if}
						{#if creator}
							<p class="text-sm text-muted-foreground mt-1">
								Created by: {creator.name}
							</p>
						{/if}
					</div>
				</div>
				{#if actions.length > 0}
					<div class="flex flex-col sm:flex-row gap-2">
						{#each actions as action}
							<Button
								variant={action.variant || 'default'}
								onclick={action.onClick}
								disabled={action.disabled}
								class="mb-2 sm:mb-0"
							>
								{#if action.icon}
									<action.icon class="h-5 w-5" />
								{/if}
								{action.label}
							</Button>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
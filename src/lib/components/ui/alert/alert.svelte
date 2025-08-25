<script lang="ts">
	import { cn } from '$lib/utils';
	import type { Snippet } from 'svelte';

	let {
		class: className,
		variant = 'default',
		children,
		...restProps
	}: {
		class?: string;
		variant?: 'default' | 'destructive';
		children: Snippet;
	} & Record<string, any> = $props();
</script>

<div
	class={cn(
		'relative w-full rounded-lg border p-4',
		{
			'border-border text-foreground': variant === 'default',
			'border-destructive/50 text-destructive dark:border-destructive': variant === 'destructive'
		},
		className
	)}
	{...restProps}
>
	{@render children()}
</div>
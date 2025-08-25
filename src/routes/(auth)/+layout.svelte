<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	import { currentUser } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	
	let { children } = $props();

	onMount(() => {
		if (browser) {
			// Redirect authenticated users away from auth pages
			const unsubscribe = currentUser.subscribe((user) => {
				if (user) {
					goto('/teams');
				}
			});

			return () => {
				unsubscribe();
			};
		}
	});
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
	{@render children?.()}
	<Toaster />
</div>
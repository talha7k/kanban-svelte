<script lang="ts">
	import { Toaster } from '$lib/components/ui/sonner';
	
	let { children } = $props();
</script>

<div class="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10 p-4">
	{@render children?.()}
	<Toaster />
</div>
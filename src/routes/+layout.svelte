<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	// import AppHeader from '$lib/components/layout/AppHeader.svelte'; // TODO: Convert from TSX
	import { Toaster } from '$lib/components/ui/sonner';
	import { Skeleton } from '$lib/components/ui/skeleton';
	
	let { children } = $props();
	
	// Auth state
	let currentUser: any = $state(null);
	let loading = $state(true);
	let selectedTeamId: string | null = $state(null);
	let teamLoading = $state(true);
	
	// Check if current route is auth route
	let isAuthRoute = $derived($page.route.id?.startsWith('/(auth)') ?? false);
	
	onMount(async () => {
		if (browser) {
			// Load auth state from localStorage or API
			try {
				const storedUser = localStorage.getItem('currentUser');
				if (storedUser) {
					currentUser = JSON.parse(storedUser);
				}
				
				const storedTeamId = localStorage.getItem('selectedTeamId');
				if (storedTeamId) {
					selectedTeamId = storedTeamId;
				}
			} catch (e) {
				console.error('Failed to load auth state', e);
			} finally {
				loading = false;
				teamLoading = false;
			}
			
			// Redirect logic
			if (!currentUser && !isAuthRoute) {
				goto('/login');
			} else if (currentUser && isAuthRoute) {
				goto('/teams');
			} else if (currentUser && !selectedTeamId && !$page.url.pathname.includes('/teams')) {
				goto('/teams');
			}
		}
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if loading || teamLoading}
	<div class="min-h-screen flex flex-col items-center justify-center bg-background p-4">
		<div class="space-y-4 w-full max-w-md">
			<Skeleton class="h-12 w-full" />
			<Skeleton class="h-8 w-3/4" />
			<Skeleton class="h-32 w-full" />
			<Skeleton class="h-32 w-full" />
		</div>
	</div>
{:else if isAuthRoute}
	<!-- Auth routes don't need the main layout -->
	{@render children?.()}
{:else if currentUser}
	<div class="min-h-screen flex flex-col bg-background">
		<!-- <AppHeader /> TODO: Convert AppHeader from TSX to Svelte -->
		<main class="flex-1">
			{@render children?.()}
		</main>
		<Toaster />
	</div>
{:else}
	<!-- Fallback for unauthenticated users -->
	{@render children?.()}
{/if}

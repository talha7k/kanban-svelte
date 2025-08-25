<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { currentUser, authLoading } from '$lib/stores/auth';
	import { selectedTeamId, setSelectedTeamId } from '$lib/stores/team';
	import { browser } from '$app/environment';
	import { Toaster } from 'svelte-sonner';
	import AppHeader from '$lib/components/layout/AppHeader.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { TeamId } from '$lib/types/types';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/queryClient';

	let teamLoading = $state(true);
	let children: any;

	// Load selected team from localStorage
	async function loadSelectedTeam() {
		if (!browser) return;
		
		try {
			const storedTeamId = localStorage.getItem('selectedTeamId');
			if (storedTeamId) {
				setSelectedTeamId(storedTeamId as TeamId);
			}
		} catch (e) {
			console.error('Failed to load selected team from storage', e);
		} finally {
			teamLoading = false;
		}
	}

	// Handle authentication and team selection navigation
	$effect(() => {
		if (!$authLoading && !$currentUser) {
			goto('/login');
		} else if ($currentUser && teamLoading) {
			loadSelectedTeam();
		}
	});

	// Handle team selection navigation
	$effect(() => {
		if (!$authLoading && !teamLoading && $currentUser && !$selectedTeamId) {
			// Only redirect to teams if we're not already on the teams page
			if ($page.url.pathname !== '/teams') {
				goto('/teams');
			}
		}
	});

	onMount(() => {
		if ($currentUser) {
			loadSelectedTeam();
		}
	});

	let isLoading = $derived($authLoading || teamLoading);
	let isTeamsPage = $derived($page.url.pathname === '/teams');
	let shouldShowContent = $derived($currentUser && ($selectedTeamId || isTeamsPage));
</script>

{#if isLoading}
	<div class="min-h-screen flex flex-col items-center justify-center bg-background p-4">
		<div class="space-y-4 w-full max-w-md">
			<Skeleton class="h-12 w-full" />
			<Skeleton class="h-8 w-3/4" />
			<Skeleton class="h-32 w-full" />
			<Skeleton class="h-32 w-full" />
		</div>
	</div>
{:else if !$currentUser}
	<!-- Authentication redirect handled by effect -->
	<div class="min-h-screen flex items-center justify-center">
		<p>Redirecting to login...</p>
	</div>
{:else if !shouldShowContent}
	<!-- Team selection redirect handled by effect -->
	<div class="min-h-screen flex items-center justify-center">
		<p>Redirecting to team selection...</p>
	</div>
{:else}
	<QueryClientProvider client={queryClient}>
		<div class="min-h-screen flex flex-col bg-background">
			<AppHeader />
			<main class="flex-1">
				{@render children()}
			</main>
			<Toaster />
		</div>
	</QueryClientProvider>
{/if}

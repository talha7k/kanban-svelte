<script lang="ts">
	import '../app.css';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { currentUser, authLoading, authStore } from '$lib/stores/auth';
	import { selectedTeamId, setSelectedTeamId } from '$lib/stores/team';
	import { browser } from '$app/environment';
	import { Toaster } from 'svelte-sonner';
	import AppHeader from '$lib/components/layout/AppHeader.svelte';
	import LandingPage from '$lib/components/landing/LandingPage.svelte';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import type { TeamId } from '$lib/types/types';
	import { QueryClientProvider } from '@tanstack/svelte-query';
	import { queryClient } from '$lib/queryClient';

	let teamLoading = $state(true);
	let { children } = $props();

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
			// Only redirect to login if not on home, login, or signup pages
			if ($page.url.pathname !== '/' && $page.url.pathname !== '/login' && $page.url.pathname !== '/signup') {
				goto('/login');
			}
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
		// Initialize auth store
		authStore.init();
		
		if ($currentUser) {
			loadSelectedTeam();
		}
	});

	let isLoading = $derived($authLoading || ($currentUser && teamLoading));
	let isTeamsPage = $derived($page.url.pathname === '/teams');
	let isHomePage = $derived($page.url.pathname === '/');
	let shouldShowContent = $derived($currentUser && ($selectedTeamId || isTeamsPage));
	let shouldShowLanding = $derived(!$currentUser && isHomePage && !$authLoading);


</script>

{#if isHomePage && !$currentUser}
	<!-- Show landing page for unauthenticated users on home page -->
	<QueryClientProvider client={queryClient}>
		<LandingPage />
		<Toaster />
	</QueryClientProvider>
{:else if isLoading}
	<div class="min-h-screen flex flex-col items-center justify-center bg-background p-4">
		<div class="space-y-4 w-full max-w-md">
			<Skeleton class="h-12 w-full" />
			<Skeleton class="h-8 w-3/4" />
			<Skeleton class="h-32 w-full" />
			<Skeleton class="h-32 w-full" />
		</div>
	</div>
{:else if !$currentUser && $page.url.pathname !== '/' && $page.url.pathname !== '/login' && $page.url.pathname !== '/signup'}
	<!-- Authentication redirect handled by effect -->
	<div class="min-h-screen flex items-center justify-center">
		<p>Redirecting to login...</p>
	</div>
{:else if !shouldShowContent && $currentUser && $page.url.pathname !== '/login' && $page.url.pathname !== '/signup'}
	<!-- Team selection page should render here -->
	<QueryClientProvider client={queryClient}>
		<div class="min-h-screen flex flex-col bg-background">
			<AppHeader />
			<main class="flex-1">
				{@render children()}
			</main>
			<Toaster />
		</div>
	</QueryClientProvider>
{:else if shouldShowContent}
	<QueryClientProvider client={queryClient}>
		<div class="min-h-screen flex flex-col bg-background">
			<AppHeader />
			<main class="flex-1">
				{@render children()}
			</main>
			<Toaster />
		</div>
	</QueryClientProvider>
{:else}
	<!-- Login/Signup pages and other unauthenticated pages -->
	<QueryClientProvider client={queryClient}>
		<div class="min-h-screen bg-background">
			{@render children()}
			<Toaster />
		</div>
	</QueryClientProvider>
{/if}

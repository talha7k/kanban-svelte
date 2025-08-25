<script lang="ts">
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { toast } from 'svelte-sonner';
	import { authStore, authLoading } from '$lib/stores/auth';
	
	// Form state
	let email = $state('');
	let password = $state('');
	let isSubmitting = $state(false);
	let formError = $state<string | null>(null);
	
	// Form validation
	let emailError = $derived(email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? 'Invalid email address' : '');
	let passwordError = $derived(password && password.length < 6 ? 'Password must be at least 6 characters' : '');
	let isFormValid = $derived(email && password && !emailError && !passwordError);
	
	async function handleSubmit(event: Event) {
		event.preventDefault();
		if (!isFormValid || isSubmitting) return;
		
		isSubmitting = true;
		formError = null;
		
		try {
			await authStore.login(email, password);
			
			toast.success('Login Successful!', {
				description: 'Redirecting to teams...'
			});
			
			goto('/teams');
		} catch (error: any) {
			const errorMessage = error.message || 'Failed to login. Please check your credentials.';
			formError = errorMessage;
			toast.error('Login Failed', {
				description: errorMessage
			});
			console.error('Login error:', error);
		} finally {
			isSubmitting = false;
		}
	}
</script>

{#if $authLoading}
	<div class="w-full max-w-md">
		<div class="animate-pulse space-y-4">
			<div class="h-32 bg-muted rounded-lg"></div>
			<div class="h-8 bg-muted rounded"></div>
			<div class="h-8 bg-muted rounded"></div>
		</div>
	</div>
{:else}
	<Card class="w-full max-w-md shadow-2xl p-4">
		<CardHeader class="items-center text-center">
			<!-- TODO: Add KanbanIcon component -->
			<div class="w-12 h-12 bg-primary rounded-lg mb-2 flex items-center justify-center">
				<span class="text-primary-foreground font-bold text-xl">K</span>
			</div>
			<CardTitle class="text-2xl">Welcome Back!</CardTitle>
			<CardDescription>Login to access your DijiKanban dashboard.</CardDescription>
		</CardHeader>
		<CardContent>
			<form on:submit={handleSubmit} class="space-y-4">
				{#if formError}
					<p class="text-sm text-destructive text-center">{formError}</p>
				{/if}
				<div class="space-y-1.5">
					<Label for="email">Email</Label>
					<Input 
						id="email" 
						type="email" 
						bind:value={email} 
						placeholder="you@example.com"
						required
					/>
					{#if emailError}
						<p class="text-xs text-destructive">{emailError}</p>
					{/if}
				</div>
				<div class="space-y-1.5">
					<Label for="password">Password</Label>
					<Input 
						id="password" 
						type="password" 
						bind:value={password} 
						placeholder="••••••••"
						required
					/>
					{#if passwordError}
						<p class="text-xs text-destructive">{passwordError}</p>
					{/if}
				</div>
				<Button 
					type="submit" 
					class="w-full" 
					disabled={!isFormValid || isSubmitting}
				>
					{isSubmitting ? 'Logging in...' : 'Login'}
				</Button>
			</form>
		</CardContent>
		<CardFooter class="flex flex-col items-center space-y-2 text-sm">
			<p>
				Don't have an account?
				<Button variant="link" class="p-0 h-auto">
					<a href="/signup">Sign up</a>
				</Button>
			</p>
			<Button variant="link" class="p-0 h-auto text-xs">
				<a href="/">Back to Home</a>
			</Button>
		</CardFooter>
	</Card>
{/if}
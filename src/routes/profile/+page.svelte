<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { currentUser, userProfile, authLoading, authStore } from '$lib/stores/auth';
	import { updateUserProfile } from '$lib/api/firebaseUser';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle,
	} from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import {
		User,
		Edit3,
		Save,
		X,
		Loader2,
		Mail,
		Calendar,
		Briefcase,
		FileText,
	} from '@lucide/svelte';

	// State variables
	let isEditing = $state(false);
	let isSaving = $state(false);
	let editForm = $state({
		name: '',
		title: '',
		bio: '',
		avatarUrl: ''
	});

	// Initialize form with current profile data
	function initializeForm() {
		if ($userProfile) {
			editForm = {
				name: $userProfile.name || '',
				title: $userProfile.title || '',
				bio: $userProfile.bio || '',
				avatarUrl: $userProfile.avatarUrl || ''
			};
		}
	}

	function startEditing() {
		initializeForm();
		isEditing = true;
	}

	function cancelEditing() {
		isEditing = false;
		initializeForm(); // Reset form to original values
	}

	async function saveProfile() {
		if (!$currentUser || !$userProfile) {
			toast.error('Error', {
				description: 'User not authenticated'
			});
			return;
		}

		if (!editForm.name.trim()) {
			toast.error('Validation Error', {
				description: 'Name is required'
			});
			return;
		}

		isSaving = true;

		try {
			await updateUserProfile($currentUser.uid, {
				name: editForm.name.trim(),
				title: editForm.title.trim(),
				bio: editForm.bio.trim(),
				avatarUrl: editForm.avatarUrl.trim()
			});

			// Refresh user profile
			await authStore.refreshUserProfile();

			toast.success('Profile Updated!', {
				description: 'Your profile has been updated successfully.'
			});

			isEditing = false;
		} catch (error) {
			console.error('Error updating profile:', error);
			toast.error('Update Failed', {
				description: 'Could not update profile. Please try again.'
			});
		} finally {
			isSaving = false;
		}
	}

	function formatDate(dateString: string | undefined) {
		if (!dateString) return 'Unknown';
		try {
			return new Date(dateString).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} catch {
			return 'Unknown';
		}
	}

	onMount(() => {
		if (!$currentUser) {
			goto('/login');
			return;
		}
		initializeForm();
	});

	// Effect to update form when profile changes
	$effect(() => {
		if ($userProfile && !isEditing) {
			initializeForm();
		}
	});
</script>

<div class="container mx-auto px-4 py-8 max-w-4xl">
	{#if $authLoading}
		<div class="space-y-6">
			<div class="flex items-center space-x-4">
				<Skeleton class="h-20 w-20 rounded-full" />
				<div class="space-y-2">
					<Skeleton class="h-8 w-48" />
					<Skeleton class="h-4 w-32" />
				</div>
			</div>
			<Skeleton class="h-64" />
		</div>
	{:else if !$currentUser}
		<div class="text-center py-12">
			<User class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
			<h3 class="text-lg font-semibold mb-2">Not authenticated</h3>
			<p class="text-muted-foreground mb-4">
				Please log in to view your profile
			</p>
			<Button onclick={() => goto('/login')}>
				Go to Login
			</Button>
		</div>
	{:else if !$userProfile}
		<div class="text-center py-12">
			<User class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
			<h3 class="text-lg font-semibold mb-2">Profile not found</h3>
			<p class="text-muted-foreground mb-4">
				Unable to load your profile information
			</p>
			<Button onclick={() => authStore.refreshUserProfile()}>
				Refresh Profile
			</Button>
		</div>
	{:else}
		<div class="space-y-6">
			<!-- Header -->
			<div class="flex items-center justify-between">
				<div class="flex items-center space-x-4">
					<Avatar class="h-20 w-20">
						<AvatarImage src={$userProfile.avatarUrl} alt={$userProfile.name} />
						<AvatarFallback class="text-2xl">
							{$userProfile.name.substring(0, 1).toUpperCase()}
						</AvatarFallback>
					</Avatar>
					<div>
						<h1 class="text-3xl font-bold tracking-tight">{$userProfile.name}</h1>
						{#if $userProfile.title}
							<p class="text-lg text-muted-foreground">{$userProfile.title}</p>
						{/if}
					</div>
				</div>
				{#if !isEditing}
					<Button onclick={startEditing}>
						<Edit3 class="mr-2 h-4 w-4" />
						Edit Profile
					</Button>
				{/if}
			</div>

			{#if isEditing}
				<!-- Edit Form -->
				<Card>
					<CardHeader>
						<CardTitle>Edit Profile</CardTitle>
						<CardDescription>
							Update your profile information
						</CardDescription>
					</CardHeader>
					<CardContent class="space-y-4">
						<div class="grid gap-2">
							<Label for="edit-name">Full Name *</Label>
							<Input
								id="edit-name"
								bind:value={editForm.name}
								placeholder="Enter your full name"
								required
							/>
						</div>
						<div class="grid gap-2">
							<Label for="edit-title">Title/Position</Label>
							<Input
								id="edit-title"
								bind:value={editForm.title}
								placeholder="e.g., Software Engineer, Project Manager"
							/>
						</div>
						<div class="grid gap-2">
							<Label for="edit-bio">Bio</Label>
							<Textarea
								id="edit-bio"
								bind:value={editForm.bio}
								placeholder="Tell us about yourself..."
								rows={4}
							/>
						</div>
						<div class="grid gap-2">
							<Label for="edit-avatar">Avatar URL</Label>
							<Input
								id="edit-avatar"
								bind:value={editForm.avatarUrl}
								placeholder="https://example.com/avatar.jpg"
								type="url"
							/>
						</div>
					</CardContent>
					<CardFooter class="flex justify-end space-x-2">
						<Button variant="outline" onclick={cancelEditing} disabled={isSaving}>
							<X class="mr-2 h-4 w-4" />
							Cancel
						</Button>
						<Button onclick={saveProfile} disabled={isSaving}>
							{#if isSaving}
								<Loader2 class="mr-2 h-4 w-4 animate-spin" />
							{:else}
								<Save class="mr-2 h-4 w-4" />
							{/if}
							Save Changes
						</Button>
					</CardFooter>
				</Card>
			{:else}
				<!-- Profile Display -->
				<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<!-- Main Profile Info -->
					<div class="lg:col-span-2">
						<Card>
							<CardHeader>
								<CardTitle class="flex items-center">
									<User class="mr-2 h-5 w-5" />
									Profile Information
								</CardTitle>
							</CardHeader>
							<CardContent class="space-y-4">
								<div class="flex items-center space-x-3">
									<Mail class="h-4 w-4 text-muted-foreground" />
									<span class="text-sm">{$userProfile.email || 'No email provided'}</span>
								</div>
								{#if $userProfile.title}
									<div class="flex items-center space-x-3">
										<Briefcase class="h-4 w-4 text-muted-foreground" />
										<span class="text-sm">{$userProfile.title}</span>
									</div>
								{/if}
								<div class="flex items-center space-x-3">
									<Calendar class="h-4 w-4 text-muted-foreground" />
									<span class="text-sm">Joined {formatDate($userProfile.createdAt)}</span>
								</div>
								{#if $userProfile.bio}
									<div class="pt-4 border-t">
										<div class="flex items-start space-x-3">
											<FileText class="h-4 w-4 text-muted-foreground mt-0.5" />
											<div>
												<h4 class="text-sm font-medium mb-1">About</h4>
												<p class="text-sm text-muted-foreground whitespace-pre-wrap">{$userProfile.bio}</p>
											</div>
										</div>
									</div>
								{/if}
							</CardContent>
						</Card>
					</div>

					<!-- Quick Actions -->
					<div class="lg:col-span-1">
						<Card>
							<CardHeader>
								<CardTitle class="text-lg">Quick Actions</CardTitle>
							</CardHeader>
							<CardContent class="space-y-3">
								<Button class="w-full justify-start" variant="outline" onclick={() => goto('/teams')}>
									<User class="mr-2 h-4 w-4" />
									View Teams
								</Button>
								<Button class="w-full justify-start" variant="outline" onclick={startEditing}>
									<Edit3 class="mr-2 h-4 w-4" />
									Edit Profile
								</Button>
							</CardContent>
						</Card>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>
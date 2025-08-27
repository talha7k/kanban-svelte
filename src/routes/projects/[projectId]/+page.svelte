<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { currentUser, authLoading } from '$lib/stores/auth';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import type { Project, UserProfile, NewTaskData, Task } from '$lib/types/types';
	import { getProjectRelevantUsers, getUserProfile } from '$lib/api/firebaseUser';
	import { updateProjectDetails, deleteProject } from '$lib/api/firebaseProject';
	import { addTaskToProject } from '$lib/api/firebaseTask';
	import { Loader2, Settings, Sparkles, ArrowLeft, Edit2 } from '@lucide/svelte';
	import KanbanBoard from '$lib/components/kanban/KanbanBoard.svelte';
	import EditProjectDialog from '$lib/components/project/EditProjectDialog.svelte';
	import DeleteProjectAlertDialog from '$lib/components/dashboard/DeleteProjectAlertDialog.svelte';
	import GenerateTasksDialog from '$lib/components/project/GenerateTasksDialog.svelte';
	import { useProject } from '$queries/useProjectManagement';
	import { useQueryClient } from '@tanstack/svelte-query';

	// Server-loaded data
	interface PageData {
		project: Project;
	}
	
	let { data }: { data: PageData } = $props();

	// Get projectId from page params
	const queryClient = useQueryClient();

	// Use TanStack Query for project data
	const projectQuery = useProject($page.params.projectId);
	
	// Reactive state variables - use client data if available, fallback to server data
	let project: Project | null = $derived($projectQuery.data || data.project || null);
	let users: UserProfile[] = $state([]);
	let projectCreator: UserProfile | null = $state(null);
	let isLoadingUsers = $state(true);
	let isEditProjectDialogOpen = $state(false);
	let isSubmittingProjectEdit = $state(false);
	let isGenerateTasksDialogOpen = $state(false);
	let projectToDelete: Project | null = $state(null);
	let isDeletingProject = $state(false);
	let isGeneratingTasks = $state(false);
	let isAddingTasks = $state(false);

	// Fetch users when project loads
	async function fetchUsers() {
		if (!$page.params.projectId || !$currentUser) return;
		
		isLoadingUsers = true;
		try {
			const fetchedUsers = await getProjectRelevantUsers($page.params.projectId);
			users = fetchedUsers;
			
			if (project?.ownerId) {
				const creatorProfile = await getUserProfile(project.ownerId);
				projectCreator = creatorProfile;
			}
		} catch (err) {
			console.error('Error fetching users:', err);
			toast.error('Error Loading Users', {
				description: err instanceof Error ? err.message : 'Could not load project users.'
			});
		} finally {
			isLoadingUsers = false;
		}
	}

	function openDeleteProjectDialog(project: Project) {
		projectToDelete = project;
	}

	async function handleDeleteProject() {
		if (!projectToDelete || !$currentUser || $currentUser.uid !== projectToDelete.ownerId) {
			toast.error('Permission Denied', {
				description: 'Only the project owner can delete a project.'
			});
			return;
		}

		isDeletingProject = true;
		try {
			await deleteProject(projectToDelete.id);
			toast.success('Project Deleted', {
				description: `"${projectToDelete.name}" has been successfully deleted.`
			});
			goto('/teams/' + projectToDelete.teamId);
		} catch (error) {
			console.error('Error deleting project:', error);
			const errorMessage =
				error instanceof Error ? error.message : 'Could not delete project.';
			toast.error('Deletion Failed', {
				description: errorMessage
			});
		} finally {
			isDeletingProject = false;
			projectToDelete = null;
		}
	}

	async function handleEditProjectSubmit(data: {
		name: string;
		description?: string;
		teamId?: string | null;
	}) {
		if (!project || !$currentUser || $currentUser.uid !== project.ownerId) {
			toast.error('Permission Denied', {
				description: 'Only the project owner can edit details.'
			});
			return;
		}
		isSubmittingProjectEdit = true;
		try {
			const updatedProject = await updateProjectDetails(project.id, data);
			project = updatedProject;
			toast.success('Project Updated', {
				description: `"${updatedProject.name}" has been successfully updated.`
			});
			isEditProjectDialogOpen = false;
		} catch (error) {
			console.error('Error updating project:', error);
			const errorMessage =
				error instanceof Error ? error.message : 'Could not update project.';
			toast.error('Update Failed', {
				description: errorMessage
			});
		} finally {
			isSubmittingProjectEdit = false;
		}
	}

	async function handleGenerateTasks(brief: string, taskCount: number) {
		if (!project) return [];
		isGeneratingTasks = true;
		try {
			const response = await fetch('/api/generate-tasks', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					projectId: project.id,
					brief,
					currentUserUid: $currentUser!.uid,
					taskCount
				})
			});
			
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to generate tasks');
			}
			
			const data = await response.json();
			return data.tasks;
		} catch (error) {
			console.error('Error generating tasks:', error);
			toast.error('Error Generating Tasks', {
				description:
					error instanceof Error ? error.message : 'Could not generate tasks.'
			});
			return [];
		} finally {
			isGeneratingTasks = false;
		}
	}

	async function handleAddTasks(
		tasks: Omit<Task, 'id' | 'projectId' | 'createdAt' | 'updatedAt'>[]
	) {
		if (!project) return;
		isAddingTasks = true;
		try {
			// Add projectId to each task
			const tasksWithProjectId = tasks.map((task) => ({
				...task,
				projectId: project!.id
			}));
			
			const response = await fetch('/api/add-approved-tasks', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					projectId: project.id,
					tasks: tasksWithProjectId,
					currentUserUid: $currentUser!.uid
				})
			});
			
			if (!response.ok) {
				const error = await response.json();
				throw new Error(error.error || 'Failed to add tasks');
			}
			
			const result = await response.json();
			
			if (result.success) {
				if (result.updatedProject) {
					project = result.updatedProject;
				}
				// Invalidate the project query to refresh the KanbanBoard
				if (project) {
					await queryClient.invalidateQueries({ queryKey: ['project', project.id] });
				}
				toast.success('Tasks Added', {
					description: `Successfully added ${result.addedTasksCount} task${
						result.addedTasksCount !== 1 ? 's' : ''
					} to your project.`
				});
			} else {
				throw new Error(result.error);
			}
		} catch (error) {
			console.error('Error adding tasks:', error);
			toast.error('Error Adding Tasks', {
				description:
					error instanceof Error
						? error.message
						: 'Could not add tasks to project.'
			});
		} finally {
			isAddingTasks = false;
		}
	}

	// Fetch users when project data is available
	$effect(() => {
		if (project) {
			fetchUsers();
		}
	});

	// Refresh function to reload project data
	async function handleRefresh() {
		try {
			await queryClient.invalidateQueries({ queryKey: ['project', project?.id] });
			toast.success('Project refreshed successfully');
		} catch (error) {
			console.error('Error refreshing project:', error);
			toast.error('Failed to refresh project');
		}
	}

	// Access control check
	let hasAccess = $derived(
		project && $currentUser && (
			project.memberIds?.includes($currentUser.uid) ||
			project.ownerId === $currentUser.uid
		)
	);

	let isLoading = $derived($projectQuery.isLoading || isLoadingUsers);
	let error = $derived(
		$projectQuery.error?.message || 
			(!hasAccess && project ? 'You do not have access to this project.' : null)
	);
</script>

<!-- Authentication and loading guard -->
{#if $authLoading || !$currentUser}
	<div class="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
		<Loader2 class="h-12 w-12 animate-spin mb-4 text-primary" />
		<p class="text-lg">Loading...</p>
	</div>
{:else if isLoading}
	<div class="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
		<Loader2 class="h-12 w-12 animate-spin mb-4 text-primary" />
		<p class="text-lg">Loading project data...</p>
	</div>
{:else if error && !project}
	<div class="flex flex-col items-center justify-center h-full text-destructive p-8">
		<h2 class="text-2xl font-semibold mb-2">Error</h2>
		<p>{error}</p>
		<Button onclick={handleRefresh} variant="outline" class="mt-4">
			Try Reloading
		</Button>
		<Button onclick={() => goto('/teams')} variant="link" class="mt-2">
			Go to Dashboard
		</Button>
	</div>
{:else if !project}
	<div class="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
		<p class="text-lg">Project not found or you do not have access.</p>
		<Button onclick={() => goto('/teams')} variant="link" class="mt-2">
			Go to Dashboard
		</Button>
	</div>
{:else}
	<div class="h-full flex flex-col">
		<div class="p-4 border-b bg-card">
			<div class="container mx-auto">
				<div class="flex items-center justify-between w-full">
					<div class="flex items-center gap-4">
						<Button onclick={() => goto('/teams/' + project?.teamId)} variant="outline" size="icon">
							<ArrowLeft class="h-4 w-4" />
						</Button>
						<div class="flex flex-col">
							<h1 class="text-2xl font-bold text-card-foreground">
								{project.name}
							</h1>
							{#if project.description}
								<p class="text-sm text-muted-foreground mt-1">
									{project.description}
								</p>
							{/if}
							{#if projectCreator}
								<p class="text-sm text-muted-foreground mt-1">
									Created by: {projectCreator.name}
								</p>
							{/if}
						</div>
					</div>
					<div class="flex flex-col sm:flex-row gap-2">
						{#if $currentUser?.uid === project.ownerId}
							<Button
								variant="secondary"
								onclick={() => (isEditProjectDialogOpen = true)}
								class="md:mr-2 mb-2 sm:mb-0"
								disabled={isSubmittingProjectEdit}
							>
								<Edit2 class="h-5 w-5" />
								Project
							</Button>
							<Button
								variant="default"
								onclick={() => (isGenerateTasksDialogOpen = true)}
								class="mb-2 sm:mb-0"
								disabled={isSubmittingProjectEdit}
							>
								<Sparkles class="h-5 w-5" /> AI Tasks
							</Button>
						{/if}
					</div>
				</div>
			</div>
		</div>
		<div class="flex-1 min-h-0">
			<!-- Allows KanbanBoard to take remaining height -->
			<KanbanBoard {project} {users} />
		</div>
		{#if $currentUser?.uid === project.ownerId && project}
			<EditProjectDialog
				isOpen={isEditProjectDialogOpen}
				onOpenChange={(open) => isEditProjectDialogOpen = open}
				{project}
				onEditProject={handleEditProjectSubmit}
				onDeleteProject={openDeleteProjectDialog}
				isSubmitting={isSubmittingProjectEdit}
			/>
		{/if}

		{#if projectToDelete}
			<DeleteProjectAlertDialog
				{projectToDelete}
				{isDeletingProject}
				setProjectToDelete={(project) => projectToDelete = project}
				confirmDeleteProject={handleDeleteProject}
			/>
		{/if}

		{#if project}
			<GenerateTasksDialog
				isOpen={isGenerateTasksDialogOpen}
				onOpenChange={(open) => isGenerateTasksDialogOpen = open}
				onGenerate={handleGenerateTasks}
				onAddTasks={handleAddTasks}
				isGenerating={isGeneratingTasks}
				{isAddingTasks}
			/>
		{/if}
	</div>
{/if}
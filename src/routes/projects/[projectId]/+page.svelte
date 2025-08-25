<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { currentUser, authLoading } from '$lib/stores/auth';
	import { toast } from 'svelte-sonner';
	import { Button } from '$lib/components/ui/button';
	import type { Project, UserProfile, NewTaskData, Task } from '$lib/types/types';
	import { getProjectRelevantUsers, getUserProfile } from '$lib/api/firebaseUser';
	import { getProjectById, updateProjectDetails, deleteProject } from '$lib/api/firebaseProject';
	import { addTaskToProject } from '$lib/api/firebaseTask';
	import { Loader2, Settings, Sparkles, ArrowLeft, Edit2 } from '@lucide/svelte';
	import KanbanBoard from '$lib/components/kanban/KanbanBoard.svelte';
	import EditProjectDialog from '$lib/components/project/EditProjectDialog.svelte';
	import DeleteProjectAlertDialog from '$lib/components/dashboard/DeleteProjectAlertDialog.svelte';
	import GenerateTasksDialog from '$lib/components/project/GenerateTasksDialog.svelte';

	// Get projectId from page params
	let projectId = $derived($page.params.projectId);

	// State variables
	let project: Project | null = $state(null);
	let users: UserProfile[] = $state([]);
	let projectCreator: UserProfile | null = $state(null);
	let isLoadingProject = $state(true);
	let isLoadingUsers = $state(true);
	let error: string | null = $state(null);
	let isEditProjectDialogOpen = $state(false);
	let isSubmittingProjectEdit = $state(false);
	let isGenerateTasksDialogOpen = $state(false);
	let projectToDelete: Project | null = $state(null);
	let isDeletingProject = $state(false);
	let isGeneratingTasks = $state(false);
	let isAddingTasks = $state(false);

	async function fetchProjectData() {
		if (!projectId || !$currentUser) return;

		isLoadingProject = true;
		isLoadingUsers = true;
		error = null;

		try {
			const [fetchedProject, fetchedUsers] = await Promise.all([
				getProjectById(projectId),
				getProjectRelevantUsers(projectId),
			]);

			if (fetchedProject?.ownerId) {
				const creatorProfile = await getUserProfile(fetchedProject.ownerId);
				projectCreator = creatorProfile;
			}

			if (fetchedProject) {
				const isMember =
					fetchedProject.memberIds?.includes($currentUser.uid) ||
					fetchedProject.ownerId === $currentUser.uid;
				if (isMember) {
					project = fetchedProject;
				} else {
					error = `You do not have access to project ${projectId}.`;
					project = null;
					toast.error('Access Denied', {
						description: 'You do not have permission to view this project.'
					});
				}
			} else {
				error = `Project with ID ${projectId} not found.`;
				project = null;
				toast.error('Project Not Found', {
					description: `Could not load project ${projectId}.`
				});
			}
			users = fetchedUsers;
		} catch (err) {
			console.error('Error fetching project data:', err);
			const errorMessage =
				err instanceof Error ? err.message : 'An unknown error occurred.';
			error = errorMessage;
			toast.error('Error Loading Project', {
				description: errorMessage
			});
		} finally {
			isLoadingProject = false;
			isLoadingUsers = false;
		}
	}

	function openDeleteProjectDialog(projectToDelete: Project) {
		projectToDelete = projectToDelete;
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
			goto('/dashboard');
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
			// TODO: Implement generateTasksAction for SvelteKit
			// const generatedTasks = await generateTasksAction(
			//   project.id,
			//   brief,
			//   $currentUser!.uid,
			//   taskCount
			// );
			// return generatedTasks;
			return [];
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
			// TODO: Implement addApprovedTasksAction for SvelteKit
			// const result = await addApprovedTasksAction(
			//   project.id,
			//   tasksWithProjectId,
			//   $currentUser!.uid
			// );

			// if (result.success) {
			//   if (result.updatedProject) {
			//     project = result.updatedProject;
			//   }
			//   toast.success('Tasks Added', {
			//     description: `Successfully added ${result.addedTasksCount} task${
			//       result.addedTasksCount !== 1 ? 's' : ''
			//     } to your project.`
			//   });
			// } else {
			//   throw new Error(result.error);
			// }
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

	function handleRefresh() {
		fetchProjectData();
	}

	onMount(() => {
		if (projectId && $currentUser) {
			fetchProjectData();
		}
	});

	// Effect to fetch data when projectId or currentUser changes
	$effect(() => {
		if (projectId && $currentUser && !$authLoading) {
			fetchProjectData();
		}
	});

	let isLoading = $derived(isLoadingProject || isLoadingUsers);
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
		<Button onclick={() => goto('/dashboard')} variant="link" class="mt-2">
			Go to Dashboard
		</Button>
	</div>
{:else if !project}
	<div class="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
		<p class="text-lg">Project not found or you do not have access.</p>
		<Button onclick={() => goto('/dashboard')} variant="link" class="mt-2">
			Go to Dashboard
		</Button>
	</div>
{:else}
	<div class="h-full flex flex-col">
		<div class="p-4 border-b bg-card">
			<div class="container mx-auto">
				<div class="flex items-center justify-between w-full">
					<div class="flex items-center gap-4">
						<Button onclick={() => goto('/dashboard')} variant="outline" size="icon">
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
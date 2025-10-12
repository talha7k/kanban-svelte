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
	import { Loader2, Sparkles, Edit, FileText, Columns, Plus } from '@lucide/svelte';
	import KanbanBoard from '$lib/components/kanban/KanbanBoard.svelte';
	import EditProjectDialog from '$lib/components/project/EditProjectDialog.svelte';
	import DeleteProjectAlertDialog from '$lib/components/dashboard/DeleteProjectAlertDialog.svelte';
	import GenerateTasksDialog from '$lib/components/project/GenerateTasksDialog.svelte';
	import AddTaskDialog from '$lib/components/kanban/AddTaskDialog.svelte';
	import { useProject } from '$queries/useProjectManagement';
	import { useQueryClient } from '@tanstack/svelte-query';
	import { createProjectPermissions } from '$lib/client/permissions';
	import { withLoading } from '$lib/utils/loading';
	import { pageHeader } from '$lib/stores/pageHeader';

	// Server-loaded data
	interface PageData {
		project: Project;
		team?: any;
	}
	
	let { data }: { data: PageData } = $props();

	// Get projectId from page params
	const queryClient = useQueryClient();

	// Use TanStack Query for project data
	const projectQuery = useProject($page.params.projectId);
	
	// Use query data for project
	let project: Project | null = $derived($projectQuery.data || null);

  // Permission checks
  const permissions = $derived(project ? createProjectPermissions(project, data.team) : null);
  const canEditProject = $derived($permissions?.canEditProject() ?? false);
  const canManageTasks = $derived($permissions?.canManageTasks() ?? false);
  const canViewProject = $derived($permissions?.canViewProject() ?? false);
	let users: UserProfile[] = $state([]);
	let projectCreator: UserProfile | null = $state(null);
	let isLoadingUsers = $state(false); // Load users in background without blocking UI
	let isEditProjectDialogOpen = $state(false);
	let isSubmittingProjectEdit = $state(false);
	let isGenerateTasksDialogOpen = $state(false);
	let isAddTaskDialogOpen = $state(false);
	let selectedColumnId: string | null = $state(null);
	let isAddingTask = $state(false);
	let projectToDelete: Project | null = $state(null);
	let isDeletingProject = $state(false);
	let isGeneratingTasks = $state(false);
	let isAddingTasks = $state(false);

	// Fetch users in background when project loads
	async function fetchUsers() {
		if (!$page.params.projectId || $authLoading || !$currentUser) return;

		try {
			const fetchedUsers = await getProjectRelevantUsers($page.params.projectId);
			users = fetchedUsers;

			if (project?.ownerId) {
				const creatorProfile = await getUserProfile(project.ownerId);
				projectCreator = creatorProfile;
			}
		} catch (err) {
			console.error('Error fetching users:', err);
			// Don't show error toast for background loading - users will just not appear
		}
	}

	function openDeleteProjectDialog(project: Project) {
		projectToDelete = project;
	}

	async function handleDeleteProject() {
		if (!projectToDelete || $authLoading || !$currentUser || $currentUser.uid !== projectToDelete.ownerId) {
			toast.error('Permission Denied', {
				description: 'Only the project owner can delete a project.'
			});
			return;
		}

		isDeletingProject = true;
		try {
			await withLoading(async () => {
				await deleteProject(projectToDelete!.id);
			});
			toast.success('Project Deleted', {
				description: `"${projectToDelete!.name}" has been successfully deleted.`
			});
			goto('/teams/' + projectToDelete!.teamId);
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
		if (!project || $authLoading || !$currentUser || $currentUser.uid !== project.ownerId) {
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
		if (!project || !$currentUser) {
			toast.error('Error', {
				description: 'Project or user information not available'
			});
			return [];
		}
		isGeneratingTasks = true;
		try {
			const tasks = await withLoading(async () => {
				// Get Firebase ID token for authentication
				const idToken = await $currentUser.getIdToken();

				const response = await fetch('/api/generate-tasks', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${idToken}`
					},
					body: JSON.stringify({
						projectId: project!.id,
						brief,
						currentUserUid: $currentUser.uid,
						taskCount
					})
				});

				if (!response.ok) {
					const error = await response.json();
					throw new Error(error.error || 'Failed to generate tasks');
				}

				const data = await response.json();
				return data.tasks;
			});

			return tasks;
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
		if (!project || $authLoading || !$currentUser) return;
		isAddingTasks = true;
		try {
			await withLoading(async () => {
				// Add projectId to each task
				const tasksWithProjectId = tasks.map((task) => ({
					...task,
					projectId: project!.id
				}));

				// Get Firebase ID token for authentication
				const idToken = await $currentUser.getIdToken();

				const response = await fetch('/api/add-approved-tasks', {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${idToken}`
					},
					body: JSON.stringify({
						projectId: project!.id,
						tasks: tasksWithProjectId,
						currentUserUid: $currentUser.uid
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
			});
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

	// Fetch users when project data is available and auth is loaded
	$effect(() => {
		if (project && !$authLoading && $currentUser) {
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

 	// Handle add task
 	function handleAddTask() {
 		selectedColumnId = project?.columns[0]?.id || null;
 		isAddTaskDialogOpen = true;
 	}

 	// Handle add task submit
 	async function handleAddTaskSubmit(taskData: any, columnId: string, cardTypeId?: string) {
 		if (!project || $authLoading || !$currentUser) return;
 		isAddingTask = true;
 		try {
 			await withLoading(async () => {
 				// Get Firebase ID token for authentication
 				const idToken = await $currentUser.getIdToken();

 				const response = await fetch('/api/add-task', {
 					method: 'POST',
 					headers: {
 						'Content-Type': 'application/json',
 						'Authorization': `Bearer ${idToken}`
 					},
 					body: JSON.stringify({
 						projectId: project!.id,
 						taskData: {
 							...taskData,
 							reporterId: $currentUser.uid,
 							...(cardTypeId && { cardTypeId })
 						},
 						columnId
 					})
 				});

 				if (!response.ok) {
 					throw new Error('Failed to add task');
 				}

 				const result = await response.json();
 				const newTask = result.task;

 				// Invalidate the project query to refresh the KanbanBoard
 				if (project) {
 					await queryClient.invalidateQueries({ queryKey: ['project', project.id] });
 				}

 				toast.success('Task added successfully');
 				isAddTaskDialogOpen = false;
 			});
 		} catch (error) {
 			console.error('Error adding task:', error);
 			toast.error('Failed to add task');
 			throw error;
 		} finally {
 			isAddingTask = false;
 		}
 	}

  // Access control check - only check access after auth is loaded
  let hasAccess = $derived(
    !$authLoading && project && $currentUser && (
      project.memberIds?.includes($currentUser.uid) ||
      project.ownerId === $currentUser.uid
    )
  );

  let isLoading = $derived(false); // No additional loading states - everything loads in background
  let error = $derived(
    (!data.project && $projectQuery.error?.message) ||
      (!$authLoading && !hasAccess && project ? 'You do not have access to this project.' : null)
  );

  // Set page header data
  $effect(() => {
    if (project && !$authLoading && $currentUser && hasAccess) {
      const actions = [];

      if (canEditProject) {
        actions.push({
          label: 'Edit Project',
          icon: Edit,
          variant: 'secondary' as const,
          onClick: () => isEditProjectDialogOpen = true,
          disabled: isSubmittingProjectEdit
        });
      }

      if (canViewProject) {
        actions.push({
          label: 'Card Types',
          icon: FileText,
          variant: 'outline' as const,
          onClick: () => goto(`/projects/${project!.id}/card-types`),
          disabled: isSubmittingProjectEdit
        });

        actions.push({
          label: 'Manage Columns',
          icon: Columns,
          variant: 'outline' as const,
          onClick: () => goto(`/projects/${project!.id}/columns`),
          disabled: isSubmittingProjectEdit
        });
      }

      if (canManageTasks) {
        actions.push({
          label: 'Add Task',
          icon: Plus,
          variant: 'default' as const,
          onClick: handleAddTask,
          disabled: false
        });

        actions.push({
          label: 'AI Tasks',
          icon: Sparkles,
          variant: 'outline' as const,
          onClick: () => isGenerateTasksDialogOpen = true,
          disabled: isSubmittingProjectEdit
        });
      }

      pageHeader.set({
        title: project.name,
        description: project.description,
        creator: projectCreator,
        backUrl: `/teams/${project.teamId}`,
        actions
      });
    } else {
      pageHeader.set(null);
    }
  });
</script>

<!-- Authentication and loading guard -->
{#if $authLoading || !$currentUser}
	<div class="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
		<Loader2 class="h-12 w-12 animate-spin mb-4 text-primary" />
		<p class="text-lg">Loading...</p>
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
 		<div class="flex-1 min-h-0">
 			<!-- Allows KanbanBoard to take remaining height -->
 			<KanbanBoard {project} {users} team={data.team} />
 		</div>
		{#if canEditProject && project}
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
			<AddTaskDialog
				isOpen={isAddTaskDialogOpen}
				onOpenChange={(open) => isAddTaskDialogOpen = open}
				onAddTask={handleAddTaskSubmit}
				columnId={selectedColumnId}
				assignableUsers={users}
				isSubmitting={isAddingTask}
				cardTypes={project.cardTypes || []}
			/>
		{/if}
	</div>
{/if}
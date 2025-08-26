<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { currentUser, userProfile, authLoading, selectedTeamId } from '$lib/stores/auth';
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
	import type { NewProjectData, Project, UserProfile, Team, TeamId } from '$lib/types/types';
	import {
		PlusCircle,
		FolderKanban,
		Loader2,
		Briefcase,
		Settings2,
		Eye,
		Crown,
		Pencil,
		Trash2,
		Users,
	} from '@lucide/svelte';
	import { Avatar, AvatarFallback, AvatarImage } from '$lib/components/ui/avatar';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Skeleton } from '$lib/components/ui/skeleton';
	import { Badge } from '$lib/components/ui/badge';
	import { useTeamManagement } from '$queries/useTeamManagement';
	import { useProjectManagement, useTeamProjects } from '$queries/useProjectManagement';
	import ProjectCard from '$lib/components/dashboard/ProjectCard.svelte';
	import ManageMembersDialog from '$lib/components/dashboard/ManageMembersDialog.svelte';
	import {
		Dialog,
		DialogContent,
		DialogHeader,
		DialogTitle,
		DialogFooter,
	} from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import LazyTeamUsersCard from '$lib/components/teams/LazyTeamUsersCard.svelte';

	// State variables
	let isCreateProjectDialogOpen = $state(false);
	let isEditProjectDialogOpen = $state(false);
	let isDeleteProjectDialogOpen = $state(false);
	let isManageMembersDialogOpen = $state(false);
	let isViewMembersDialogOpen = $state(false);
	let selectedProject: Project | null = $state(null);
	let newProjectName = $state('');
	let newProjectDescription = $state('');

	// Team management queries
	const {
		teamData,
		teamMembersData
	} = useTeamManagement($selectedTeamId || undefined);

	// Project management queries
	const {
		createProjectMutation,
		updateProjectMutation,
		deleteProjectMutation,
		handleCreateProject,
		handleUpdateProject,
		handleDeleteProject
	} = useProjectManagement();

	// Get query client for manual refetching
	import { useQueryClient } from '@tanstack/svelte-query';
	const queryClient = useQueryClient();

	// Get team projects using the dedicated hook
  const teamProjectsQuery = useTeamProjects($selectedTeamId || undefined);
  const teamProjects = $derived($teamProjectsQuery?.data || []);



	async function createProject() {
		if (!newProjectName.trim() || !$selectedTeamId) return;

		const projectData: NewProjectData = {
			name: newProjectName.trim(),
			description: newProjectDescription.trim()
		};

		await handleCreateProject(projectData, $selectedTeamId);

		// Reset form
		newProjectName = '';
		newProjectDescription = '';
		isCreateProjectDialogOpen = false;
	}

	async function updateProject() {
		if (!selectedProject || !newProjectName.trim()) return;

		const updateData = {
			name: newProjectName.trim(),
			description: newProjectDescription.trim()
		};

		await handleUpdateProject(selectedProject.id, updateData);

		// Reset form
		newProjectName = '';
		newProjectDescription = '';
		selectedProject = null;
		isEditProjectDialogOpen = false;
	}

	async function deleteProject() {
		if (!selectedProject) return;

		await handleDeleteProject(selectedProject.id);

		selectedProject = null;
		isDeleteProjectDialogOpen = false;
	}

	function openEditDialog(project: Project) {
		selectedProject = project;
		newProjectName = project.name;
		newProjectDescription = project.description || '';
		isEditProjectDialogOpen = true;
	}

	function openDeleteDialog(project: Project) {
		selectedProject = project;
		isDeleteProjectDialogOpen = true;
	}

	let isOpeningDialog = false;

	function openManageMembersDialog(project: any) {
		if (isOpeningDialog) return;
		isOpeningDialog = true;
		selectedProject = project;
		isManageMembersDialogOpen = true;
		setTimeout(() => isOpeningDialog = false, 100);
	}

	function openViewMembersDialog(project: any) {
		if (isOpeningDialog) return;
		isOpeningDialog = true;
		selectedProject = project;
		isViewMembersDialogOpen = true;
		setTimeout(() => isOpeningDialog = false, 100);
	}

	function viewProject(projectId: string) {
		goto(`/projects/${projectId}`);
	}

	onMount(() => {
		if (!$currentUser) {
			goto('/login');
			return;
		}

		if (!$selectedTeamId) {
			goto('/teams');
		}
	});
</script>

<div class="container mx-auto px-4 py-8">
	{#if $authLoading || $teamProjectsQuery?.isLoading}
		<div class="space-y-6">
			<div class="flex justify-between items-center">
				<div class="space-y-2">
					<Skeleton class="h-8 w-48" />
					<Skeleton class="h-4 w-64" />
				</div>
				<Skeleton class="h-10 w-32" />
			</div>
			<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
				{#each Array(6) as _}
					<Skeleton class="h-48" />
				{/each}
			</div>
		</div>
	{:else if !$selectedTeamId}
		<div class="text-center py-12">
			<Users class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
			<h3 class="text-lg font-semibold mb-2">No team selected</h3>
			<p class="text-muted-foreground mb-4">
				Please select a team to view projects
			</p>
			<Button onclick={() => goto('/teams')}>
				Select Team
			</Button>
		</div>
	{:else}
		<div class="space-y-6">
			<!-- Header -->
			<div class="flex justify-between items-center">
				<div>
					<h1 class="text-3xl font-bold tracking-tight">
						{$teamData?.data?.name || 'Team Dashboard'}
					</h1>
					<p class="text-muted-foreground mt-2">
						{$teamData?.data?.description || 'Manage your team projects'}
					</p>
				</div>
				<Button onclick={() => isCreateProjectDialogOpen = true}>
					<PlusCircle class="mr-2 h-4 w-4" />
					New Project
				</Button>
			</div>

			<!-- Main Content Layout -->
			<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
				<!-- Projects Section -->
				<div class="lg:col-span-3">
					<h2 class="text-xl font-semibold mb-4">Projects</h2>
				{#if !teamProjects || teamProjects.length === 0}
						<div class="text-center py-12">
							<FolderKanban class="mx-auto h-12 w-12 text-muted-foreground mb-4" />
							<h3 class="text-lg font-semibold mb-2">No projects yet</h3>
							<p class="text-muted-foreground mb-4">
								Create your first project to get started
							</p>
							<Button onclick={() => isCreateProjectDialogOpen = true}>
								<PlusCircle class="mr-2 h-4 w-4" />
								Create Project
							</Button>
						</div>
					{:else}
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{#each teamProjects as project (project.id)}
							<ProjectCard
								{project}
								currentUserUid={$currentUser?.uid}
								allUsers={$teamMembersData?.data || []}
								openEditProjectDialog={openEditDialog}
								openDeleteProjectDialog={openDeleteDialog}
								openManageMembersDialog={openManageMembersDialog}
								openViewMembersDialog={openViewMembersDialog}
							/>
						{/each}
					</div>
					{/if}
				</div>

				<!-- Team Members Section -->
				<div class="lg:col-span-1">
					<LazyTeamUsersCard
						selectedTeamId={$selectedTeamId}
						selectedProject={selectedProject}
						onClearSelectedProject={() => selectedProject = null}
					/>
				</div>
			</div>
		</div>
	{/if}

	<!-- Create Project Dialog -->
	<Dialog bind:open={isCreateProjectDialogOpen}>
		<DialogContent class="sm:max-w-[425px]">
			<DialogHeader>
				<DialogTitle>Create New Project</DialogTitle>
			</DialogHeader>
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<Label for="project-name">Project Name</Label>
					<Input
						id="project-name"
						bind:value={newProjectName}
						placeholder="Enter project name"
					/>
				</div>
				<div class="grid gap-2">
					<Label for="project-description">Description (Optional)</Label>
					<Textarea
						id="project-description"
						bind:value={newProjectDescription}
						placeholder="Enter project description"
					/>
				</div>
			</div>
			<DialogFooter>
				<Button
					variant="outline"
					onclick={() => isCreateProjectDialogOpen = false}
				>
					Cancel
				</Button>
				<Button onclick={createProject} disabled={$createProjectMutation?.isPending}>
					{#if $createProjectMutation?.isPending}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Create Project
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>

	<!-- Edit Project Dialog -->
	<Dialog bind:open={isEditProjectDialogOpen}>
		<DialogContent class="sm:max-w-[425px]">
			<DialogHeader>
				<DialogTitle>Edit Project</DialogTitle>
			</DialogHeader>
			<div class="grid gap-4 py-4">
				<div class="grid gap-2">
					<Label for="edit-project-name">Project Name</Label>
					<Input
						id="edit-project-name"
						bind:value={newProjectName}
						placeholder="Enter project name"
					/>
				</div>
				<div class="grid gap-2">
					<Label for="edit-project-description">Description (Optional)</Label>
					<Textarea
						id="edit-project-description"
						bind:value={newProjectDescription}
						placeholder="Enter project description"
					/>
				</div>
			</div>
			<DialogFooter>
				<Button
					variant="outline"
					onclick={() => isEditProjectDialogOpen = false}
				>
					Cancel
				</Button>
				<Button onclick={updateProject} disabled={$updateProjectMutation?.isPending}>
					{#if $updateProjectMutation?.isPending}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Update Project
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>

	<!-- Manage Members Dialog -->
	{#if selectedProject}
		<ManageMembersDialog
			project={teamProjects.find(p => p.id === selectedProject?.id) || selectedProject}
			allUsers={$teamMembersData?.data || []}
			bind:isOpen={isManageMembersDialogOpen}
			onOpenChange={(isOpen) => {
				if (!isOpen) selectedProject = null;
			}}
			onMembersUpdate={async () => {
				await queryClient.invalidateQueries({ queryKey: ['teamProjects', selectedProject?.teamId] });
				// Update selectedProject with the latest data
				const updatedProject = teamProjects.find(p => p.id === selectedProject?.id);
				if (updatedProject) {
					selectedProject = updatedProject;
				}
			}}
		/>
	{/if}

	<!-- View Members Dialog -->
	{#if selectedProject}
		<ManageMembersDialog
			project={teamProjects.find(p => p.id === selectedProject?.id) || selectedProject}
			allUsers={$teamMembersData?.data || []}
			bind:isOpen={isViewMembersDialogOpen}
			readonly={true}
			onOpenChange={(isOpen) => {
				if (!isOpen) selectedProject = null;
			}}
			onMembersUpdate={async () => {}}
		/>
	{/if}

	<!-- Delete Project Dialog -->
	<Dialog bind:open={isDeleteProjectDialogOpen}>
		<DialogContent class="sm:max-w-[425px]">
			<DialogHeader>
				<DialogTitle>Delete Project</DialogTitle>
			</DialogHeader>
			<div class="py-4">
				<p class="text-sm text-muted-foreground">
					Are you sure you want to delete "{selectedProject?.name}"? This action cannot be undone.
				</p>
			</div>
			<DialogFooter>
				<Button
					variant="outline"
					onclick={() => isDeleteProjectDialogOpen = false}
				>
					Cancel
				</Button>
				<Button
					variant="destructive"
					onclick={deleteProject}
					disabled={$deleteProjectMutation?.isPending}
				>
					{#if $deleteProjectMutation?.isPending}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Delete Project
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
</div>
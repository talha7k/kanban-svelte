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
	import {
		getProjectsForTeam,
		deleteProject as deleteProjectFromDb,
		updateProjectDetails,
		createProject as createProjectInDb
	} from '$lib/api/firebaseProject';
	import { useTeamManagement } from '../../../queries/useTeamManagement';
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
	let projects: Project[] = $state([]);
	let team: Team | null = $state(null);
	let teamMembers: UserProfile[] = $state([]);
	let isLoading = $state(true);
	let isCreateProjectDialogOpen = $state(false);
	let isEditProjectDialogOpen = $state(false);
	let isDeleteProjectDialogOpen = $state(false);
	let selectedProject: Project | null = $state(null);
	let newProjectName = $state('');
	let newProjectDescription = $state('');
	let isCreatingProject = $state(false);
	let isUpdatingProject = $state(false);
	let isDeletingProject = $state(false);

	// Team management queries
	const {
		teamData,
		teamMembersData
	} = useTeamManagement($selectedTeamId || undefined);

	async function fetchTeamData() {
		if (!$selectedTeamId || !$currentUser) {
			isLoading = false;
			return;
		}

		isLoading = true;

		try {
			// Fetch projects for the team (still using direct API for now)
			const teamProjects = await getProjectsForTeam($selectedTeamId);
			projects = teamProjects;
		} catch (error) {
			console.error('Error fetching team data:', error);
			toast.error('Failed to load team data');
		} finally {
			isLoading = false;
		}
	}

	async function handleCreateProject() {
		if (!newProjectName.trim() || !$selectedTeamId || !$currentUser) return;

		isCreatingProject = true;

		try {
			const projectData: NewProjectData = {
				name: newProjectName.trim(),
				description: newProjectDescription.trim()
			};

			const newProject = await createProjectInDb(projectData, $currentUser.uid, $selectedTeamId);
			projects = [...projects, newProject];

			toast.success('Project created successfully!');

			// Reset form
			newProjectName = '';
			newProjectDescription = '';
			isCreateProjectDialogOpen = false;
		} catch (error) {
			console.error('Error creating project:', error);
			toast.error('Failed to create project');
		} finally {
			isCreatingProject = false;
		}
	}

	async function handleUpdateProject() {
		if (!selectedProject || !newProjectName.trim()) return;

		isUpdatingProject = true;

		try {
			const updatedProject = await updateProjectDetails(selectedProject!.id, {
				name: newProjectName.trim(),
				description: newProjectDescription.trim()
			});

			projects = projects.map(p => p.id === selectedProject!.id ? updatedProject : p);

			toast.success('Project updated successfully!');

			// Reset form
			newProjectName = '';
			newProjectDescription = '';
			selectedProject = null;
			isEditProjectDialogOpen = false;
		} catch (error) {
			console.error('Error updating project:', error);
			toast.error('Failed to update project');
		} finally {
			isUpdatingProject = false;
		}
	}

	async function handleDeleteProject() {
		if (!selectedProject) return;

		isDeletingProject = true;

		try {
			await deleteProjectFromDb(selectedProject!.id);
			projects = projects.filter(p => p.id !== selectedProject!.id);

			toast.success('Project deleted successfully!');

			selectedProject = null;
			isDeleteProjectDialogOpen = false;
		} catch (error) {
			console.error('Error deleting project:', error);
			toast.error('Failed to delete project');
		} finally {
			isDeletingProject = false;
		}
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

	function viewProject(projectId: string) {
		goto(`/projects/${projectId}`);
	}

	onMount(() => {
		if (!$currentUser) {
			goto('/login');
			return;
		}

		if ($selectedTeamId && $currentUser) {
			fetchTeamData();
		} else if (!$selectedTeamId) {
			goto('/teams');
		}
	});

	// Effect to fetch data when selectedTeamId changes
	$effect(() => {
		if ($selectedTeamId && $currentUser && !$authLoading) {
			fetchTeamData();
		}
	});
</script>

<div class="container mx-auto px-4 py-8">
	{#if $authLoading || isLoading}
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
					{#if projects.length === 0}
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
							{#each projects as project (project.id)}
								<Card class="hover:shadow-md transition-shadow">
									<CardHeader>
										<div class="flex justify-between items-start">
											<div class="flex-1">
												<CardTitle class="text-lg">{project.name}</CardTitle>
												{#if project.description}
													<CardDescription class="mt-1">
														{project.description}
													</CardDescription>
												{/if}
											</div>
											<div class="flex gap-1">
												<Button
													variant="ghost"
													size="sm"
													onclick={() => openEditDialog(project)}
												>
													<Pencil class="h-4 w-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onclick={() => openDeleteDialog(project)}
												>
													<Trash2 class="h-4 w-4" />
												</Button>
											</div>
										</div>
									</CardHeader>
									<CardContent>
										<div class="flex items-center text-sm text-muted-foreground mb-4">
											<Users class="h-4 w-4 mr-1" />
											{project.memberIds?.length || 0} members
										</div>
									</CardContent>
									<CardFooter>
										<Button
											class="w-full"
											onclick={() => viewProject(project.id)}
										>
											<Eye class="mr-2 h-4 w-4" />
											View Project
										</Button>
									</CardFooter>
								</Card>
							{/each}
						</div>
					{/if}
				</div>

				<!-- Team Members Section -->
				<div class="lg:col-span-1">
					<LazyTeamUsersCard
						selectedTeamId={$selectedTeamId}
						selectedProject={null}
						onClearSelectedProject={() => {}}
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
				<Button onclick={handleCreateProject} disabled={isCreatingProject}>
					{#if isCreatingProject}
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
				<Button onclick={handleUpdateProject} disabled={isUpdatingProject}>
					{#if isUpdatingProject}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Update Project
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>

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
					onclick={handleDeleteProject}
					disabled={isDeletingProject}
				>
					{#if isDeletingProject}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{/if}
					Delete Project
				</Button>
			</DialogFooter>
		</DialogContent>
	</Dialog>
</div>
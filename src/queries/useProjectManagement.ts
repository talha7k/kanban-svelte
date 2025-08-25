import { writable, get } from 'svelte/store';
import { createQuery, createMutation, useQueryClient } from '@tanstack/svelte-query';
import type { 
  Project, 
  NewProjectData, 
  UserId, 
  UserProjectRole, 
  TeamId,
  UserProfile 
} from '$lib/types/types';
import {
  createProject,
  getProjectById,
  updateProjectDetails,
  deleteProject,
  getProjectsForTeam,
  addUserToProject,
  removeUserFromProject,
  updateProjectUserRole
} from '$lib/api/firebaseProject';
import { getProjectRelevantUsers } from '$lib/api/firebaseUser';
import { toast } from 'svelte-sonner';

export function useProjectManagement(currentUserId?: string) {
  const queryClient = useQueryClient();
  
  // State for UI management
  const projectToEdit = writable<Project | null>(null);
  const projectToView = writable<Project | null>(null);
  const showDeleteConfirm = writable(false);
  const projectToDeleteId = writable<string | null>(null);
  const showUserManagement = writable(false);
  const selectedProjectForUserManagement = writable<Project | null>(null);

  // Project CRUD Mutations
  const createProjectMutation = createMutation<Project, Error, { projectData: NewProjectData; ownerId: string; teamId?: TeamId }>({
    mutationFn: ({ projectData, ownerId, teamId }) => 
      createProject(projectData, ownerId, teamId),
    onSuccess: (newProject) => {
      toast.success(`Project "${newProject.name}" has been created.`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      if (newProject.teamId) {
        queryClient.invalidateQueries({ queryKey: ['teamProjects', newProject.teamId] });
      }
    },
    onError: (error) => {
      console.error('Error creating project:', error);
      toast.error(error.message || 'Could not create project.');
    }
  });

  const updateProjectMutation = createMutation<Project, Error, { projectId: string; projectData: { name?: string; description?: string; teamId?: TeamId | null } }>({
    mutationFn: ({ projectId, projectData }) => 
      updateProjectDetails(projectId, projectData),
    onSuccess: (updatedProject) => {
      projectToEdit.set(null);
      toast.success(`Project "${updatedProject.name}" has been updated.`);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', updatedProject.id] });
      if (updatedProject.teamId) {
        queryClient.invalidateQueries({ queryKey: ['teamProjects', updatedProject.teamId] });
      }
    },
    onError: (error) => {
      console.error('Error updating project:', error);
      toast.error(error.message || 'Could not update project.');
    }
  });

  const deleteProjectMutation = createMutation<void, Error, string>({
    mutationFn: (projectId) => deleteProject(projectId),
    onSuccess: (_, projectId) => {
      const project = get(projectToView);
      if (project) {
        toast.success(`Project "${project.name}" has been deleted.`);
      }
      projectToView.set(null);
      showDeleteConfirm.set(false);
      projectToDeleteId.set(null);
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.removeQueries({ queryKey: ['project', projectId] });
    },
    onError: (error) => {
      console.error('Error deleting project:', error);
      toast.error(error.message || 'Could not delete project.');
    }
  });

  // User Management Mutations
  const addUserToProjectMutation = createMutation<void, Error, { projectId: string; userId: string }>({
    mutationFn: ({ projectId, userId }) => 
      addUserToProject(projectId, userId),
    onSuccess: (_, { projectId, userId }) => {
      toast.success('User has been added to the project.');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projectUsers', projectId] });
    },
    onError: (error) => {
      console.error('Error adding user to project:', error);
      toast.error(error.message || 'Could not add user to project.');
    }
  });

  const removeUserFromProjectMutation = createMutation<void, Error, { projectId: string; userId: string }>({
    mutationFn: ({ projectId, userId }) => 
      removeUserFromProject(projectId, userId),
    onSuccess: (_, { projectId, userId }) => {
      toast.success('User has been removed from the project.');
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projectUsers', projectId] });
    },
    onError: (error) => {
      console.error('Error removing user from project:', error);
      toast.error(error.message || 'Could not remove user from project.');
    }
  });

  const updateUserRoleMutation = createMutation<void, Error, { projectId: string; userId: string; newRole: UserProjectRole }>({
    mutationFn: ({ projectId, userId, newRole }) => 
      updateProjectUserRole(projectId, userId, newRole),
    onSuccess: (_, { projectId, userId, newRole }) => {
      toast.success(`User role has been updated to ${newRole}.`);
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      queryClient.invalidateQueries({ queryKey: ['projectUsers', projectId] });
    },
    onError: (error) => {
      console.error('Error updating user role:', error);
      toast.error(error.message || 'Could not update user role.');
    }
  });

  // Handler Functions
  const handleCreateProject = async (projectData: NewProjectData, ownerId: string, teamId?: TeamId) => {
    get(createProjectMutation).mutate({ projectData, ownerId, teamId });
  };

  const handleUpdateProject = async (projectId: string, projectData: { name?: string; description?: string; teamId?: TeamId | null }) => {
    get(updateProjectMutation).mutate({ projectId, projectData });
  };

  const handleDeleteProject = async (projectId: string) => {
    get(deleteProjectMutation).mutate(projectId);
  };

  const handleAddUserToProject = async (projectId: string, userId: string) => {
    get(addUserToProjectMutation).mutate({ projectId, userId });
  };

  const handleRemoveUserFromProject = async (projectId: string, userId: string) => {
    get(removeUserFromProjectMutation).mutate({ projectId, userId });
  };

  const handleUpdateUserRole = async (projectId: string, userId: string, newRole: UserProjectRole) => {
    get(updateUserRoleMutation).mutate({ projectId, userId, newRole });
  };

  return {
    // State
    projectToEdit,
    setProjectToEdit: projectToEdit.set,
    projectToView,
    setProjectToView: projectToView.set,
    showDeleteConfirm,
    setShowDeleteConfirm: showDeleteConfirm.set,
    projectToDeleteId,
    setProjectToDeleteId: projectToDeleteId.set,
    showUserManagement,
    setShowUserManagement: showUserManagement.set,
    selectedProjectForUserManagement,
    setSelectedProjectForUserManagement: selectedProjectForUserManagement.set,
    
    // Mutations
    createProjectMutation,
    updateProjectMutation,
    deleteProjectMutation,
    addUserToProjectMutation,
    removeUserFromProjectMutation,
    updateUserRoleMutation,
    
    // Handlers
    handleCreateProject,
    handleUpdateProject,
    handleDeleteProject,
    handleAddUserToProject,
    handleRemoveUserFromProject,
    handleUpdateUserRole
  };
}

// Query hooks for fetching project data
export function useProject(projectId: string | undefined) {
  return createQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectId ? getProjectById(projectId) : Promise.resolve(null),
    enabled: !!projectId
  });
}

// Note: getUserProjects function doesn't exist in the API
// This would need to be implemented in firebaseProject.ts if needed
// export function useUserProjects(userId: string | undefined) {
//   return createQuery({
//     queryKey: ['userProjects', userId],
//     queryFn: () => userId ? getUserProjects(userId) : Promise.resolve([]),
//     enabled: !!userId
//   });
// }

export function useTeamProjects(teamId: string | undefined) {
  return createQuery({
    queryKey: ['teamProjects', teamId],
    queryFn: () => teamId ? getProjectsForTeam(teamId) : Promise.resolve([]),
    enabled: !!teamId
  });
}

export function useProjectUsers(projectId: string | undefined) {
  return createQuery({
    queryKey: ['projectUsers', projectId],
    queryFn: () => projectId ? getProjectRelevantUsers(projectId) : Promise.resolve([]),
    enabled: !!projectId
  });
}
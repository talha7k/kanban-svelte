import { createMutation, createQuery, useQueryClient } from '@tanstack/svelte-query';
import { toast } from 'svelte-sonner';
import { get } from 'svelte/store';
import { currentUser } from '$lib/stores/auth';
import { getTeamsForUser, createTeam, updateTeam, deleteTeam, addMemberToTeam, removeMemberFromTeam, getTeam, getTeamMembers } from '$lib/api/firebaseTeam';
import type { Team, UserId, UserProfile } from '$lib/types/types';

// Query keys
export const teamKeys = {
  all: ['teams'] as const,
  lists: () => [...teamKeys.all, 'list'] as const,
  list: (userId: string) => [...teamKeys.lists(), userId] as const,
  details: () => [...teamKeys.all, 'detail'] as const,
  detail: (teamId: string) => [...teamKeys.details(), teamId] as const,
};

// Get teams for current user
export function useTeams() {
  return createQuery({
    queryKey: teamKeys.list(get(currentUser)?.uid || ''),
    queryFn: async () => {
      const user = get(currentUser);
      if (!user?.uid) throw new Error('User not authenticated');
      return await getTeamsForUser(user.uid as UserId);
    },
    enabled: !!get(currentUser)?.uid,
  });
}

// Create team mutation
export function useCreateTeam() {
  const queryClient = useQueryClient();
  
  return createMutation({
    mutationFn: async ({ name, description }: { name: string; description?: string }) => {
      const user = get(currentUser);
      if (!user?.uid) throw new Error('User not authenticated');
      return await createTeam(name, user.uid as UserId, description || '');
    },
    onSuccess: (newTeam) => {
      // Update the teams list
      const user = get(currentUser);
      queryClient.setQueryData(teamKeys.list(user?.uid || ''), (old: Team[] = []) => {
        return [...old, newTeam];
      });
      
      toast.success('Team Created!', {
        description: `${newTeam.name} has been created successfully.`
      });
    },
    onError: (error) => {
      console.error('Error creating team:', error);
      toast.error('Creation Failed', {
        description: 'Could not create team. Please try again.'
      });
    }
  });
}

// Update team mutation
export function useUpdateTeam() {
  const queryClient = useQueryClient();
  
  return createMutation({
    mutationFn: async ({ teamId, updates }: { teamId: string; updates: Partial<Team> }) => {
      await updateTeam(teamId, updates);
      return { teamId, updates };
    },
    onSuccess: ({ teamId, updates }) => {
      // Invalidate and refetch the specific team
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(teamId) });
      
      // Invalidate teams list
      const user = get(currentUser);
      queryClient.invalidateQueries({ queryKey: teamKeys.list(user?.uid || '') });
      
      toast.success('Team Updated!', {
        description: 'Team has been updated successfully.'
      });
    },
    onError: (error) => {
      console.error('Error updating team:', error);
      toast.error('Update Failed', {
        description: 'Could not update team. Please try again.'
      });
    }
  });
}

// Delete team mutation
export function useDeleteTeam() {
  const queryClient = useQueryClient();
  
  return createMutation({
    mutationFn: async (teamId: string) => {
      await deleteTeam(teamId);
      return teamId;
    },
    onSuccess: (teamId) => {
      // Invalidate teams list
      const user = get(currentUser);
      queryClient.invalidateQueries({ queryKey: teamKeys.list(user?.uid || '') });
      
      // Invalidate team detail
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(teamId) });
      
      toast.success('Team Deleted!', {
        description: 'Team has been deleted successfully.'
      });
    },
    onError: (error) => {
      console.error('Error deleting team:', error);
      toast.error('Deletion Failed', {
        description: 'Could not delete team. Please try again.'
      });
    }
  });
}

// Add team member mutation
export function useAddTeamMember() {
  const queryClient = useQueryClient();
  
  return createMutation({
    mutationFn: async ({ teamId, memberId }: { teamId: string; memberId: string }) => {
      await addMemberToTeam(teamId, memberId);
      return { teamId, memberId };
    },
    onSuccess: ({ teamId }) => {
      // Invalidate team and members data
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(teamId) });
      queryClient.invalidateQueries({ queryKey: [...teamKeys.detail(teamId), 'members'] });
      
      toast.success('Member Added!', {
        description: 'Member has been added to the team successfully.'
      });
    },
    onError: (error) => {
      console.error('Error adding team member:', error);
      toast.error('Add Failed', {
        description: 'Could not add member to team. Please try again.'
      });
    }
  });
}

// Remove team member mutation
export function useRemoveTeamMember() {
  const queryClient = useQueryClient();
  
  return createMutation({
    mutationFn: async ({ teamId, memberId }: { teamId: string; memberId: string }) => {
      await removeMemberFromTeam(teamId, memberId);
      return { teamId, memberId };
    },
    onSuccess: ({ teamId }) => {
      // Invalidate team and members data
      queryClient.invalidateQueries({ queryKey: teamKeys.detail(teamId) });
      queryClient.invalidateQueries({ queryKey: [...teamKeys.detail(teamId), 'members'] });
      
      toast.success('Member Removed!', {
        description: 'Member has been removed from the team successfully.'
      });
    },
    onError: (error) => {
      console.error('Error removing team member:', error);
      toast.error('Remove Failed', {
        description: 'Could not remove member from team. Please try again.'
      });
    }
  });
}

// Get single team details
export function useTeam(teamId: string) {
  return createQuery({
    queryKey: teamKeys.detail(teamId),
    queryFn: async () => {
      if (!teamId) throw new Error('Team ID is required');
      return await getTeam(teamId);
    },
    enabled: !!teamId,
  });
}

// Get team members
export function useTeamMembers(teamId: string) {
  return createQuery({
    queryKey: [...teamKeys.detail(teamId), 'members'],
    queryFn: async () => {
      if (!teamId) throw new Error('Team ID is required');
      return await getTeamMembers(teamId);
    },
    enabled: !!teamId,
  });
}

// Main hook for team management
export function useTeamManagement(teamId?: string) {
  const queryClient = useQueryClient();
  
  // Queries
  const teamsQuery = useTeams();
  const teamQuery = useTeam(teamId || '');
  const teamMembersQuery = useTeamMembers(teamId || '');
  
  // Mutations
  const createTeamMutation = useCreateTeam();
  const updateTeamMutation = useUpdateTeam();
  const deleteTeamMutation = useDeleteTeam();
  const addTeamMemberMutation = useAddTeamMember();
  const removeTeamMemberMutation = useRemoveTeamMember();
  
  return {
    // Teams list - return the store objects directly
    teamsData: teamsQuery,
    
    // Single team - return the store objects directly
    teamData: teamQuery,
    
    // Team members - return the store objects directly
    teamMembersData: teamMembersQuery,
    
    // Mutations
    createTeamMutation,
    updateTeamMutation,
    deleteTeamMutation,
    addTeamMemberMutation,
    removeTeamMemberMutation,
  };
}
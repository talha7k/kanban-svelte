import { derived, type Readable } from 'svelte/store';
import { currentUser, selectedTeamId } from '$lib/stores/auth';
import type { 
  Project, 
  Team, 
  UserProfile, 
  TeamPermissions, 
  ProjectPermissions,
  UserTeamRole,
  UserProjectRole
} from '$lib/types/types';
import {
  getTeamPermissions,
  getProjectPermissions,
  getUserTeamRole,
  getUserProjectRole,
  canAccessProject,
  canAccessTeam
} from '$lib/auth/permissions';

/**
 * Client-side permission checker for UI components
 * Provides reactive stores for permission-based UI controls
 */
export class ClientPermissionChecker {
  private userId: string | undefined;
  private team: Team | undefined;
  private project: Project | undefined;

  constructor(userId?: string, team?: Team, project?: Project) {
    this.userId = userId;
    this.team = team;
    this.project = project;
  }

  /**
   * Check if user can create projects in the current team
   */
  canCreateProject(): boolean {
    if (!this.userId || !this.team) return false;
    
    const userRole = getUserTeamRole(this.userId, this.team);
    if (!userRole) return false;
    
    const permissions = getTeamPermissions(userRole);
    return permissions.canCreateProject;
  }

  /**
   * Check if user can edit the current project
   */
  canEditProject(): boolean {
    if (!this.userId || !this.project) return false;
    
    const userTeamRole = this.team ? getUserTeamRole(this.userId, this.team) : undefined;
    const userProjectRole = getUserProjectRole(this.userId, this.project);
    const isProjectOwner = this.project.ownerId === this.userId;
    
    const permissions = getProjectPermissions(userProjectRole, userTeamRole, isProjectOwner);
    return permissions.canEditProject;
  }

  /**
   * Check if user can delete the current project
   */
  canDeleteProject(): boolean {
    if (!this.userId || !this.project) return false;
    
    const userTeamRole = this.team ? getUserTeamRole(this.userId, this.team) : undefined;
    const userProjectRole = getUserProjectRole(this.userId, this.project);
    const isProjectOwner = this.project.ownerId === this.userId;
    
    const permissions = getProjectPermissions(userProjectRole, userTeamRole, isProjectOwner);
    return permissions.canDeleteProject;
  }

  /**
   * Check if user can manage project members
   */
  canManageProjectMembers(): boolean {
    if (!this.userId || !this.project) return false;
    
    const userTeamRole = this.team ? getUserTeamRole(this.userId, this.team) : undefined;
    const userProjectRole = getUserProjectRole(this.userId, this.project);
    const isProjectOwner = this.project.ownerId === this.userId;
    
    const permissions = getProjectPermissions(userProjectRole, userTeamRole, isProjectOwner);
    return permissions.canManageMembers;
  }

  /**
   * Check if user can manage tasks in the current project
   */
  canManageTasks(): boolean {
    if (!this.userId || !this.project) return false;
    
    const userTeamRole = this.team ? getUserTeamRole(this.userId, this.team) : undefined;
    const userProjectRole = getUserProjectRole(this.userId, this.project);
    const isProjectOwner = this.project.ownerId === this.userId;
    
    const permissions = getProjectPermissions(userProjectRole, userTeamRole, isProjectOwner);
    return permissions.canManageTasks;
  }

  /**
   * Check if user can create tasks in the current project
   */
  canCreateTasks(): boolean {
    if (!this.userId || !this.project) return false;
    
    const userTeamRole = this.team ? getUserTeamRole(this.userId, this.team) : undefined;
    const userProjectRole = getUserProjectRole(this.userId, this.project);
    const isProjectOwner = this.project.ownerId === this.userId;
    
    const permissions = getProjectPermissions(userProjectRole, userTeamRole, isProjectOwner);
    return permissions.canCreateTasks;
  }

  /**
   * Check if user can assign tasks in the current project
   */
  canAssignTasks(): boolean {
    if (!this.userId || !this.project) return false;
    
    const userTeamRole = this.team ? getUserTeamRole(this.userId, this.team) : undefined;
    const userProjectRole = getUserProjectRole(this.userId, this.project);
    const isProjectOwner = this.project.ownerId === this.userId;
    
    const permissions = getProjectPermissions(userProjectRole, userTeamRole, isProjectOwner);
    return permissions.canAssignTasks;
  }

  /**
   * Check if user can manage team settings
   */
  canManageTeam(): boolean {
    if (!this.userId || !this.team) return false;
    
    const userRole = getUserTeamRole(this.userId, this.team);
    if (!userRole) return false;
    
    const permissions = getTeamPermissions(userRole);
    return permissions.canManageTeam;
  }

  /**
   * Check if user can invite team members
   */
  canInviteMembers(): boolean {
    if (!this.userId || !this.team) return false;
    
    const userRole = getUserTeamRole(this.userId, this.team);
    if (!userRole) return false;
    
    const permissions = getTeamPermissions(userRole);
    return permissions.canInviteMembers;
  }

  /**
   * Get user's role in the current team
   */
  getUserTeamRole(): UserTeamRole | undefined {
    if (!this.userId || !this.team) return undefined;
    return getUserTeamRole(this.userId, this.team);
  }

  /**
   * Get user's role in the current project
   */
  getUserProjectRole(): UserProjectRole | undefined {
    if (!this.userId || !this.project) return undefined;
    return getUserProjectRole(this.userId, this.project);
  }

  /**
   * Check if user is project owner
   */
  isProjectOwner(): boolean {
    if (!this.userId || !this.project) return false;
    return this.project.ownerId === this.userId;
  }

  /**
   * Check if user is team owner
   */
  isTeamOwner(): boolean {
    if (!this.userId || !this.team) return false;
    return this.team.ownerId === this.userId;
  }
}

/**
 * Create a reactive permission checker store for a specific project
 * Note: team parameter should be passed from component that has team data
 */
export function createProjectPermissions(
  project: Project | undefined, 
  team: Team | undefined
): Readable<ClientPermissionChecker> {
  return derived(
    [currentUser],
    ([$currentUser]) => {
      return new ClientPermissionChecker(
        $currentUser?.uid,
        team,
        project
      );
    }
  );
}

/**
 * Create a reactive permission checker store for team-level permissions
 * Note: team parameter should be passed from component that has team data
 */
export function createTeamPermissions(team: Team | undefined): Readable<ClientPermissionChecker> {
  return derived(
    [currentUser],
    ([$currentUser]) => {
      return new ClientPermissionChecker(
        $currentUser?.uid,
        team
      );
    }
  );
}

/**
 * Utility function to create a permission checker for a specific context
 */
export function createPermissionChecker(
  userId?: string,
  team?: Team,
  project?: Project
): ClientPermissionChecker {
  return new ClientPermissionChecker(userId, team, project);
}

/**
 * Higher-order component helper for permission-based rendering
 */
export function withPermission<T>(
  checker: ClientPermissionChecker,
  permission: keyof ClientPermissionChecker,
  component: T,
  fallback?: T
): T | undefined {
  const hasPermission = (checker[permission] as () => boolean)();
  return hasPermission ? component : fallback;
}
import type {
  UserId,
  TeamId,
  ProjectId,
  UserTeamRole,
  UserProjectRole,
  TeamPermissions,
  ProjectPermissions,
  AuthorizationContext,
  Team,
  Project
} from '$lib/types/types';

/**
 * Get team permissions based on user's role in the team
 */
export function getTeamPermissions(userRole: UserTeamRole): TeamPermissions {
  switch (userRole) {
    case 'owner':
      return {
        canCreateProject: true,
        canManageTeam: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canDeleteTeam: true,
        canViewTeam: true
      };
    case 'manager':
      return {
        canCreateProject: true,
        canManageTeam: true,
        canInviteMembers: true,
        canRemoveMembers: false, // Only owner can remove members
        canDeleteTeam: false, // Only owner can delete team
        canViewTeam: true
      };
    case 'member':
      return {
        canCreateProject: false, // Members cannot create projects
        canManageTeam: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canDeleteTeam: false,
        canViewTeam: true
      };
    default:
      return {
        canCreateProject: false,
        canManageTeam: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canDeleteTeam: false,
        canViewTeam: false
      };
  }
}

/**
 * Get project permissions based on user's role in the project and team
 */
export function getProjectPermissions(
  userProjectRole: UserProjectRole | undefined,
  userTeamRole: UserTeamRole | undefined,
  isProjectOwner: boolean = false
): ProjectPermissions {
  // Project owner has full permissions
  if (isProjectOwner) {
    return {
      canViewProject: true,
      canEditProject: true,
      canDeleteProject: true,
      canManageTasks: true,
      canCreateTasks: true,
      canAssignTasks: true,
      canManageMembers: true
    };
  }

  // Team owner has full permissions on all team projects
  if (userTeamRole === 'owner') {
    return {
      canViewProject: true,
      canEditProject: true,
      canDeleteProject: true,
      canManageTasks: true,
      canCreateTasks: true,
      canAssignTasks: true,
      canManageMembers: true
    };
  }

  // Team manager has management permissions
  if (userTeamRole === 'manager') {
    return {
      canViewProject: true,
      canEditProject: true,
      canDeleteProject: false, // Cannot delete projects
      canManageTasks: true,
      canCreateTasks: true,
      canAssignTasks: true,
      canManageMembers: false // Cannot manage project members
    };
  }

  // Project manager has task management permissions
  if (userProjectRole === 'manager') {
    return {
      canViewProject: true,
      canEditProject: false,
      canDeleteProject: false,
      canManageTasks: true,
      canCreateTasks: true,
      canAssignTasks: true,
      canManageMembers: false
    };
  }

  // Project member has limited permissions
  if (userProjectRole === 'member') {
    return {
      canViewProject: true,
      canEditProject: false,
      canDeleteProject: false,
      canManageTasks: false,
      canCreateTasks: true, // Members can create tasks
      canAssignTasks: false,
      canManageMembers: false
    };
  }

  // No permissions if not a member
  return {
    canViewProject: false,
    canEditProject: false,
    canDeleteProject: false,
    canManageTasks: false,
    canCreateTasks: false,
    canAssignTasks: false,
    canManageMembers: false
  };
}

/**
 * Check if user has permission to access a team
 */
export function canAccessTeam(userId: UserId, team: Team): boolean {
  return team.ownerId === userId || team.memberIds.includes(userId);
}

/**
 * Check if user has permission to access a project
 */
export function canAccessProject(userId: UserId, project: Project, team?: Team): boolean {
  // Project owner can always access
  if (project.ownerId === userId) {
    return true;
  }

  // Project member can access
  if (project.memberIds?.includes(userId)) {
    return true;
  }

  // Team member can access team projects
  if (team && project.teamId === team.id && canAccessTeam(userId, team)) {
    return true;
  }

  return false;
}

/**
 * Get user's role in a team
 */
export function getUserTeamRole(userId: UserId, team: Team): UserTeamRole | undefined {
  if (team.ownerId === userId) {
    return 'owner';
  }

  if (team.memberRoles && team.memberRoles[userId]) {
    return team.memberRoles[userId];
  }

  if (team.memberIds.includes(userId)) {
    return 'member'; // Default role for team members
  }

  return undefined;
}

/**
 * Get user's role in a project
 */
export function getUserProjectRole(userId: UserId, project: Project): UserProjectRole | undefined {
  if (project.ownerId === userId) {
    return undefined; // Owner is handled separately
  }

  if (project.memberRoles && project.memberRoles[userId]) {
    return project.memberRoles[userId];
  }

  if (project.memberIds?.includes(userId)) {
    return 'member'; // Default role for project members
  }

  return undefined;
}

/**
 * Create authorization context for a user
 */
export function createAuthContext(
  userId: UserId,
  team?: Team,
  project?: Project
): AuthorizationContext {
  const userTeamRole = team ? getUserTeamRole(userId, team) : undefined;
  const userProjectRole = project ? getUserProjectRole(userId, project) : undefined;
  const isTeamOwner = team ? team.ownerId === userId : false;
  const isProjectOwner = project ? project.ownerId === userId : false;

  return {
    userId,
    teamId: team?.id,
    projectId: project?.id,
    userTeamRole,
    userProjectRole,
    isTeamOwner,
    isProjectOwner
  };
}

/**
 * Authorization guard functions
 */
export class AuthorizationError extends Error {
  constructor(message: string, public code: string = 'UNAUTHORIZED') {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Guard function to check team access
 */
export function guardTeamAccess(userId: UserId, team: Team): void {
  if (!canAccessTeam(userId, team)) {
    throw new AuthorizationError(
      'User does not have permission to access this team',
      'TEAM_ACCESS_DENIED'
    );
  }
}

/**
 * Guard function to check project access
 */
export function guardProjectAccess(userId: UserId, project: Project, team?: Team): void {
  if (!canAccessProject(userId, project, team)) {
    throw new AuthorizationError(
      'User does not have permission to access this project',
      'PROJECT_ACCESS_DENIED'
    );
  }
}

/**
 * Guard function to check project creation permission
 */
export function guardProjectCreation(userId: UserId, team: Team): void {
  const userRole = getUserTeamRole(userId, team);
  const permissions = userRole ? getTeamPermissions(userRole) : null;
  
  if (!permissions?.canCreateProject) {
    throw new AuthorizationError(
      'User must be a team owner or manager to create projects',
      'PROJECT_CREATION_DENIED'
    );
  }
}

/**
 * Guard function to check task management permission
 */
export function guardTaskManagement(userId: UserId, project: Project, team?: Team): void {
  const userTeamRole = team ? getUserTeamRole(userId, team) : undefined;
  const userProjectRole = getUserProjectRole(userId, project);
  const isProjectOwner = project.ownerId === userId;
  
  const permissions = getProjectPermissions(userProjectRole, userTeamRole, isProjectOwner);
  
  if (!permissions.canManageTasks) {
    throw new AuthorizationError(
      'User does not have permission to manage tasks in this project',
      'TASK_MANAGEMENT_DENIED'
    );
  }
}
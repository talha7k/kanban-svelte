export type UserId = string; // Can now be Firebase UID
export type ProjectId = string;
export type TaskId = string;
export type ColumnId = string;
export type TeamId = string;
export type CardTypeId = string;

export type UserProjectRole = "manager" | "member";
export type UserTeamRole = "owner" | "manager" | "member";

// Card Type Field Types
export type FieldType = "fixed" | "dropdown" | "text_input" | "number_input" | "date_input" | "textarea" | "checkbox";

export interface FieldConfig {
  // Common config
  required?: boolean;
  placeholder?: string;

  // Fixed field config
  value?: any;

  // Dropdown config
  options?: string[];
  multiple?: boolean;

  // Number config
  min?: number;
  max?: number;

  // Text/Date validation
  pattern?: string;
  minLength?: number;
  maxLength?: number;

  // Date input config
  isDueDate?: boolean;
}

export interface CardTypeField {
  id: string;
  name: string;
  type: FieldType;
  config: FieldConfig;
  order: number;
}

export interface CardType {
  id: CardTypeId;
  name: string;
  description?: string;
  color?: string; // Hex color for visual identification
  fields: CardTypeField[];
  order: number;
  createdAt: string;
  updatedAt: string;
}

// Permission levels for different operations
export type PermissionLevel = "owner" | "manager" | "member";

// Specific permissions for different actions
export interface TeamPermissions {
  canCreateProject: boolean;
  canManageTeam: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canDeleteTeam: boolean;
  canViewTeam: boolean;
}

export interface ProjectPermissions {
  canViewProject: boolean;
  canEditProject: boolean;
  canDeleteProject: boolean;
  canManageTasks: boolean;
  canCreateTasks: boolean;
  canAssignTasks: boolean;
  canManageMembers: boolean;
}

// Authorization context for checking permissions
export interface AuthorizationContext {
  userId: UserId;
  teamId?: TeamId;
  projectId?: ProjectId;
  userTeamRole?: UserTeamRole;
  userProjectRole?: UserProjectRole;
  isTeamOwner?: boolean;
  isProjectOwner?: boolean;
}

export interface TaskFormData {
   title: string;
   description?: string;
   priority: Task["priority"];
   assigneeUids?: string[];
   dueDate?: string; // YYYY-MM-DD string
   tags?: string[];
   fieldValues: Record<string, any>; // Dynamic field values for card types
}

export interface UserProfile {
  id: UserId; // Firebase UID or mock ID
  name: string; // Firebase displayName or mock name
  email?: string; // Firebase email
  avatarUrl?: string; // Firebase photoURL or mock avatar
  bio?: string; // User's biography or description
  title?: string; // New field for user title/position
  createdAt?: string; // ISO string, from Firestore
  teamIds?: TeamId[]; // Teams the user belongs to
  updatedAt?: string;
}

export interface Project {
  id: ProjectId;
  name: string;
  description?: string;
  ownerId: UserId;
  teamId: TeamId | null; // The team this project belongs to
  columns: Column[]; // Stored with the project
  tasks: Task[]; // Stored with the project
  cardTypes?: CardType[]; // Card type definitions for this project
  memberIds?: UserId[]; // Users who are members of this project
  memberRoles?: { [key: UserId]: UserProjectRole }; // Project-specific roles for members
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface NewProjectData {
  name: string;
  description?: string;
}

export interface Team {
  id: TeamId;
  name: string;
  description?: string;
  ownerId: UserId;
  memberIds: UserId[];
  memberRoles?: { [key: UserId]: UserTeamRole }; // Team-specific roles for members
  members?: UserProfile[]; // Optional: populated when fetching team details with member profiles
  createdAt: string;
  updatedAt: string;
}

export interface Task {
  id: TaskId;
  title: string;
  description?: string | null; // Allow null for Firestore
  priority: "LOW" | "MEDIUM" | "HIGH" | "NONE";
  projectId: ProjectId; // Ensures task is tied to a project context
  columnId: ColumnId;
  order: number; // Order within the column
  cardTypeId?: CardTypeId; // Reference to the card type this task belongs to
  fieldValues?: Record<string, any>; // Dynamic field values based on card type
  assigneeUids?: UserId[];
  reporterId?: UserId | null; // Allow null for Firestore
  dueDate?: string | null; // YYYY-MM-DD, allow null for Firestore
  tags?: string[];
  comments?: Comment[];
  createdAt: string; // ISO string date
  updatedAt: string; // ISO string date
}

// Used for creating a task, some fields are auto-generated
export type NewTaskData = Omit<
  Task,
  "id" | "columnId" | "updatedAt" | "comments" | "projectId" | "createdAt"
>;

export interface Column {
  id: ColumnId;
  title: string;
  order: number; // Order of the column within the project's board
}

export interface Comment {
  id: string;
  userId: UserId;
  userName: string; // Denormalized for easy display
  avatarUrl?: string; // Denormalized
  content: string;
  createdAt: string; // ISO string date
}

// Used for creating a comment
export type NewCommentData = Omit<Comment, "id" | "createdAt" | "userId">;

export interface AIPrioritySuggestion {
  suggestedPriority: "LOW" | "MEDIUM" | "HIGH";
  reasoning: string;
}

// Firestore specific types
export interface ProjectDocument
  extends Omit<Project, "id" | "tasks" | "columns" | "cardTypes"> {
  tasks: Task[];
  columns: Column[];
  cardTypes?: CardType[];
}

export interface UserDocument {
  name: string;
  email?: string;
  avatarUrl?: string;
  bio?: string;
  title?: string;
  createdAt?: string;
  teamIds?: TeamId[];
  updatedAt?: string;
}

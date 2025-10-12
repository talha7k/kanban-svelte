import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
import { auth as adminAuth, db as adminDb } from '$lib/server/firebase';
import type {
  Project,
  NewProjectData,
  Column,
  UserId,
  UserProjectRole,
  TeamId,
  Team,
} from "$lib/types/types";
import { v4 as uuidv4 } from "uuid";
import { guardProjectCreation, guardTaskManagement } from "$lib/auth/permissions";
import { getTeam } from "$lib/server/api/firebaseTeam";



// Project Functions
export const createProject = async (
  projectData: NewProjectData,
  ownerId: string,
  teamId?: TeamId
): Promise<Project> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }

  // If teamId is provided, check team permissions
  if (teamId) {
    const team = await getTeam(teamId);
    if (!team) {
      throw new Error("Team not found.");
    }

    // Use RBAC guard to check project creation permissions
     try {
       guardProjectCreation(ownerId as UserId, team);
     } catch (error) {
       throw new Error(`Permission denied: ${error instanceof Error ? error.message : 'Cannot create project in this team'}`);
     }
  }

  try {
    const newProjectId = uuidv4();
    const defaultColumns: Column[] = [
      { id: `col-${newProjectId}-1`, title: "To Do", order: 0 },
      { id: `col-${newProjectId}-2`, title: "In Progress", order: 1 },
      { id: `col-${newProjectId}-3`, title: "Done", order: 2 },
    ];
    const newProjectDoc = {
      ...projectData,
      ownerId: ownerId, // Use authenticated user's ID
      teamId: teamId || null, // Ensure teamId is string or null
      columns: defaultColumns,
      tasks: [],
      memberIds: [ownerId],
      memberRoles: { [ownerId]: "manager" as UserProjectRole },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await db.collection("projects").doc(newProjectId).set(newProjectDoc);
    return { id: newProjectId, ...newProjectDoc } as Project;
  } catch (error) {
    console.error("Error creating project:", error);
    throw error;
  }
};

export const updateProjectDetails = async (
  projectId: string,
  data: { name?: string; description?: string; teamId?: TeamId | null, cardTypes?: any[] },
  currentUserUid: string
): Promise<Project> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  if (!currentUserUid) {
    throw new Error("User must be authenticated to update project details.");
  }
  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    throw new Error("Project not found.");
  }
  const projectData = projectSnap.data() as Project;
  if (projectData.ownerId !== currentUserUid) {
    throw new Error("Only the project owner can update project details.");
  }

  const updatePayload: Partial<
    Pick<Project, "name" | "description" | "teamId" | "updatedAt" | "cardTypes">
  > = {};
  if (data.name !== undefined) updatePayload.name = data.name;
  if (data.description !== undefined)
    updatePayload.description = data.description;
  if (data.teamId !== undefined) updatePayload.teamId = data.teamId;
  if (data.cardTypes !== undefined) updatePayload.cardTypes = data.cardTypes;

  if (Object.keys(updatePayload).length === 0) {
    return { ...projectData } as Project; // No changes
  }

  updatePayload.updatedAt = new Date().toISOString();

  await projectRef.update(updatePayload);

  return { ...projectData, ...updatePayload, id: projectId } as Project;
};

export const deleteProject = async (projectId: string, currentUserUid: string): Promise<void> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  if (!currentUserUid) {
    throw new Error("User must be authenticated to delete projects.");
  }
  const projectRef = db.collection("projects").doc(projectId);
  const projectSnap = await projectRef.get();

  if (!projectSnap.exists) {
    throw new Error("Project not found.");
  }

  const projectData = projectSnap.data() as Project;
  if (projectData.ownerId !== currentUserUid) {
    throw new Error("Only the project owner can delete the project.");
  }

  try {
    await projectRef.delete();
  } catch (error) {
    console.error(`Error deleting project ${projectId}:`, error);
    throw error;
  }
};

export const getProjectById = async (
  projectId: string
): Promise<Project | null> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  try {
    const projectRef = db.collection("projects").doc(projectId);
    const projectSnap = await projectRef.get();
    if (projectSnap.exists) {
      return { id: projectSnap.id, ...projectSnap.data() } as Project;
    }
    return null;
  } catch (error) {
    console.error("Error fetching project by ID:", error);
    throw error;
  }
};
 

export const getProjectsForTeam = async (
  teamId: TeamId
): Promise<Project[]> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  try {
    const projectsCollectionRef = db.collection("projects");
    const q = projectsCollectionRef.where("teamId", "==", teamId);
    const querySnapshot = await q.get();
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Project[];
  } catch (error) {
    console.error("Error fetching projects for team:", error);
    throw error;
  }
};

export const addUserToProject = async (
  projectId: string,
  userId: string,
  currentUserUid: string
): Promise<void> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  const projectRef = db.collection("projects").doc(projectId);
  const userRef = db.collection("users").doc(userId);

  if (!currentUserUid) {
    throw new Error("User must be authenticated to manage project members.");
  }

  try {
    const userSnap = await userRef.get();
    if (!userSnap.exists) {
      throw new Error(`User with ID ${userId} not found.`);
    }
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }
    const projectData = projectSnap.data() as Project;
    if (projectData.ownerId !== currentUserUid) {
      throw new Error("Only the project owner can add members.");
    }

    const updates: Partial<Project> & {
      updatedAt: string;
      memberRoles?: Record<UserId, UserProjectRole>;
    } = {
      memberIds: FieldValue.arrayUnion(userId) as unknown as string[],
      updatedAt: new Date().toISOString(),
    };
    (updates as any)[`memberRoles.${userId}`] = "member";

    await projectRef.update(updates);
  } catch (error) {
    console.error(
      `Error adding user ${userId} to project ${projectId}:`,
      error
    );
    throw error;
  }
};

export const removeUserFromProject = async (
  projectId: string,
  userId: string,
  currentUserUid: string
): Promise<void> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  const projectRef = db.collection("projects").doc(projectId);

  if (!currentUserUid) {
    throw new Error("User must be authenticated to manage project members.");
  }

  try {
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }
    const projectData = projectSnap.data() as Project;
    if (projectData.ownerId !== currentUserUid) {
      throw new Error("Only the project owner can remove members.");
    }
    if (projectData.ownerId === userId) {
      throw new Error(
        "The project owner cannot be removed from the project by themselves."
      );
    }

    const updates: Partial<Project> & {
      updatedAt: string;
      memberRoles?: Record<UserId, UserProjectRole | FieldValue>;
    } = {
      memberIds: FieldValue.arrayRemove(userId) as unknown as string[],
      updatedAt: new Date().toISOString(),
    };
    (updates as any)[`memberRoles.${userId}`] = FieldValue.delete();

    await projectRef.update(updates);
  } catch (error) {
    console.error(
      `Error removing user ${userId} from project ${projectId}:`,
      error
    );
    throw error;
  }
};

export const updateProjectUserRole = async (
  projectId: string,
  userId: string,
  newRole: UserProjectRole,
  currentUserUid: string
): Promise<void> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  const projectRef = db.collection("projects").doc(projectId);
  
  if (!currentUserUid) {
    throw new Error("User must be authenticated to change roles.");
  }

  try {
    const projectSnap = await projectRef.get();
    if (!projectSnap.exists) {
      throw new Error(`Project with ID ${projectId} not found.`);
    }
    const projectData = projectSnap.data() as Project;
    if (projectData.ownerId !== currentUserUid) {
      throw new Error("Only the project owner can change member roles.");
    }
    if (userId === projectData.ownerId) {
      throw new Error("Cannot change the role of the project owner.");
    }
    if (!projectData.memberIds?.includes(userId)) {
      throw new Error("User is not a member of this project.");
    }

    await projectRef.update({
      [`memberRoles.${userId}`]: newRole,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error(
      `Error updating role for user ${userId} in project ${projectId}:`,
      error
    );
    throw error;
  }
};


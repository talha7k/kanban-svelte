import { getFirestore, FieldValue, FieldPath } from 'firebase-admin/firestore';
import { auth as adminAuth, db as adminDb } from '$lib/server/firebase';
import type { Team, UserId, UserProfile } from '$lib/types/types';

export async function createTeam(teamName: string, creatorId: UserId, teamDescription: string): Promise<Team> {
  const db = adminDb();
  if (!db) throw new Error('Database not initialized');
  try {
    const newTeamData = {
      name: teamName,
      description: teamDescription, // Assuming description is optional and can be empty initially
      ownerId: creatorId,
      memberIds: [creatorId],
      createdBy: creatorId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const docRef = await db.collection('teams').add(newTeamData);
    return { id: docRef.id, ...newTeamData } as Team;
  } catch (error) {
    console.error('Error creating team:', error);
    throw new Error('Failed to create team.');
  }
}

export async function getTeamsForUser(userId: UserId): Promise<Team[]> {
  const db = adminDb();
  if (!db) return [];
  try {
    const teamsCollectionRef = db.collection('teams');
    const q = teamsCollectionRef.where('memberIds', 'array-contains', userId);
    const querySnapshot = await q.get();
    const teams: Team[] = [];
    querySnapshot.forEach((doc) => {
      teams.push({ id: doc.id, ...doc.data() } as Team);
    });
    return teams;
  } catch (error) {
    console.error('Error fetching teams for user:', error);
    throw new Error('Failed to fetch teams.');
  }
}

export const getTeam = async (teamId: string): Promise<Team | null> => {
  const db = adminDb();
  if (!db) return null;
  try {
    const teamRef = db.doc(`teams/${teamId}`);
    const teamSnap = await teamRef.get();

    if (teamSnap.exists) {
      const teamData = { id: teamSnap.id, ...teamSnap.data() } as Team;
      if (teamData.memberIds && teamData.memberIds.length > 0) {
        const members = await getTeamMembers(teamId);
        teamData.members = members;
      }
      return teamData;
    } else {
      return null;
    }
  } catch (error) {
    console.error('Error getting team:', error);
    return null;
  }
};

export const updateTeam = async (teamId: string, data: Partial<Team>) => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  const teamRef = db.collection('teams').doc(teamId);
  await teamRef.update(data);
};

export const addMemberToTeam = async (teamId: string, userId: UserId) => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  try {
    const teamRef = db.collection('teams').doc(teamId);
    await teamRef.update({
      memberIds: FieldValue.arrayUnion(userId)
    });
  } catch (error) {
    console.error('Error adding member to team:', error);
    throw new Error('Failed to add member to team.');
  }
}

export const removeMemberFromTeam = async (teamId: string, userId: UserId) => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  try {
    const teamRef = db.collection('teams').doc(teamId);
    await teamRef.update({
      memberIds: FieldValue.arrayRemove(userId)
    });
  } catch (error) {
    console.error('Error removing member from team:', error);
    throw new Error('Failed to remove member from team.');
  }
}

export const deleteTeam = async (teamId: string, currentUserUid: string): Promise<void> => {
  const db = adminDb();
  if (!db) {
    throw new Error("Firebase Firestore not initialized");
  }
  
  if (!currentUserUid) {
    throw new Error('User must be authenticated to delete teams.');
  }

  const teamRef = db.collection('teams').doc(teamId);
  const teamSnap = await teamRef.get();

  if (!teamSnap.exists) {
    throw new Error('Team not found.');
  }

  const teamData = teamSnap.data() as Team;
  if (teamData.ownerId !== currentUserUid) {
    throw new Error('Only the team owner can delete the team.');
  }

  try {
    await teamRef.delete();
  } catch (error) {
    console.error(`Error deleting team ${teamId}:`, error);
    throw error;
  }
};

export const getTeamMembers = async (teamId: string): Promise<UserProfile[]> => {
  try {
    const db = adminDb();
    if (!db) {
      console.warn('Firestore not initialized');
      return [];
    }
    
    // Get team data directly without calling getTeam to avoid circular dependency
    const teamRef = db.collection('teams').doc(teamId);
    const teamSnap = await teamRef.get();
    
    if (!teamSnap.exists) {
      return [];
    }
    
    const teamData = teamSnap.data();
    const memberIds = teamData?.memberIds || [];
    if (memberIds.length === 0) {
      return [];
    }

    // Batch fetch all users in a single query using 'in' operator
    // Firebase 'in' operator supports up to 10 values, so we need to batch if more than 10 members
    const members: UserProfile[] = [];
    const batchSize = 10;
    
    for (let i = 0; i < memberIds.length; i += batchSize) {
      const batch = memberIds.slice(i, i + batchSize);
      const usersQuery = db.collection('users').where(FieldPath.documentId(), 'in', batch);
      
      const querySnapshot = await usersQuery.get();
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        members.push({ id: doc.id, ...userData } as UserProfile);
      });
    }
    
    return members;
  } catch (error) {
    console.error('Error fetching team members:', error);
    throw new Error('Failed to fetch team members.');
  }
};
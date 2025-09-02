import { db } from '$lib/server/firebase';
import type { Team, UserId } from '../types/types';

export const getTeam = async (teamId: string): Promise<Team | null> => {
  const firestore = db();
  if (!firestore) {
    throw new Error("Firebase Firestore not initialized");
  }

  try {
    const teamDoc = await firestore.collection('teams').doc(teamId).get();
    if (!teamDoc.exists) {
      return null;
    }
    
    const teamData = teamDoc.data();
    return {
      id: teamDoc.id,
      ...teamData
    } as Team;
  } catch (error) {
    console.error('Error fetching team:', error);
    return null;
  }
};
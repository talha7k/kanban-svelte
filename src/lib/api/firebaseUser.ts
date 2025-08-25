import { doc, getDoc, setDoc, updateDoc, collection, getDocs, query, where, documentId } from 'firebase/firestore';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from './firebase';
import type { UserProfile, UserDocument } from '../types/types';

// User Profile Functions
export const createUserProfileDocument = async (userAuth: FirebaseUser, additionalData?: Partial<Pick<UserProfile, 'name' | 'title' | 'bio'>>) => {
  if (!userAuth) return;
  const userRef = doc(db, `users/${userAuth.uid}`);
  const snapshot = await getDoc(userRef);

  if (!snapshot.exists()) {
    const { email, displayName, photoURL } = userAuth;
    const createdAt = new Date().toISOString();
    try {
      const newUserProfile: UserProfile = {
        id: userAuth.uid,
        name: additionalData?.name || displayName || email?.split('@')[0] || 'New User',
        email: email || '',
        avatarUrl: photoURL || `https://placehold.co/40x40.png?text=${(additionalData?.name || displayName || email || 'U').substring(0,1).toUpperCase()}`,
        bio: additionalData?.bio || '', // Default bio
        title: additionalData?.title || '', // Default title
        createdAt,
      };
      const { ...profileToSave } = newUserProfile;
      await setDoc(userRef, profileToSave);
      return newUserProfile;
    } catch (error) {
      console.error('Error creating user profile:', error);
      throw error;
    }
  }
  const existingData = snapshot.data() as UserDocument;
  return {
    id: snapshot.id,
    ...existingData,
    bio: existingData.bio || '',
    title: existingData.title || '',
   } as UserProfile;
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
  if (!userId) return null;
  const userRef = doc(db, `users/${userId}`);
  const snapshot = await getDoc(userRef);
  if (snapshot.exists()) {
    const data = snapshot.data() as UserDocument;
    return {
      id: snapshot.id,
      ...data,
      bio: data.bio || '',
      title: data.title || '',
    } as UserProfile;
  }
  return null;
};

export const getAllUserProfiles = async (): Promise<UserProfile[]> => {
  try {
    const usersCollectionRef = collection(db, 'users');
    const querySnapshot = await getDocs(usersCollectionRef);
    return querySnapshot.docs.map(doc => {
      const data = doc.data() as UserDocument;
      return {
        id: doc.id,
        ...data,
        bio: data.bio || '',
        title: data.title || '',
      } as UserProfile;
    });
  } catch (error) {
    console.error('Error fetching all user profiles:', error);
    throw error;
  }
};

export const getUserProfilesByIds = async (userIds: string[]): Promise<UserProfile[]> => {
  try {
    if (userIds.length === 0) {
      return [];
    }

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIds)];
    const users: UserProfile[] = [];
    const batchSize = 10; // Firebase 'in' operator limit
    
    for (let i = 0; i < uniqueUserIds.length; i += batchSize) {
      const batch = uniqueUserIds.slice(i, i + batchSize);
      const usersQuery = query(
        collection(db, 'users'),
        where(documentId(), 'in', batch)
      );
      
      const querySnapshot = await getDocs(usersQuery);
      querySnapshot.forEach((doc) => {
        const data = doc.data() as UserDocument;
        users.push({
          id: doc.id,
          ...data,
          bio: data.bio || '',
          title: data.title || '',
        } as UserProfile);
      });
    }
    
    return users;
  } catch (error) {
    console.error('Error fetching user profiles by IDs:', error);
    throw error;
  }
};

export const getProjectRelevantUsers = async (projectId: string): Promise<UserProfile[]> => {
  try {
    // Get project to find its members and team
    const projectRef = doc(db, 'projects', projectId);
    const projectSnap = await getDoc(projectRef);
    
    if (!projectSnap.exists()) {
      return [];
    }
    
    const projectData = projectSnap.data();
    const relevantUserIds = new Set<string>();
    
    // Add project owner
    if (projectData.ownerId) {
      relevantUserIds.add(projectData.ownerId);
    }
    
    // Add project members
    if (projectData.memberIds) {
      projectData.memberIds.forEach((id: string) => relevantUserIds.add(id));
    }
    
    // If project has a team, add team members
    if (projectData.teamId) {
      const teamRef = doc(db, 'teams', projectData.teamId);
      const teamSnap = await getDoc(teamRef);
      
      if (teamSnap.exists()) {
        const teamData = teamSnap.data();
        if (teamData.memberIds) {
          teamData.memberIds.forEach((id: string) => relevantUserIds.add(id));
        }
      }
    }
    
    // Fetch all relevant users
    return await getUserProfilesByIds(Array.from(relevantUserIds));
  } catch (error) {
    console.error('Error fetching project relevant users:', error);
    throw error;
  }
};

export const getUserProfileByEmail = async (email: string): Promise<UserProfile | null> => {
  try {
    const usersCollectionRef = collection(db, 'users');
    const q = query(usersCollectionRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data() as UserDocument;
      return {
        id: doc.id,
        ...data,
        bio: data.bio || 'Hi, it\'s me! I\'m a team member. I\'m here to help.',
        title: data.title || 'Team Member',
      } as UserProfile;
    }
    return null;
  } catch (error) {
    console.error('Error fetching user profile by email:', error);
    throw error;
  }
};

export const updateUserProfile = async (userId: string, data: { name?: string, title?: string, avatarUrl?: string, bio?: string }): Promise<void> => {
  const currentUser = auth.currentUser;
  if (!currentUser || currentUser.uid !== userId) {
    throw new Error("User must be authenticated and can only update their own profile.");
  }
  const userRef = doc(db, `users/${userId}`);
  try {
    const updateData: Partial<UserProfile> = {};
    if (data.name !== undefined) updateData.name = data.name;
    if (data.title !== undefined) updateData.title = data.title;
    if (data.avatarUrl !== undefined) updateData.avatarUrl = data.avatarUrl;
    if (data.bio !== undefined) updateData.bio = data.bio;

    if (Object.keys(updateData).length === 0) {
        return; // No changes to update
    }
    updateData.updatedAt = new Date().toISOString(); // Keep track of updates

    await updateDoc(userRef, updateData);
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
}
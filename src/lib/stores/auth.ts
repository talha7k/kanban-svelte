import { writable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import { goto } from '$app/navigation';
import {
	signInWithEmailAndPassword,
	createUserWithEmailAndPassword,
	signOut,
	onAuthStateChanged,
	type User
} from 'firebase/auth';
import { auth } from '$lib/firebase';
import type { UserProfile } from '$lib/types/types';
import { createUserProfileDocument, getUserProfile } from '$lib/api/firebaseUser';

// Auth stores
export const currentUser = writable<User | null>(null);
export const userProfile = writable<UserProfile | null>(null);
export const authLoading = writable(true);
export const selectedTeamId = writable<string | null>(null);

// Derived store for auth state
export const isAuthenticated = derived(currentUser, ($currentUser) => !!$currentUser);

// Auth functions
export const authStore = {
	// Initialize auth listener
	init() {
		if (!browser || !auth) return;

		// Load from localStorage
		try {
			const storedUser = localStorage.getItem('currentUser');
			const storedTeamId = localStorage.getItem('selectedTeamId');
			
			if (storedUser) {
				currentUser.set(JSON.parse(storedUser));
			}
			
			if (storedTeamId) {
				selectedTeamId.set(storedTeamId);
			}
		} catch (e) {
			console.error('Failed to load auth state from localStorage', e);
		}

		// Set up Firebase auth listener
		onAuthStateChanged(auth, async (user) => {
			authLoading.set(true);
			
			if (user) {
				currentUser.set(user);
				localStorage.setItem('currentUser', JSON.stringify(user));
				
				// Load user profile
				try {
					const profile = await getUserProfile(user.uid);
					userProfile.set(profile);
				} catch (error) {
					console.error('Failed to load user profile:', error);
				}
			} else {
				currentUser.set(null);
				userProfile.set(null);
				localStorage.removeItem('currentUser');
				localStorage.removeItem('selectedTeamId');
				selectedTeamId.set(null);
			}
			
			authLoading.set(false);
		});
	},

	// Login function
	async login(email: string, password: string) {
		if (!auth) throw new Error('Firebase auth not initialized');
		
		try {
			const userCredential = await signInWithEmailAndPassword(auth, email, password);
			return userCredential.user;
		} catch (error) {
			console.error('Login error:', error);
			throw error;
		}
	},

	// Signup function
	async signup(email: string, password: string, additionalData?: { name?: string }) {
		if (!auth) throw new Error('Firebase auth not initialized');
		
		try {
			const userCredential = await createUserWithEmailAndPassword(auth, email, password);
			const user = userCredential.user;
			
			// Create user profile
			await createUserProfileDocument(user, additionalData);
			
			return user;
		} catch (error) {
			console.error('Signup error:', error);
			throw error;
		}
	},

	// Logout function
	async logout() {
		if (!auth) throw new Error('Firebase auth not initialized');
		
		try {
			await signOut(auth);
			goto('/login');
		} catch (error) {
			console.error('Logout error:', error);
			throw error;
		}
	},

	// Refresh user profile
	async refreshUserProfile() {
		const user = get(currentUser);
		if (!user) return;
		
		try {
			const profile = await getUserProfile(user.uid);
			userProfile.set(profile);
		} catch (error) {
			console.error('Failed to refresh user profile:', error);
			throw error;
		}
	},

	// Set selected team
	setSelectedTeam(teamId: string | null) {
		selectedTeamId.set(teamId);
		if (teamId) {
			localStorage.setItem('selectedTeamId', teamId);
		} else {
			localStorage.removeItem('selectedTeamId');
		}
	}
};
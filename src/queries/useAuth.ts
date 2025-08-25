// src/lib/stores/authStore.ts
import { writable } from 'svelte/store';
import type { User } from 'firebase/auth'; // Or your user type

export const authUser = writable<User | null | undefined>(undefined); // undefined = loading
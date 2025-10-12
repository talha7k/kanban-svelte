import { writable } from 'svelte/store';
import type { UserProfile } from '$lib/types/types';

export interface PageHeaderAction {
	label: string;
	icon?: any;
	variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'link' | 'destructive';
	onClick: () => void;
	disabled?: boolean;
}

export interface PageHeaderData {
	title: string;
	description?: string;
	creator?: UserProfile | null;
	backUrl?: string;
	actions?: PageHeaderAction[];
}

export const pageHeader = writable<PageHeaderData | null>(null);
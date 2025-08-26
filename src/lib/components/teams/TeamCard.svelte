<script lang="ts">
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import type { Team } from '$lib/types/types';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { Users, Crown, Calendar, Settings, ArrowRight } from '@lucide/svelte';
	import { Badge } from '$lib/components/ui/badge';

	export let team: Team;
	export let currentUserId: string | undefined = undefined;
	export let onSelect: ((teamId: string) => void) | undefined = undefined;



	$: isOwner = currentUserId === team.ownerId;
	$: memberCount = team.members?.length || team.memberIds?.length || 0;

	let isNavigating = false;

	function handleSelect(e: MouseEvent, teamId: string) {
		e.stopPropagation();
		if (isNavigating) return;
		
		isNavigating = true;
		onSelect?.(teamId);
	}

	function handleManage(e: MouseEvent) {
		e.stopPropagation();
		if (isNavigating) return;
		
		isNavigating = true;
		goto(`/teams/${team.id}`);
	}
</script>

<Card
	class="bg-gradient-to-r from-purple-100 to-white group cursor-pointer hover:shadow-xl transition-all duration-300 border-0 shadow-md hover:scale-[1.02] hover:bg-gradient-to-r hover:from-pink-100 hover:to-purple-100 {isNavigating ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''}"
	onclick={(e) => handleSelect(e, team.id)}
>
	<CardHeader class="pb-3">
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<div class="flex items-center gap-2 mb-2">
					<CardTitle class="text-lg font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
						{team.name}
					</CardTitle>
					{#if isOwner}
						<Badge
							variant="secondary"
							class="bg-amber-100 text-amber-500 border-orange-200"
						>
							<Crown class="w-3 h-3 mr-1" />
							Owner
						</Badge>
					{/if}
				</div>
				{#if team.description}
					<p class="text-sm text-muted-foreground line-clamp-2">
						{team.description}
					</p>
				{/if}
			</div>
		</div>
	</CardHeader>

	<CardContent class="pt-0 space-y-4">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<div class="flex items-center gap-1 text-sm text-gray-600">
					<Users class="w-4 h-4" />
					<span class="font-medium">{memberCount}</span>
					<span class="text-gray-500">
						{memberCount === 1 ? 'member' : 'members'}
					</span>
				</div>
			</div>

			<div class="flex items-center gap-1 text-xs text-gray-500">
				<Calendar class="w-3 h-3" />
				<span>
					{team.createdAt ? new Date(team.createdAt).toLocaleDateString() : 'N/A'}
				</span>
			</div>
		</div>

		{#if team.members && team.members.length > 0}
			<div class="space-y-2">
				<h4 class="text-sm font-medium text-gray-700 flex items-center gap-1">
					<Users class="w-4 h-4" />
					Team Members
				</h4>
				<div class="space-y-1 max-h-20 overflow-y-auto">
					{#each team.members.slice(0, 7) as member (member.id)}
						<div class="flex items-center gap-2 text-sm">
							<div class="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-medium">
								{member.name?.charAt(0).toUpperCase() || 'U'}
							</div>
							<span class="text-gray-700 truncate">{member.name}</span>
							{#if member.id === team.ownerId}
								<Crown class="w-3 h-3 text-amber-500" />
							{/if}
						</div>
					{/each}
					{#if team.members.length > 7}
						<div class="text-xs text-gray-500 pl-8">
							+{team.members.length - 7} more members
						</div>
					{/if}
				</div>
			</div>
		{/if}

		<div class="flex gap-2 pt-2 w-full">
			{#if isOwner}
				<Button
						variant="outline"
						size="sm"
						class="w-full"
						onclick={handleManage}
						disabled={isNavigating}
					>
						<Settings class="w-4 h-4 mr-1" />
						Manage
					</Button>
			{/if}
		</div>
	</CardContent>
</Card>

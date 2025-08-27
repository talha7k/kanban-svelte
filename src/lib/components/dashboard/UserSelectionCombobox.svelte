<script>
	import { Popover, PopoverTrigger, PopoverContent } from '$lib/components/ui/popover'
	import { Button } from '$lib/components/ui/button'
	import { ChevronsUpDown, UserPlus, Loader2, Check } from '@lucide/svelte'
	import { Avatar, AvatarImage, AvatarFallback } from '$lib/components/ui/avatar'
	import { Command } from 'bits-ui'
	import { cn } from '$lib/utils'

	/** @typedef {import('$lib/types/types').UserProfile} UserProfile */

	/** @type {boolean} */
	export let openCombobox = false
	/** @type {UserProfile[]} */
	export let selectedUsers = []
	/** @type {UserProfile[]} */
	export let users = []
	/** @type {string} */
	export let searchTerm = ''
	/** @type {boolean} */
	export let isSubmitting = false
	/** @type {boolean} */
	export let disabled = false
	/** @type {string} */
	export let placeholder = 'Select user...'
	/** @type {string} */
	export let emptyText = 'No users found.'
	/** @type {boolean} */
	export let multiSelect = true
	/** @type {boolean} */
	export let showSubmitButton = false
	/** @type {string} */
	export let submitButtonText = 'Add'
	/** @type {boolean} */
	export let showAvatars = true
	/** @type {(user: UserProfile) => void} */
	export let onToggleUser = (user) => {}
	/** @type {() => void} */
	export let onSubmit = () => {}

	$: filteredUsers = users.filter(
		/** @param {UserProfile} user */
		(user) =>
			user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			user.email?.toLowerCase().includes(searchTerm.toLowerCase())
	)

	$: displayText = multiSelect 
		? (selectedUsers.length > 0 
			? `${selectedUsers.length} user(s) selected`
			: (users.length === 0 ? 'No users available' : placeholder))
		: (selectedUsers.length > 0 
			? selectedUsers[0].name
			: (users.length === 0 ? 'No users available' : placeholder))
</script>

<div class="flex items-center space-x-2">
	<Popover bind:open={openCombobox}>
		<PopoverTrigger>
			<Button
				variant="outline"
				role="combobox"
				aria-expanded={openCombobox}
				class="w-full justify-between flex-1 h-10 px-3"
				{disabled}
			>
				<span class="truncate">
					{displayText}
				</span>
				<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
			</Button>
		</PopoverTrigger>
		<PopoverContent class="w-[--radix-popover-trigger-width] p-0" align="start">
			<Command.Root class="w-full">
				<Command.Input
					placeholder="Search users..."
					bind:value={searchTerm}
					class="h-10 px-3 w-full"
				/>
				<Command.Empty class="py-6 text-center text-sm text-muted-foreground">
					{emptyText}
				</Command.Empty>
				<Command.List class="max-h-64 overflow-auto w-full">
					<Command.Group class="w-full">
						{#each filteredUsers as user (user.id)}
							<Command.Item
								value={user.name}
								onSelect={() => onToggleUser(user)}
								class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-accent w-full"
							>
								<div class="flex items-center gap-2 flex-1 w-full">
									{#if multiSelect}
										<Check
											class={cn(
												'h-4 w-4',
												selectedUsers.some(u => u.id === user.id) ? 'opacity-100' : 'opacity-0'
											)}
										/>
									{:else}
										<Check
											class={cn(
												'h-4 w-4',
												selectedUsers.length > 0 && selectedUsers[0].id === user.id ? 'opacity-100' : 'opacity-0'
											)}
										/>
									{/if}
									{#if showAvatars}
										<Avatar class="h-6 w-6">
											<AvatarImage src={user.avatarUrl} alt={user.name} />
											<AvatarFallback>{user.name?.substring(0, 1).toUpperCase()}</AvatarFallback>
										</Avatar>
									{/if}
									<div class="flex flex-col flex-1 min-w-0">
										<span class="text-sm font-medium truncate">{user.name}</span>
										<span class="text-xs text-muted-foreground truncate">{user.email}</span>
									</div>
								</div>
							</Command.Item>
						{/each}
					</Command.Group>
				</Command.List>
			</Command.Root>
		</PopoverContent>
	</Popover>
	{#if showSubmitButton}
		<Button onclick={onSubmit} disabled={isSubmitting || selectedUsers.length === 0}>
			{#if isSubmitting}
				<Loader2 class="h-4 w-4 animate-spin" />
			{:else}
				<UserPlus class="h-4 w-4" />
			{/if}
			<span class="ml-2">{submitButtonText} ({selectedUsers.length})</span>
		</Button>
	{/if}
</div>
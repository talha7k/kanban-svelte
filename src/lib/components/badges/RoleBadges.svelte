<script lang="ts">
  import { Crown, UserCog, Users } from '@lucide/svelte';
  import { Badge } from '$lib/components/ui/badge';

  export let role: 'owner' | 'manager' | 'member';
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let showIcon: boolean = true;

  const roleConfig = {
    owner: {
      label: 'Owner',
      icon: Crown,
      className: 'bg-amber-100 text-amber-500 border-orange-200 hover:bg-amber-100',
    },
    manager: {
      label: 'Manager',
      icon: UserCog,
      className: 'bg-blue-100 text-blue-500 border-blue-200 hover:bg-blue-100',
    },
    member: {
      label: 'Member',
      icon: Users,
      className: 'bg-gray-100 text-gray-500 border-gray-200 hover:bg-gray-100',
    },
  };

  $: config = roleConfig[role];
  $: IconComponent = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-0.5',
    lg: 'text-base px-3 py-1',
  };
</script>

<Badge 
  variant="outline" 
  class="{config.className} {sizeClasses[size]} transition-colors"
>
  {#if showIcon}
    <IconComponent class="{size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-4 w-4' : 'h-3.5 w-3.5'} mr-1" />
  {/if}
  {config.label}
</Badge>
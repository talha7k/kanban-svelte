<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { currentUser, authLoading } from '$lib/stores/auth';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Loader2, ArrowLeft, Plus, Edit2, Trash2, GripVertical, Settings } from '@lucide/svelte';
  import type { Project, CardType, CardTypeField, FieldType } from '$lib/types/types';
  import { addCardTypeToProject, updateCardTypeInProject, deleteCardTypeFromProject, reorderCardTypesInProject } from '$lib/api/firebaseCardType';
  import { createProjectPermissions } from '$lib/client/permissions';
  import { useProject } from '$queries/useProjectManagement';
  import { useQueryClient } from '@tanstack/svelte-query';

  // Server-loaded data
  interface PageData {
    project: Project;
    team?: any;
  }

  let { data }: { data: PageData } = $props();

  // Get projectId from page params
  const queryClient = useQueryClient();

  // Use TanStack Query for project data
  const projectQuery = useProject($page.params.projectId);

  // Use server data initially, then switch to query data after hydration
  let project: Project | null = $derived(data.project || $projectQuery.data || null);

  // Permission checks
  const permissions = $derived(project ? createProjectPermissions(project, data.team) : null);
  const canManageTasks = $derived($permissions?.canManageTasks() ?? false);

  let cardTypes: CardType[] = $state([]);
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let draggedCardType: CardType | null = $state(null);
  let dragOverIndex: number | null = $state(null);

  // Sync card types with project data
  $effect(() => {
    if (project?.cardTypes) {
      cardTypes = [...project.cardTypes].sort((a, b) => a.order - b.order);
    } else {
      cardTypes = [];
    }
  });

  // Access control check
  let hasAccess = $derived(
    !$authLoading && project && $currentUser && (
      project.memberIds?.includes($currentUser.uid) ||
      project.ownerId === $currentUser.uid
    )
  );

  $effect(() => {
    if (project && !$authLoading && $currentUser) {
      isLoading = false;
    }
  });

  function getFieldTypeLabel(type: FieldType): string {
    switch (type) {
      case 'fixed': return 'Fixed Value';
      case 'dropdown': return 'Dropdown';
      case 'text_input': return 'Text Input';
      case 'number_input': return 'Number Input';
      case 'date_input': return 'Date Input';
      case 'textarea': return 'Textarea';
      case 'checkbox': return 'Checkbox';
      default: return 'Unknown';
    }
  }

  function getFieldTypeColor(type: FieldType): string {
    switch (type) {
      case 'fixed': return 'bg-gray-100 text-gray-800';
      case 'dropdown': return 'bg-blue-100 text-blue-800';
      case 'text_input': return 'bg-green-100 text-green-800';
      case 'number_input': return 'bg-purple-100 text-purple-800';
      case 'date_input': return 'bg-orange-100 text-orange-800';
      case 'textarea': return 'bg-yellow-100 text-yellow-800';
      case 'checkbox': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  async function handleAddCardType() {
    if (!project || !$currentUser) return;

    const newCardType: Omit<CardType, 'id' | 'createdAt' | 'updatedAt'> = {
      name: 'New Card Type',
      description: '',
      color: '#3b82f6',
      fields: [],
      order: cardTypes.length,
    };

    isSubmitting = true;
    try {
      const idToken = await $currentUser.getIdToken();
      const response = await fetch(`/api/projects/${project.id}/card-types`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify(newCardType)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create card type');
      }

      const result = await response.json();

      // Update local state
      cardTypes = [...cardTypes, result.cardType];

      // Invalidate project query to refresh data
      await queryClient.invalidateQueries({ queryKey: ['project', project.id] });

      toast.success('Card type created successfully');
    } catch (error) {
      console.error('Error creating card type:', error);
      toast.error('Error creating card type', {
        description: error instanceof Error ? error.message : 'Could not create card type.'
      });
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteCardType(cardTypeId: string) {
    if (!project || !$currentUser) return;

    if (!confirm('Are you sure you want to delete this card type? This action cannot be undone.')) {
      return;
    }

    isSubmitting = true;
    try {
      const idToken = await $currentUser.getIdToken();
      const response = await fetch(`/api/projects/${project.id}/card-types/${cardTypeId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete card type');
      }

      // Update local state
      cardTypes = cardTypes.filter(ct => ct.id !== cardTypeId);

      // Invalidate project query to refresh data
      await queryClient.invalidateQueries({ queryKey: ['project', project.id] });

      toast.success('Card type deleted successfully');
    } catch (error) {
      console.error('Error deleting card type:', error);
      toast.error('Error deleting card type', {
        description: error instanceof Error ? error.message : 'Could not delete card type.'
      });
    } finally {
      isSubmitting = false;
    }
  }

  function handleDragStart(event: DragEvent, cardType: CardType) {
    draggedCardType = cardType;
    event.dataTransfer!.effectAllowed = 'move';
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    dragOverIndex = index;
  }

  function handleDragEnd() {
    draggedCardType = null;
    dragOverIndex = null;
  }

  async function handleDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();

    if (!draggedCardType || !project || !$currentUser || !cardTypes) return;

    const draggedIndex = cardTypes.findIndex(ct => ct.id === draggedCardType!.id);
    if (draggedIndex === -1 || draggedIndex === dropIndex) return;

    // Reorder locally first for immediate UI feedback
    const newCardTypes = [...cardTypes];
    newCardTypes.splice(draggedIndex, 1);
    newCardTypes.splice(dropIndex, 0, draggedCardType);

    // Update order values
    const reorderedCardTypes = newCardTypes.map((ct, index) => ({ ...ct, order: index }));
    cardTypes = reorderedCardTypes;

    // Send reorder request to server
    try {
      const idToken = await $currentUser.getIdToken();
      const response = await fetch(`/api/projects/${project.id}/card-types/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          cardTypeIds: reorderedCardTypes.map(ct => ct.id)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder card types');
      }

      // Invalidate project query to refresh data
      await queryClient.invalidateQueries({ queryKey: ['project', project.id] });

    } catch (error) {
      console.error('Error reordering card types:', error);
      toast.error('Error reordering card types', {
        description: error instanceof Error ? error.message : 'Could not reorder card types.'
      });
      // Revert local changes on error
      cardTypes = [...(project.cardTypes || [])].sort((a, b) => a.order - b.order);
    }

    draggedCardType = null;
    dragOverIndex = null;
  }

  function handleEditCardType(cardType: CardType) {
    // TODO: Open edit dialog
    toast.info('Edit functionality coming soon');
  }
</script>

<!-- Authentication and loading guard -->
{#if $authLoading || !$currentUser}
  <div class="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
    <Loader2 class="h-12 w-12 animate-spin mb-4 text-primary" />
    <p class="text-lg">Loading...</p>
  </div>
{:else if isLoading}
  <div class="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
    <Loader2 class="h-12 w-12 animate-spin mb-4 text-primary" />
    <p class="text-lg">Loading card types...</p>
  </div>
{:else if !project}
  <div class="flex flex-col items-center justify-center h-full text-destructive p-8">
    <h2 class="text-2xl font-semibold mb-2">Error</h2>
    <p>Project not found or you do not have access.</p>
    <Button onclick={() => goto('/teams')} variant="link" class="mt-2">
      Go to Dashboard
    </Button>
  </div>
{:else if !hasAccess}
  <div class="flex flex-col items-center justify-center h-full text-destructive p-8">
    <h2 class="text-2xl font-semibold mb-2">Access Denied</h2>
    <p>You do not have access to this project.</p>
    <Button onclick={() => goto('/teams')} variant="link" class="mt-2">
      Go to Dashboard
    </Button>
  </div>
{:else}
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="p-4 border-b bg-card">
      <div class="container mx-auto">
        <div class="flex items-center justify-between w-full">
          <div class="flex items-center gap-4">
            <Button onclick={() => goto(`/projects/${project.id}`)} variant="outline" size="icon">
              <ArrowLeft class="h-4 w-4" />
            </Button>
            <div class="flex flex-col">
              <h1 class="text-2xl font-bold text-card-foreground">
                Card Types
              </h1>
              <p class="text-sm text-muted-foreground mt-1">
                Manage card types and their fields for {project.name}
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            {#if canManageTasks}
              <Button
                onclick={handleAddCardType}
                disabled={isSubmitting}
                class="md:mr-2"
              >
                {#if isSubmitting}
                  <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {/if}
                <Plus class="h-5 w-5" />
                Add Card Type
              </Button>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <div class="container mx-auto max-w-6xl">
        {#if cardTypes.length === 0}
          <div class="text-center py-12">
            <div class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Settings class="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 class="text-lg font-semibold mb-2">No Card Types Yet</h3>
            <p class="text-muted-foreground mb-4">
              Create your first card type to define custom fields for your tasks.
            </p>
            {#if canManageTasks}
              <Button onclick={handleAddCardType} disabled={isSubmitting}>
                <Plus class="h-4 w-4 mr-2" />
                Create First Card Type
              </Button>
            {/if}
          </div>
        {:else}
          <div class="grid gap-4">
            {#each cardTypes as cardType, index (cardType.id)}
              <Card
                class="transition-all duration-200 {dragOverIndex === index ? 'ring-2 ring-primary' : ''}"
                ondragover={(e) => handleDragOver(e, index)}
                ondrop={(e) => handleDrop(e, index)}
              >
                <CardHeader class="pb-3">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      {#if canManageTasks}
                        <div
                          class="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
                          draggable="true"
                          role="button"
                          tabindex="0"
                          ondragstart={(e) => handleDragStart(e, cardType)}
                          ondragend={handleDragEnd}
                        >
                          <GripVertical class="h-4 w-4 text-muted-foreground" />
                        </div>
                      {/if}
                      <div
                        class="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                        style="background-color: {cardType.color || '#3b82f6'}"
                      ></div>
                      <div>
                        <CardTitle class="text-lg">{cardType.name}</CardTitle>
                        {#if cardType.description}
                          <p class="text-sm text-muted-foreground mt-1">{cardType.description}</p>
                        {/if}
                      </div>
                    </div>
                    {#if canManageTasks}
                      <div class="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onclick={() => handleEditCardType(cardType)}
                          disabled={isSubmitting}
                        >
                          <Edit2 class="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="hover:bg-destructive/10 hover:text-destructive"
                          onclick={() => handleDeleteCardType(cardType.id)}
                          disabled={isSubmitting}
                        >
                          <Trash2 class="h-4 w-4" />
                        </Button>
                      </div>
                    {/if}
                  </div>
                </CardHeader>
                <CardContent>
                  {#if cardType.fields.length === 0}
                    <p class="text-sm text-muted-foreground italic">No fields defined yet</p>
                  {:else}
                    <div class="space-y-2">
                      <h4 class="text-sm font-medium text-muted-foreground">Fields:</h4>
                      <div class="flex flex-wrap gap-2">
                        {#each cardType.fields as field (field.id)}
                          <Badge variant="secondary" class={getFieldTypeColor(field.type)}>
                            {field.name}: {getFieldTypeLabel(field.type)}
                            {#if field.config.required}
                              <span class="ml-1 text-red-500">*</span>
                            {/if}
                          </Badge>
                        {/each}
                      </div>
                    </div>
                  {/if}
                </CardContent>
              </Card>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
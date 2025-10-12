<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { currentUser, authLoading } from '$lib/stores/auth';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Loader2, ArrowLeft, Plus, Settings } from '@lucide/svelte';
  import type { Project, CardType, CardTypeField, FieldType } from '$lib/types/types';
  import { addCardTypeToProject, updateCardTypeInProject, deleteCardTypeFromProject, reorderCardTypesInProject } from '$lib/api/firebaseCardType';
  import CardTypeDialog from '$lib/components/CardTypeDialog.svelte';
  import CardTypeCard from '$lib/components/CardTypeCard.svelte';
  import { createProjectPermissions } from '$lib/client/permissions';
 	import { useProject } from '$queries/useProjectManagement';
 	import { useQueryClient } from '@tanstack/svelte-query';
 	import { withLoading } from '$lib/utils/loading';
 	import { pageHeader } from '$lib/stores/pageHeader';

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

  // Dialog states
  let isAddDialogOpen = $state(false);
  let isEditDialogOpen = $state(false);
  let editingCardType: CardType | null = $state(null);

  // Field management states
  let addFields: CardTypeField[] = $state([]);
  let editFields: CardTypeField[] = $state([]);
  let newFieldName: string = $state('');
  let newFieldType: FieldType = $state('text_input');
  let newFieldRequired: boolean = $state(false);
  let newFieldOptions: string = $state('');
  let isAddFieldDialogOpen: boolean = $state(false);

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

  // Set page header data
  $effect(() => {
    if (project && !$authLoading && $currentUser && hasAccess) {
      const actions = [];

      if (canManageTasks) {
        actions.push({
          label: 'Add Card Type',
          icon: Plus,
          variant: 'default' as const,
          onClick: handleAddCardType,
          disabled: isSubmitting
        });
      }

      pageHeader.set({
        title: 'Card Types',
        description: `Manage card types and their fields for ${project.name}`,
        backUrl: `/projects/${project.id}`,
        actions
      });
    } else {
      pageHeader.set(null);
    }
  });



  function handleAddCardType() {
    isAddDialogOpen = true;
  }

  async function handleAddSubmit(data: { name: string; description: string; color: string; fields: CardTypeField[] }) {
    if (!project || !$currentUser) return;

    const newCardType: Omit<CardType, 'id' | 'createdAt' | 'updatedAt'> = {
      name: data.name,
      description: data.description || undefined,
      color: data.color,
      fields: data.fields,
      order: cardTypes.length,
    };

    isSubmitting = true;
    try {
      await withLoading(async () => {
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
        isAddDialogOpen = false;
      });
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
      await withLoading(async () => {
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
      });
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
      await withLoading(async () => {
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
      });

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
    editingCardType = cardType;
    isEditDialogOpen = true;
  }

  function handleAddField() {
    if (!newFieldName.trim()) return;

    const options = newFieldType === 'dropdown' ? newFieldOptions.split('\n').map(o => o.trim()).filter(o => o) : [];

    const newField: CardTypeField = {
      id: crypto.randomUUID(),
      name: newFieldName.trim(),
      type: newFieldType,
      order: editFields.length,
      config: {
        required: newFieldRequired,
        ...(newFieldType === 'text_input' && { placeholder: '' }),
        ...(newFieldType === 'number_input' && { min: undefined, max: undefined }),
        ...(newFieldType === 'dropdown' && { options }),
        ...(newFieldType === 'textarea' && { placeholder: '' }),
      },
    };

    editFields = [...editFields, newField];
    newFieldName = '';
    newFieldType = 'text_input';
    newFieldRequired = false;
    newFieldOptions = '';
    isAddFieldDialogOpen = false;
  }

  function handleAddFieldForAdd() {
    if (!newFieldName.trim()) return;

    const options = newFieldType === 'dropdown' ? newFieldOptions.split('\n').map(o => o.trim()).filter(o => o) : [];

    const newField: CardTypeField = {
      id: crypto.randomUUID(),
      name: newFieldName.trim(),
      type: newFieldType,
      order: addFields.length,
      config: {
        required: newFieldRequired,
        // Add default config based on type
        ...(newFieldType === 'text_input' && { placeholder: '' }),
        ...(newFieldType === 'number_input' && { min: undefined, max: undefined }),
        ...(newFieldType === 'dropdown' && { options }),
        ...(newFieldType === 'textarea' && { placeholder: '' }),
      }
    };

    addFields = [...addFields, newField];
    newFieldName = '';
    newFieldType = 'text_input';
    newFieldRequired = false;
    newFieldOptions = '';
    isAddFieldDialogOpen = false;
  }

  function handleRemoveFieldForAdd(fieldId: string) {
    addFields = addFields.filter(f => f.id !== fieldId);
  }

  function handleRemoveField(fieldId: string) {
    editFields = editFields.filter(f => f.id !== fieldId);
  }

  async function handleEditSubmit(data: { name: string; description: string; color: string; fields: CardTypeField[] }) {
    if (!project || !$currentUser || !editingCardType) return;

    isSubmitting = true;
    try {
      const idToken = await $currentUser.getIdToken();
      const response = await fetch(`/api/projects/${project.id}/card-types/${editingCardType.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description || undefined,
          color: data.color,
          fields: data.fields,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update card type');
      }

      const result = await response.json();

      // Update local state
      cardTypes = cardTypes.map(ct => ct.id === editingCardType!.id ? result.cardType : ct);

      // Invalidate project query to refresh data
      await queryClient.invalidateQueries({ queryKey: ['project', project.id] });

      toast.success('Card type updated successfully');
      isEditDialogOpen = false;
      editingCardType = null;
    } catch (error) {
      console.error('Error updating card type:', error);
      toast.error('Error updating card type', {
        description: error instanceof Error ? error.message : 'Could not update card type.'
      });
    } finally {
      isSubmitting = false;
    }
  }

  async function handleAIGenerate(brief: string): Promise<{ name: string; description: string; color: string; fields: CardTypeField[] }> {
    if (!project || !$currentUser) {
      throw new Error('Project or user not available');
    }

    try {
      const idToken = await $currentUser.getIdToken();
      const response = await fetch(`/api/projects/${project.id}/card-types/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({ brief })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate card type');
      }

      const result = await response.json();
      return result.cardType;
    } catch (error) {
      console.error('Error generating card type with AI:', error);
      toast.error('Error generating card type', {
        description: error instanceof Error ? error.message : 'Could not generate card type with AI.'
      });
      throw error;
    }
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
           <div class="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
             {#each cardTypes as cardType, index (cardType.id)}
               <CardTypeCard
                 {cardType}
                 {index}
                 {canManageTasks}
                 {isSubmitting}
                 {dragOverIndex}
                 {draggedCardType}
                 onDragStart={handleDragStart}
                 onDragOver={handleDragOver}
                 onDragEnd={handleDragEnd}
                 onDrop={handleDrop}
                 onEdit={handleEditCardType}
                 onDelete={handleDeleteCardType}
               />
             {/each}
           </div>
        {/if}
      </div>
    </div>

    <CardTypeDialog
      open={isAddDialogOpen}
      mode="add"
      isSubmitting={isSubmitting}
      onSave={handleAddSubmit}
      onCancel={() => { isAddDialogOpen = false; }}
      onAIGenerate={handleAIGenerate}
    />

    <CardTypeDialog
      open={isEditDialogOpen}
      mode="edit"
      cardType={editingCardType}
      isSubmitting={isSubmitting}
      onSave={handleEditSubmit}
      onCancel={() => { isEditDialogOpen = false; editingCardType = null; }}
    />



  </div>
{/if}
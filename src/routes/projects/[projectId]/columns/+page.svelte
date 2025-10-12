<script lang="ts">
  import { goto } from '$app/navigation';
  import { page } from '$app/stores';
  import { currentUser, authLoading } from '$lib/stores/auth';
  import { toast } from 'svelte-sonner';
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { Loader2, ArrowLeft, Plus, Edit2, Trash2, GripVertical, Settings, AlertTriangle } from '@lucide/svelte';
  import type { Project, Column } from '$lib/types/types';
  import { addColumnToProject, updateColumnInProject, deleteColumnFromProject, reorderColumnsInProject } from '$lib/api/firebaseColumn';
  import { createProjectPermissions } from '$lib/client/permissions';
  import { useProject } from '$queries/useProjectManagement';
  import { useQueryClient } from '@tanstack/svelte-query';
  import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Select, SelectContent, SelectItem, SelectTrigger } from '$lib/components/ui/select';

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

  let columns: Column[] = $state([]);
  let isLoading = $state(true);
  let isSubmitting = $state(false);
  let draggedColumn: Column | null = $state(null);
  let dragOverIndex: number | null = $state(null);

  // Dialog states
  let isAddDialogOpen = $state(false);
  let isEditDialogOpen = $state(false);
  let isDeleteDialogOpen = $state(false);
  let editingColumn: Column | null = $state(null);
  let deletingColumn: Column | null = $state(null);

  // Form data
  let newColumnTitle = $state('');
  let editColumnTitle = $state('');

  // Sync columns with project data
  $effect(() => {
    if (project?.columns) {
      columns = [...project.columns].sort((a, b) => a.order - b.order);
    } else {
      columns = [];
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

  async function handleAddColumn() {
    if (!project || !$currentUser || !newColumnTitle.trim()) return;

    isSubmitting = true;
    try {
      const idToken = await $currentUser.getIdToken();
      const response = await fetch(`/api/projects/${project.id}/columns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          title: newColumnTitle.trim(),
          order: columns.length,
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create column');
      }

      const result = await response.json();

      // Update local state
      columns = [...columns, result.column];

      // Invalidate project query to refresh data
      await queryClient.invalidateQueries({ queryKey: ['project', project.id] });

      toast.success('Column created successfully');
      newColumnTitle = '';
      isAddDialogOpen = false;
    } catch (error) {
      console.error('Error creating column:', error);
      toast.error('Error creating column', {
        description: error instanceof Error ? error.message : 'Could not create column.'
      });
    } finally {
      isSubmitting = false;
    }
  }

  async function handleEditColumn() {
    if (!project || !$currentUser || !editingColumn || !editColumnTitle.trim()) return;

    isSubmitting = true;
    try {
      const idToken = await $currentUser.getIdToken();
      const response = await fetch(`/api/projects/${project.id}/columns/${editingColumn.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          title: editColumnTitle.trim(),
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update column');
      }

      const result = await response.json();

      // Update local state
      columns = columns.map(col => col.id === editingColumn!.id ? result.column : col);

      // Invalidate project query to refresh data
      await queryClient.invalidateQueries({ queryKey: ['project', project.id] });

      toast.success('Column updated successfully');
      editColumnTitle = '';
      isEditDialogOpen = false;
      editingColumn = null;
    } catch (error) {
      console.error('Error updating column:', error);
      toast.error('Error updating column', {
        description: error instanceof Error ? error.message : 'Could not update column.'
      });
    } finally {
      isSubmitting = false;
    }
  }

  async function handleDeleteColumn(targetColumnId?: string) {
    if (!project || !$currentUser || !deletingColumn) return;

    isSubmitting = true;
    try {
      const idToken = await $currentUser.getIdToken();
      const url = targetColumnId
        ? `/api/projects/${project.id}/columns/${deletingColumn.id}?targetColumnId=${targetColumnId}`
        : `/api/projects/${project.id}/columns/${deletingColumn.id}`;

      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${idToken}`
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete column');
      }

      // Update local state
      columns = columns.filter(col => col.id !== deletingColumn!.id);

      // Invalidate project query to refresh data
      await queryClient.invalidateQueries({ queryKey: ['project', project.id] });

      toast.success('Column deleted successfully');
      isDeleteDialogOpen = false;
      deletingColumn = null;
    } catch (error) {
      console.error('Error deleting column:', error);
      toast.error('Error deleting column', {
        description: error instanceof Error ? error.message : 'Could not delete column.'
      });
    } finally {
      isSubmitting = false;
    }
  }

  function openEditDialog(column: Column) {
    editingColumn = column;
    editColumnTitle = column.title;
    isEditDialogOpen = true;
  }

  function openDeleteDialog(column: Column) {
    deletingColumn = column;
    isDeleteDialogOpen = true;
  }

  function handleDragStart(event: DragEvent, column: Column) {
    draggedColumn = column;
    event.dataTransfer!.effectAllowed = 'move';
  }

  function handleDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    dragOverIndex = index;
  }

  function handleDragEnd() {
    draggedColumn = null;
    dragOverIndex = null;
  }

  async function handleDrop(event: DragEvent, dropIndex: number) {
    event.preventDefault();

    if (!draggedColumn || !project || !$currentUser || !columns) return;

    const draggedIndex = columns.findIndex(col => col.id === draggedColumn!.id);
    if (draggedIndex === -1 || draggedIndex === dropIndex) return;

    // Reorder locally first for immediate UI feedback
    const newColumns = [...columns];
    newColumns.splice(draggedIndex, 1);
    newColumns.splice(dropIndex, 0, draggedColumn);

    // Update order values
    const reorderedColumns = newColumns.map((col, index) => ({ ...col, order: index }));
    columns = reorderedColumns;

    // Send reorder request to server
    try {
      const idToken = await $currentUser.getIdToken();
      const response = await fetch(`/api/projects/${project.id}/columns/reorder`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        body: JSON.stringify({
          columnIds: reorderedColumns.map(col => col.id)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to reorder columns');
      }

      // Invalidate project query to refresh data
      await queryClient.invalidateQueries({ queryKey: ['project', project.id] });

    } catch (error) {
      console.error('Error reordering columns:', error);
      toast.error('Error reordering columns', {
        description: error instanceof Error ? error.message : 'Could not reorder columns.'
      });
      // Revert local changes on error
      columns = [...project.columns].sort((a, b) => a.order - b.order);
    }

    draggedColumn = null;
    dragOverIndex = null;
  }

  function getTaskCount(columnId: string): number {
    return project?.tasks.filter(task => task.columnId === columnId).length || 0;
  }

  function getAvailableTargetColumns(): Column[] {
    return columns.filter(col => col.id !== deletingColumn?.id);
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
    <p class="text-lg">Loading columns...</p>
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
                Manage Columns
              </h1>
              <p class="text-sm text-muted-foreground mt-1">
                Customize the columns for {project.name}
              </p>
            </div>
          </div>
          <div class="flex gap-2">
            {#if canManageTasks}
              <Dialog bind:open={isAddDialogOpen}>
                <DialogTrigger>
                  <Button disabled={isSubmitting}>
                    <Plus class="h-5 w-5" />
                    Add Column
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New Column</DialogTitle>
                    <DialogDescription>
                      Create a new column for your kanban board.
                    </DialogDescription>
                  </DialogHeader>
                  <div class="space-y-4">
                    <div>
                      <Label for="column-title">Column Title</Label>
                      <Input
                        id="column-title"
                        bind:value={newColumnTitle}
                        placeholder="e.g., In Review, Testing, Done"
                        required
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onclick={() => { isAddDialogOpen = false; newColumnTitle = ''; }}>
                      Cancel
                    </Button>
                    <Button onclick={handleAddColumn} disabled={isSubmitting || !newColumnTitle.trim()}>
                      {#if isSubmitting}
                        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                      {/if}
                      Add Column
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto p-4">
      <div class="container mx-auto max-w-4xl">
        {#if columns.length === 0}
          <div class="text-center py-12">
            <div class="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-4">
              <Settings class="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 class="text-lg font-semibold mb-2">No Columns Yet</h3>
            <p class="text-muted-foreground mb-4">
              Add your first column to get started with your kanban board.
            </p>
            {#if canManageTasks}
              <Button onclick={() => isAddDialogOpen = true}>
                <Plus class="h-4 w-4 mr-2" />
                Add First Column
              </Button>
            {/if}
          </div>
        {:else}
          <div class="space-y-4">
            {#each columns as column, index (column.id)}
              <Card
                class="transition-all duration-200 {dragOverIndex === index ? 'ring-2 ring-primary' : ''}"
                ondragover={(e) => handleDragOver(e, index)}
                ondrop={(e) => handleDrop(e, index)}
              >
                <CardContent class="p-4">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-3">
                      {#if canManageTasks}
                        <div
                          class="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
                          draggable="true"
                          ondragstart={(e) => handleDragStart(e, column)}
                          ondragend={handleDragEnd}
                          role="button"
                          tabindex="0"
                        >
                          <GripVertical class="h-4 w-4 text-muted-foreground" />
                        </div>
                      {/if}
                      <div>
                        <h3 class="font-medium text-lg">{column.title}</h3>
                        <div class="flex items-center gap-2 mt-1">
                          <Badge variant="secondary">
                            {getTaskCount(column.id)} task{getTaskCount(column.id) !== 1 ? 's' : ''}
                          </Badge>
                          <span class="text-sm text-muted-foreground">
                            Order: {column.order}
                          </span>
                        </div>
                      </div>
                    </div>
                    {#if canManageTasks}
                      <div class="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onclick={() => openEditDialog(column)}
                          disabled={isSubmitting}
                        >
                          <Edit2 class="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          class="hover:bg-destructive/10 hover:text-destructive"
                          onclick={() => openDeleteDialog(column)}
                          disabled={isSubmitting || columns.length === 1}
                        >
                          <Trash2 class="h-4 w-4" />
                        </Button>
                      </div>
                    {/if}
                  </div>
                </CardContent>
              </Card>
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Edit Column Dialog -->
    <Dialog bind:open={isEditDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Column</DialogTitle>
          <DialogDescription>
            Update the column title.
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div>
            <Label for="edit-column-title">Column Title</Label>
            <Input
              id="edit-column-title"
              bind:value={editColumnTitle}
              placeholder="Column title"
              required
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onclick={() => { isEditDialogOpen = false; editingColumn = null; editColumnTitle = ''; }}>
            Cancel
          </Button>
          <Button onclick={handleEditColumn} disabled={isSubmitting || !editColumnTitle.trim()}>
            {#if isSubmitting}
              <Loader2 class="mr-2 h-4 w-4 animate-spin" />
            {/if}
            Update Column
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    <!-- Delete Column Dialog -->
    <Dialog bind:open={isDeleteDialogOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle class="flex items-center gap-2">
            <AlertTriangle class="h-5 w-5 text-destructive" />
            Delete Column
          </DialogTitle>
          <DialogDescription>
            {#if deletingColumn && getTaskCount(deletingColumn.id) > 0}
              This column contains {getTaskCount(deletingColumn.id)} task{getTaskCount(deletingColumn.id) !== 1 ? 's' : ''}.
              You must choose where to move these tasks before deleting the column.
            {:else}
              Are you sure you want to delete "{deletingColumn?.title}"? This action cannot be undone.
            {/if}
          </DialogDescription>
        </DialogHeader>

        {#if deletingColumn && getTaskCount(deletingColumn.id) > 0}
          <div class="space-y-4">
            <div>
              <Label for="target-column">Move tasks to:</Label>
                <Select type="single" onValueChange={(value: string) => handleDeleteColumn(value)}>
                  <SelectTrigger>
                    Select target column
                  </SelectTrigger>
                <SelectContent>
                  {#each getAvailableTargetColumns() as column}
                    <SelectItem value={column.id}>
                      {column.title} ({getTaskCount(column.id)} tasks)
                    </SelectItem>
                  {/each}
                </SelectContent>
              </Select>
            </div>
          </div>
        {/if}

        <DialogFooter>
          <Button variant="outline" onclick={() => { isDeleteDialogOpen = false; deletingColumn = null; }}>
            Cancel
          </Button>
          {#if deletingColumn && getTaskCount(deletingColumn.id) === 0}
            <Button variant="destructive" onclick={() => handleDeleteColumn()} disabled={isSubmitting}>
              {#if isSubmitting}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
              {/if}
              Delete Column
            </Button>
          {/if}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
{/if}
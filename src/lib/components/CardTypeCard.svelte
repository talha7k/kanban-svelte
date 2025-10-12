<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import { Badge } from '$lib/components/ui/badge';
  import { GripVertical, Edit2, Trash2, Type, Hash, Calendar, AlignLeft, CheckSquare, Lock, ChevronsUpDown } from '@lucide/svelte';
  import type { CardType, FieldType } from '$lib/types/types';

  interface Props {
    cardType: CardType;
    index: number;
    canManageTasks: boolean;
    isSubmitting: boolean;
    dragOverIndex: number | null;
    draggedCardType: CardType | null;
    onDragStart: (event: DragEvent, cardType: CardType) => void;
    onDragOver: (event: DragEvent, index: number) => void;
    onDragEnd: () => void;
    onDrop: (event: DragEvent, index: number) => void;
    onEdit: (cardType: CardType) => void;
    onDelete: (cardTypeId: string) => void;
  }

  let {
    cardType,
    index,
    canManageTasks,
    isSubmitting,
    dragOverIndex,
    draggedCardType,
    onDragStart,
    onDragOver,
    onDragEnd,
    onDrop,
    onEdit,
    onDelete
  }: Props = $props();

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
      case 'fixed': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'dropdown': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'text_input': return 'bg-green-100 text-green-800 border-green-200';
      case 'number_input': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'date_input': return 'bg-red-100 text-red-800 border-red-200';
      case 'textarea': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'checkbox': return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  }

  function getFieldTypeIcon(type: FieldType) {
    switch (type) {
      case 'fixed': return Lock;
      case 'dropdown': return ChevronsUpDown;
      case 'text_input': return Type;
      case 'number_input': return Hash;
      case 'date_input': return Calendar;
      case 'textarea': return AlignLeft;
      case 'checkbox': return CheckSquare;
      default: return Type;
    }
  }
</script>

<Card
  class="transition-all duration-200 {dragOverIndex === index ? 'ring-2 ring-primary' : ''} relative"
  ondragover={(e) => onDragOver(e, index)}
  ondrop={(e) => onDrop(e, index)}
>
  {#if dragOverIndex === index && draggedCardType}
    <div class="absolute -top-2 left-1/2 transform -translate-x-1/2 bg-primary text-primary-foreground px-2 py-1 rounded text-xs font-medium z-50 whitespace-nowrap">
      Drop "{draggedCardType.name}" here (position {index + 1})
    </div>
  {/if}
  <CardHeader class="pb-2">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        {#if canManageTasks}
          <div
            class="cursor-grab active:cursor-grabbing p-1 rounded hover:bg-muted"
            draggable="true"
            role="button"
            tabindex="0"
            ondragstart={(e) => onDragStart(e, cardType)}
            ondragend={onDragEnd}
          >
            <GripVertical class="h-3 w-3 text-muted-foreground" />
          </div>
        {/if}
        <div
          class="w-3 h-3 rounded-full border border-white shadow-sm flex-shrink-0"
          style="background-color: {cardType.color || '#3b82f6'}"
        ></div>
        <div class="min-w-0 flex-1">
          <CardTitle class="text-base leading-tight">{cardType.name}</CardTitle>
          {#if cardType.description}
            <p class="text-xs text-muted-foreground mt-0.5 leading-tight">{cardType.description}</p>
          {/if}
        </div>
      </div>
      {#if canManageTasks}
        <div class="flex gap-1 ml-2">
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7"
            onclick={() => onEdit(cardType)}
            disabled={isSubmitting}
          >
            <Edit2 class="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            class="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
            onclick={() => onDelete(cardType.id)}
            disabled={isSubmitting}
          >
            <Trash2 class="h-3 w-3" />
          </Button>
        </div>
      {/if}
    </div>
  </CardHeader>
  <CardContent class="pt-0">
    {#if cardType.fields.length === 0}
      <p class="text-xs text-muted-foreground italic">No fields defined yet</p>
    {:else}
      <div class="space-y-1.5">
        <h4 class="text-xs font-medium text-muted-foreground">Fields:</h4>
        <div class="flex flex-wrap gap-1">
            {#each cardType.fields as field (field.id)}
              {@const Icon = getFieldTypeIcon(field.type)}
               <Badge variant="secondary" class="{getFieldTypeColor(field.type)} text-xs px-1.5 py-0.5 flex items-center gap-1">
                 <Icon class="h-2.5 w-2.5" />
                 {field.name}
             </Badge>
           {/each}
        </div>
      </div>
    {/if}
  </CardContent>
</Card>
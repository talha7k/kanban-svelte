<script lang="ts">
  import { Button } from '$lib/components/ui/button';
  import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '$lib/components/ui/dialog';
  import { Input } from '$lib/components/ui/input';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Badge } from '$lib/components/ui/badge';
  import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
  import { Loader2, Trash2, Type, Hash, Calendar, AlignLeft, CheckSquare, Lock, ChevronsUpDown, Sparkles } from '@lucide/svelte';
  import type { CardType, CardTypeField, FieldType } from '$lib/types/types';

  interface Props {
    open: boolean;
    mode: 'add' | 'edit';
    cardType?: CardType | null;
    isSubmitting?: boolean;
    onSave: (data: { name: string; description: string; color: string; fields: CardTypeField[] }) => void;
    onCancel: () => void;
    onAIGenerate?: (brief: string) => Promise<{ name: string; description: string; color: string; fields: CardTypeField[] }>;
  }

  let { open, mode, cardType, isSubmitting = false, onSave, onCancel, onAIGenerate }: Props = $props();

  let name = $state('');
  let description = $state('');
  let color = $state('#3b82f6');
  let fields = $state<CardTypeField[]>([]);

  // Add field dialog states
  let isAddFieldDialogOpen = $state(false);
  let newFieldName = $state('');
  let newFieldType: FieldType = $state('text_input');
  let newFieldOptions = $state('');

  // AI generation dialog states
  let isAIGenerateDialogOpen = $state(false);
  let aiBrief = $state('');
  let isGenerating = $state(false);

  $effect(() => {
    if (open) {
      if (mode === 'edit' && cardType) {
        name = cardType.name;
        description = cardType.description || '';
        color = cardType.color || '#3b82f6';
        fields = [...(cardType.fields || [])];
      } else {
        name = '';
        description = '';
        color = '#3b82f6';
        fields = [];
      }
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

  function handleAddField() {
    if (!newFieldName.trim()) return;

    const options = newFieldType === 'dropdown' ? newFieldOptions.split('\n').map(o => o.trim()).filter(o => o) : [];

    const newField: CardTypeField = {
      id: crypto.randomUUID(),
      name: newFieldName.trim(),
      type: newFieldType,
      order: fields.length,
      config: {
        // Add default config based on type
        ...(newFieldType === 'text_input' && { placeholder: '' }),
        ...(newFieldType === 'number_input' && { min: undefined, max: undefined }),
        ...(newFieldType === 'dropdown' && { options }),
        ...(newFieldType === 'textarea' && { placeholder: '' }),
      }
    };

    fields = [...fields, newField];
    newFieldName = '';
    newFieldType = 'text_input';
    newFieldOptions = '';
    isAddFieldDialogOpen = false;
  }

  function handleRemoveField(fieldId: string) {
    fields = fields.filter(f => f.id !== fieldId);
  }

  function handleSave() {
    if (!name.trim()) return;
    onSave({ name: name.trim(), description: description.trim(), color, fields });
  }

  function handleCancel() {
    onCancel();
  }

  function getDefaultDropdownOptions(fieldName: string): string[] {
    const name = fieldName.toLowerCase();
    if (name.includes('priority') || name.includes('severity')) {
      return ['Low', 'Medium', 'High', 'Critical'];
    }
    if (name.includes('status')) {
      return ['Open', 'In Progress', 'Closed'];
    }
    if (name.includes('type') || name.includes('category')) {
      return ['Type 1', 'Type 2', 'Type 3'];
    }
    // Default options
    return ['Option 1', 'Option 2', 'Option 3'];
  }

  async function handleAIGenerate() {
    if (!aiBrief.trim() || !onAIGenerate) return;

    isGenerating = true;
    try {
      const generatedData = await onAIGenerate(aiBrief.trim());



      // Populate the form with generated data
      name = generatedData.name;
      description = generatedData.description || '';
      color = generatedData.color;
      fields = generatedData.fields.map(field => ({
        ...field,
        id: crypto.randomUUID(),
        order: fields.length + generatedData.fields.indexOf(field),
        config: {
          ...field.config,
          required: false, // AI-generated fields should not be required by default
          // Ensure dropdown fields have options array
          ...(field.type === 'dropdown' && {
            options: field.config?.options || getDefaultDropdownOptions(field.name)
          }),
          // Ensure other field types have proper defaults
          ...(field.type === 'text_input' && {
            placeholder: field.config?.placeholder || ''
          }),
          ...(field.type === 'number_input' && {
            min: field.config?.min,
            max: field.config?.max
          }),
          ...(field.type === 'textarea' && {
            placeholder: field.config?.placeholder || ''
          }),
        }
      }));

      isAIGenerateDialogOpen = false;
      aiBrief = '';
    } catch (error) {
      console.error('Error generating card type with AI:', error);
      // Error handling will be done by the parent component
    } finally {
      isGenerating = false;
    }
  }
</script>

<Dialog bind:open>
  <DialogContent class="max-h-[90vh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle class="flex items-center gap-2">
        {mode === 'add' ? 'Add Card Type' : 'Edit Card Type'}
        {#if mode === 'add'}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onclick={() => isAIGenerateDialogOpen = true}
            disabled={isSubmitting}
            class="ml-auto"
          >
            <Sparkles class="h-4 w-4 mr-2" />
            Generate with AI
          </Button>
        {/if}
      </DialogTitle>
      <DialogDescription>
        {mode === 'add' ? 'Create a new card type with custom fields or generate one with AI.' : 'Update the card type properties.'}
      </DialogDescription>
    </DialogHeader>
    <div class="grid grid-cols-2 gap-4 py-4">
      <div>
        <Label for="name">Name</Label>
        <Input
          id="name"
          bind:value={name}
          placeholder="Card type name"
          required
        />
      </div>
      <div>
        <Label for="color">Color</Label>
        <Input
          id="color"
          type="color"
          bind:value={color}
        />
      </div>
      <div class="col-span-2">
        <Label for="description">Description</Label>
        <Textarea
          id="description"
          bind:value={description}
          placeholder="Optional description"
          rows={3}
        />
      </div>
      <div class="col-span-2">
        <div class="flex justify-between items-center mb-2">
          <Label>Fields</Label>
          <Button type="button" variant="outline" size="sm" onclick={() => isAddFieldDialogOpen = true}>
            Add Field
          </Button>
        </div>
        {#if fields.length === 0}
          <p class="text-sm text-muted-foreground">No custom fields defined.</p>
        {:else}
          <div class="space-y-2">
            {#each fields as field (field.id)}
               <div class="flex items-center justify-between p-2 border rounded">
                 <div class="flex items-center gap-2">
                   <span class="font-medium">{field.name}</span>
                   {#if field.type === 'dropdown'}
                     <Popover>
                        <PopoverTrigger>
                            {@const Icon = getFieldTypeIcon(field.type)}
                            <Badge variant="secondary" class="cursor-pointer hover:opacity-80 flex items-center gap-1">
                              <Icon class="h-3 w-3" />
                              {getFieldTypeLabel(field.type)}
                           </Badge>
                       </PopoverTrigger>
                       <PopoverContent class="w-80">
                         <div class="space-y-2">
                           <Label>Options</Label>
                           <div class="flex flex-wrap gap-1">
                             {#each field.config?.options || [] as option}
                               <Badge variant="outline">{option}</Badge>
                             {/each}
                           </div>
                         </div>
                       </PopoverContent>
                     </Popover>
                    {:else}
                       {@const Icon = getFieldTypeIcon(field.type)}
                       <Badge variant="secondary" class="flex items-center gap-1">
                         <Icon class="h-3 w-3" />
                         {getFieldTypeLabel(field.type)}
                       </Badge>
                    {/if}
                 </div>
                <Button type="button" variant="ghost" size="sm" onclick={() => handleRemoveField(field.id)}>
                  <Trash2 class="h-4 w-4" />
                </Button>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onclick={handleCancel}>
        Cancel
      </Button>
      <Button onclick={handleSave} disabled={isSubmitting || !name.trim()}>
        {#if isSubmitting}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        {/if}
        {mode === 'add' ? 'Create Card Type' : 'Update Card Type'}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>

<!-- Add Field Dialog -->
<Dialog bind:open={isAddFieldDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Add Field</DialogTitle>
      <DialogDescription>
        Add a custom field to this card type.
      </DialogDescription>
    </DialogHeader>
    <div class="space-y-4">
      <div>
        <Label for="field-name">Field Name</Label>
        <Input
          id="field-name"
          bind:value={newFieldName}
          placeholder="e.g., Priority, Category"
          required
        />
      </div>
      <div>
        <Label for="field-type">Field Type</Label>
        <select
          id="field-type"
          bind:value={newFieldType}
          class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="text_input">Text Input</option>
          <option value="number_input">Number Input</option>
          <option value="textarea">Textarea</option>
          <option value="date_input">Date Input</option>
          <option value="checkbox">Checkbox</option>
          <option value="dropdown">Dropdown</option>
        </select>
      </div>
      {#if newFieldType === 'dropdown'}
        <div>
          <Label for="field-options">Options (one per line)</Label>
          <Textarea
            id="field-options"
            bind:value={newFieldOptions}
            placeholder="Option 1\nOption 2\nOption 3"
            rows={3}
          />
        </div>
      {/if}
    </div>
    <DialogFooter>
      <Button variant="outline" onclick={() => { isAddFieldDialogOpen = false; newFieldName = ''; newFieldType = 'text_input'; newFieldOptions = ''; }}>
        Cancel
      </Button>
       <Button onclick={handleAddField} disabled={!newFieldName.trim()}>
         Add Field
       </Button>
     </DialogFooter>
   </DialogContent>
 </Dialog>

<!-- AI Generate Dialog -->
<Dialog bind:open={isAIGenerateDialogOpen}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Generate Card Type with AI</DialogTitle>
      <DialogDescription>
        Describe what kind of card type you want to create. The AI will analyze your existing card types and generate appropriate fields.
      </DialogDescription>
    </DialogHeader>
    <div class="space-y-4">
      <div>
        <Label for="ai-brief">Description</Label>
        <Textarea
          id="ai-brief"
          bind:value={aiBrief}
          placeholder="e.g., A card type for bug reports with fields for severity, priority, and steps to reproduce"
          rows={4}
          required
        />
      </div>
    </div>
    <DialogFooter>
      <Button variant="outline" onclick={() => { isAIGenerateDialogOpen = false; aiBrief = ''; }}>
        Cancel
      </Button>
      <Button onclick={handleAIGenerate} disabled={isGenerating || !aiBrief.trim()}>
        {#if isGenerating}
          <Loader2 class="mr-2 h-4 w-4 animate-spin" />
          Generating...
        {:else}
          <Sparkles class="mr-2 h-4 w-4" />
          Generate
        {/if}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
<script lang="ts">
    import type { CardType } from "$lib/types/types";
    import { Badge } from "$lib/components/ui/badge";
    import { Check, ChevronsUpDown, Type, Hash, Calendar, AlignLeft, CheckSquare, Lock } from "@lucide/svelte";

    export let cardType: CardType;
    export let hasAssignees: boolean = false;

    function getFieldTypeLabel(type: string): string {
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

    function getFieldTypeColor(type: string): string {
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

    function getFieldTypeIcon(type: string) {
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

<div class="flex flex-wrap gap-1 mt-2">
    {#each cardType.fields as field (field.id)}
        {#if field.name !== "title" && field.name !== "description"}
            {#if field.type === "fixed"}
                {@const Icon = getFieldTypeIcon(field.type)}
                <Badge variant="secondary" class="bg-purple-100 text-purple-800 border-purple-200 text-xs flex items-center gap-1">
                    <Icon class="h-3 w-3" />
                    {field.name}: {field.config?.value || "N/A"}

                </Badge>
            {:else}
                {@const Icon = getFieldTypeIcon(field.type)}
                <Badge variant="secondary" class="{field.config?.isDueDate ? 'bg-red-100 text-red-800 border-red-200' : getFieldTypeColor(field.type)} text-xs flex items-center gap-1">
                    <Icon class="h-3 w-3" />
                    {field.name}
                    {#if field.config?.isDueDate}
                        <span class="ml-1 text-xs font-bold">(Due Date)</span>
                    {/if}

                </Badge>
            {/if}
        {/if}
    {/each}
</div>
<script lang="ts">
    import type { CardType } from "$lib/types/types";
    import { Badge } from "$lib/components/ui/badge";

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
</script>

<div class="flex flex-wrap gap-1 mt-2">
    {#each cardType.fields as field (field.id)}
        {#if field.name !== "title" && field.name !== "description"}
            {#if field.type === "fixed"}
                <Badge variant="secondary" class="bg-purple-100 text-purple-800 border-purple-200 text-xs">
                    {field.name}: {field.config?.value || "N/A"}
                    {#if field.config?.required && hasAssignees}
                        <span class="ml-1 text-red-500">*</span>
                    {/if}
                </Badge>
            {:else}
                <Badge variant="secondary" class="{getFieldTypeColor(field.type)} text-xs">
                    {field.name}: {getFieldTypeLabel(field.type)}
                    {#if field.config?.required && hasAssignees}
                        <span class="ml-1 text-red-500">*</span>
                    {/if}
                </Badge>
            {/if}
        {/if}
    {/each}
</div>
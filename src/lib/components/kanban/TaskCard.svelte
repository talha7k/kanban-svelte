<script lang="ts">
    import type { Task, UserProfile, Column, CardType } from "$lib/types/types";
    import {
        Card,
        CardContent,
        CardHeader,
        CardTitle,
        CardFooter,
    } from "$lib/components/ui/card";
    import { Badge } from "$lib/components/ui/badge";
    import {
        Avatar,
        AvatarFallback,
        AvatarImage,
    } from "$lib/components/ui/avatar";
    import { Button } from "$lib/components/ui/button";
    import { Input } from "$lib/components/ui/input";
    import { Textarea } from "$lib/components/ui/textarea";
    import { Label } from "$lib/components/ui/label";
    import {
        Popover,
        PopoverContent,
        PopoverTrigger,
        PopoverClose,
    } from "$lib/components/ui/popover";
    import {
        Edit2,
        Trash2,
        MessageSquare,
        Loader2,
        Clock,
        ArrowRightCircle,
        ArrowLeftCircle,
        Eye,
        Clock as Clock2Icon,
        AlertTriangle,
        AlertCircle,
        ArrowDown,
        Type,
        Hash,
        Calendar,
        AlignLeft,
        CheckSquare,
        Lock,
        ChevronsUpDown,
        Users,
        Flag,
    } from "@lucide/svelte";
    import {
        format,
        differenceInDays,
        isToday,
        isPast,
        isValid,
        parseISO,
    } from "date-fns";
    import { currentUser } from "$lib/stores/auth";

    let {
        task,
        users,
        projectColumns,
        canManageTask,
        cardTypes = [],
        onEdit,
        onDelete,
        onViewDetails,
        onMoveToNextColumn,
        onMoveToPreviousColumn,
        isSubmitting = false,
        onUpdateTask = () => {},
    } = $props();

    let assignees = $derived(
        (task.assigneeUids
            ?.map((uid: string) => users.find((u: UserProfile) => u.id === uid))
            .filter(Boolean) as UserProfile[]) || [],
    );

    function getPriorityBadgeVariant(priority: Task["priority"]) {
        switch (priority) {
            case "HIGH":
                return "destructive";
            case "MEDIUM":
                return "secondary";
            case "LOW":
                return "outline";
            default:
                return "default";
        }
    }

    function getPriorityIcon(priority: Task["priority"]) {
        switch (priority) {
            case "HIGH":
                return AlertTriangle;
            case "MEDIUM":
                return AlertCircle;
            case "LOW":
                return ArrowDown;
            default:
                return null;
        }
    }

    function getPriorityTooltip(priority: Task["priority"]) {
        switch (priority) {
            case "HIGH":
                return "High Priority";
            case "MEDIUM":
                return "Medium Priority";
            case "LOW":
                return "Low Priority";
            default:
                return "No Priority";
        }
    }

    function getDueDateStatus(): {
        text: string;
        colorClass: string;
    } | null {
        if (!task.dueDate) return null;

        const dueDate = parseISO(task.dueDate);
        if (!isValid(dueDate)) return null;

        const now = new Date();
        const dueDateStartOfDay = new Date(
            dueDate.getFullYear(),
            dueDate.getMonth(),
            dueDate.getDate(),
        );
        const nowStartOfDay = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
        );

        const daysDiff = differenceInDays(dueDateStartOfDay, nowStartOfDay);

        if (daysDiff < 0) {
            return {
                text: `Overdue by ${Math.abs(daysDiff)}d`,
                colorClass: "text-red-500 dark:text-red-400",
            };
        } else if (daysDiff === 0) {
            return {
                text: "Due today",
                colorClass: "text-orange-500 dark:text-orange-400",
            };
        } else {
            return {
                text: `${daysDiff}d left`,
                colorClass: "text-green-600 dark:text-green-400",
            };
        }
    }

    let dueDateStatus = $derived(getDueDateStatus());

    let sortedColumns = $derived(
        [...projectColumns].sort((a, b) => a.order - b.order),
    );
    let currentColumnIndex = $derived(
        sortedColumns.findIndex((col) => col.id === task.columnId),
    );
    let hasNextColumn = $derived(
        currentColumnIndex !== -1 &&
            currentColumnIndex < sortedColumns.length - 1,
    );
    let hasPreviousColumn = $derived(
        currentColumnIndex !== -1 && currentColumnIndex > 0,
    );
    let canMoveTask = $derived(
        canManageTask || task.assigneeUids?.includes($currentUser?.uid || ""),
    );

    // Custom fields state
    let fieldValues: Record<string, any> = $state({});
    let isSubmittingFieldUpdate = $state(false);
    let openPopovers = $state(new Map<string, boolean>());

    let selectedCardType = $derived(
        cardTypes.find((ct) => ct.id === task.cardTypeId) || null,
    );

    let priorityField = $derived(() => {
        if (!selectedCardType?.fields) return null;
        return selectedCardType.fields.find((field: any) => {
            const fieldName = field.name.toLowerCase();
            return fieldName.includes('priority') || fieldName.includes('severity');
        }) || null;
    });

    let customPriorityValue = $derived(() => {
        const field = priorityField();
        if (!field) return null;
        return task.fieldValues?.[field.id] || null;
    });

    let effectivePriority = $derived(() => {
        const field = priorityField();
        if (field) {
            const value = customPriorityValue();
            if (!value) return "NONE";
            // Value should already be in the correct enum format (LOW, MEDIUM, HIGH, NONE)
            return value as Task["priority"];
        }
        return task.priority;
    });

    // Update field values when task changes
    $effect(() => {
        if (task) {
            fieldValues = { ...(task.fieldValues || {}) };
            // Initialize popover states
            if (selectedCardType && selectedCardType.fields) {
                for (const field of selectedCardType.fields) {
                    if (!openPopovers.has(field.id)) {
                        openPopovers.set(field.id, false);
                    }
                }
            }
        }
    });

    function getFieldTypeLabel(type: string): string {
        switch (type) {
            case "fixed":
                return "Fixed Value";
            case "dropdown":
                return "Dropdown";
            case "text_input":
                return "Text Input";
            case "number_input":
                return "Number Input";
            case "date_input":
                return "Date Input";
            case "textarea":
                return "Textarea";
            case "checkbox":
                return "Checkbox";
            default:
                return "Unknown";
        }
    }

    function getFieldTypeColor(type: string): string {
        switch (type) {
            case "fixed":
                return "bg-purple-100 text-purple-800 border-purple-200";
            case "dropdown":
                return "bg-blue-100 text-blue-800 border-blue-200";
            case "text_input":
                return "bg-green-100 text-green-800 border-green-200";
            case "number_input":
                return "bg-orange-100 text-orange-800 border-orange-200";
            case "date_input":
                return "bg-red-100 text-red-800 border-red-200";
            case "textarea":
                return "bg-yellow-100 text-yellow-800 border-yellow-200";
            case "checkbox":
                return "bg-indigo-100 text-indigo-800 border-indigo-200";
            default:
                return "bg-gray-100 text-gray-800 border-gray-200";
        }
    }

    function getFieldTypeIcon(type: string) {
        switch (type) {
            case "fixed":
                return Lock;
            case "dropdown":
                return ChevronsUpDown;
            case "text_input":
                return Type;
            case "number_input":
                return Hash;
            case "date_input":
                return Calendar;
            case "textarea":
                return AlignLeft;
            case "checkbox":
                return CheckSquare;
            default:
                return Type;
        }
    }

    function getFieldDisplayValue(field: any, task: Task): string {
        const value = task.fieldValues?.[field.id];
        const fieldName = field.name.toLowerCase();
        const isPriorityField = fieldName.includes('priority') || fieldName.includes('severity');

        if (field.type === "fixed") {
            return field.config?.value || "N/A";
        } else if (field.type === "checkbox") {
            return value ? "Yes" : "No";
        } else if (field.type === "date_input" && value) {
            return format(parseISO(value), "MMM d, yyyy");
        } else if (isPriorityField) {
            // Map priority enum values to display names
            switch (value) {
                case "LOW": return "Low";
                case "MEDIUM": return "Medium";
                case "HIGH": return "High";
                case "NONE": return "None";
                default: return value || "Not set";
            }
        } else {
            return value || "Not set";
        }
    }

    async function handleSaveFieldValues(fieldId: string) {
        if (!onUpdateTask) return;

        isSubmittingFieldUpdate = true;
        try {
            // Send all field values, using null for unset fields
            const fullFieldValues: Record<string, any> = {};
            if (selectedCardType && selectedCardType.fields) {
                for (const field of selectedCardType.fields) {
                    if (
                        field.name !== "title" &&
                        field.name !== "description"
                    ) {
                        fullFieldValues[field.id] =
                            fieldValues[field.id] ?? null;
                    }
                }
            }
            await onUpdateTask(task.id, { fieldValues: fullFieldValues });
            openPopovers.set(fieldId, false);
        } catch (error) {
            console.error("Failed to update custom fields:", error);
        } finally {
            isSubmittingFieldUpdate = false;
        }
    }
</script>

<Card
    class="gap-0 py-2 hover:bg-gradient-to-r hover:from-pink-100 hover:to-purple-100 mb-3 shadow-md hover:shadow-lg transition-shadow duration-200 select-none {isSubmitting
        ? 'opacity-70 cursor-not-allowed'
        : canMoveTask
          ? 'cursor-grab active:cursor-grabbing bg-gradient-to-r from-purple-100 to-white'
          : 'cursor-default'}"
    aria-label="Task: '{task.title}', Priority: '{effectivePriority()}'"
>
    <CardHeader class="py-2 px-4 mb-0 pb-0">
        {#if assignees.length > 0}
            <div class="flex items-center gap-1 mb-2">
                <Users class="h-4 w-4" />
                <div class="flex flex-wrap gap-1">
                    {#each assignees.slice(0, 3) as assignee (assignee.id)}
                        <Badge variant="secondary" class="text-xs">
                            {(() => {
                                const parts = assignee.name.trim().split(/\s+/);
                                if (parts.length === 1) return parts[0];
                                return parts[0] + ' ' + parts[parts.length - 1][0] + '.';
                            })()}
                        </Badge>
                    {/each}
                    {#if assignees.length > 3}
                        <Badge variant="secondary" class="text-xs">
                            +{assignees.length - 3}
                        </Badge>
                    {/if}
                </div>
            </div>
        {/if}
        <div class="flex justify-between items-start">
            <CardTitle
                class="text-base font-semibold leading-tight text-card-foreground"
            >
                {task.title}
            </CardTitle>
            <div class="flex items-center gap-1">
                {#if task.comments && task.comments.length > 0}
                    <div class="pointer-events-auto">
                        <Button
                            variant="ghost"
                            size="sm"
                            class="h-6 px-2 text-blue-400 hover:text-blue-600"
                            onmousedown={(e) => e.stopPropagation()}
                            onclick={(e) => {
                                e.stopPropagation();
                                onViewDetails(task);
                            }}
                            title="View task details"
                        >
                            <MessageSquare class="h-4 w-4 mr-0.5" />
                            {task.comments.length}
                        </Button>
                    </div>
                {/if}
                {#if effectivePriority() !== "NONE"}
                    {@const Icon = getPriorityIcon(effectivePriority())}
                    <Badge
                        variant={getPriorityBadgeVariant(effectivePriority())}
                        class={effectivePriority() === "MEDIUM"
                            ? "bg-accent text-accent-foreground"
                            : ""}
                        title={getPriorityTooltip(effectivePriority())}
                    >
                        <Icon class="h-3 w-3" />
                    </Badge>
                {/if}
            </div>
        </div>
    </CardHeader>
    {#if task.description}
        <CardContent class="px-4 py-3">
            <p class="text-xs text-muted-foreground">
                {task.description}
            </p>
        </CardContent>
    {/if}
    {#if selectedCardType && selectedCardType.fields && selectedCardType.fields.length > 0}
        <CardContent class="px-4 py-1">
            <div class="flex flex-wrap gap-1">
                 {#each selectedCardType.fields as field (field.id)}
                     {#if field.name !== "title" && field.name !== "description" && field.id !== priorityField()?.id}
                        {#if field.type === "fixed"}
                            {@const Icon = getFieldTypeIcon(field.type)}
                            <Badge
                                variant="secondary"
                                class="bg-purple-100 text-purple-800 border-purple-200 text-xs flex items-center gap-1"
                            >
                                <Icon class="h-3 w-3" />
                                {field.name}: {field.config?.value || "N/A"}
                                {#if field.config?.required && task?.assigneeUids?.length}
                                    <span class="ml-1 text-red-500">*</span>
                                {/if}
                            </Badge>
                        {:else}
                            {@const Icon = getFieldTypeIcon(field.type)}
                            <Popover
                                open={openPopovers.get(field.id) ?? false}
                                onOpenChange={(v) =>
                                    openPopovers.set(field.id, v)}
                            >
                                <PopoverTrigger>
                                    <Badge
                                        variant="secondary"
                                        class="{getFieldTypeColor(
                                            field.type,
                                        )} cursor-pointer hover:opacity-80 text-xs flex items-center gap-1"
                                    >
                                        <Icon class="h-3 w-3" />
                                        {field.name}: {getFieldDisplayValue(
                                            field,
                                            task,
                                        )}
                                        {#if field.config?.required && task?.assigneeUids?.length}
                                            <span class="ml-1 text-red-500"
                                                >*</span
                                            >
                                        {/if}
                                        {#if isSubmittingFieldUpdate}
                                            <Loader2
                                                class="ml-1 h-3 w-3 animate-spin"
                                            />
                                        {/if}
                                    </Badge>
                                </PopoverTrigger>
                                <PopoverContent class="w-80">
                                    <div class="space-y-2">
                                        <Label for="field-{field.id}"
                                            >{field.name}</Label
                                        >
                                         {#if field.type === "dropdown" || field.type === "priority"}
                                             <select
                                                 id="field-{field.id}"
                                                 bind:value={
                                                     fieldValues[field.id]
                                                 }
                                                 class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                 required={field.config
                                                     ?.required &&
                                                     task?.assigneeUids?.length}
                                             >
                                                 <option value=""
                                                     >Select {field.name.toLowerCase()}</option
                                                 >
                                                 {#each field.config?.options || [] as option}
                                                     <option value={option}
                                                         >{option}</option
                                                     >
                                                 {/each}
                                             </select>
                                        {:else if field.type === "text_input"}
                                            <Input
                                                id="field-{field.id}"
                                                bind:value={
                                                    fieldValues[field.id]
                                                }
                                                placeholder={field.config
                                                    ?.placeholder || ""}
                                                required={field.config
                                                    ?.required &&
                                                    task?.assigneeUids?.length}
                                            />
                                        {:else if field.type === "number_input"}
                                            <Input
                                                id="field-{field.id}"
                                                type="number"
                                                bind:value={
                                                    fieldValues[field.id]
                                                }
                                                placeholder={field.config
                                                    ?.placeholder || ""}
                                                min={field.config?.min}
                                                max={field.config?.max}
                                                required={field.config
                                                    ?.required &&
                                                    task?.assigneeUids?.length}
                                            />
                                        {:else if field.type === "date_input"}
                                            <Input
                                                id="field-{field.id}"
                                                type="date"
                                                bind:value={
                                                    fieldValues[field.id]
                                                }
                                                required={field.config
                                                    ?.required &&
                                                    task?.assigneeUids?.length}
                                            />
                                        {:else if field.type === "textarea"}
                                            <Textarea
                                                id="field-{field.id}"
                                                bind:value={
                                                    fieldValues[field.id]
                                                }
                                                placeholder={field.config
                                                    ?.placeholder || ""}
                                                required={field.config
                                                    ?.required &&
                                                    task?.assigneeUids?.length}
                                                rows={3}
                                            />
                                        {:else if field.type === "checkbox"}
                                            <div
                                                class="flex items-center space-x-2"
                                            >
                                                <input
                                                    id="field-{field.id}"
                                                    type="checkbox"
                                                    bind:checked={
                                                        fieldValues[field.id]
                                                    }
                                                    class="h-4 w-4 rounded border border-input"
                                                    required={field.config
                                                        ?.required &&
                                                        task?.assigneeUids
                                                            ?.length}
                                                />
                                                <label
                                                    for="field-{field.id}"
                                                    class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                                                >
                                                    {field.config?.label ||
                                                        field.name}
                                                </label>
                                            </div>
                                        {/if}
                                        <div
                                            class="flex justify-end space-x-2 pt-2"
                                        >
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onclick={() => {
                                                    fieldValues = {
                                                        ...(task.fieldValues ||
                                                            {}),
                                                    };
                                                    openPopovers.set(
                                                        field.id,
                                                        false,
                                                    );
                                                }}
                                            >
                                                Reset
                                            </Button>
                                            <PopoverClose>
                                                <Button
                                                    size="sm"
                                                    onclick={() =>
                                                        handleSaveFieldValues(
                                                            field.id,
                                                        )}
                                                    disabled={isSubmittingFieldUpdate}
                                                >
                                                    {#if isSubmittingFieldUpdate}
                                                        <Loader2
                                                            class="mr-2 h-4 w-4 animate-spin"
                                                        />
                                                    {/if}
                                                    Save
                                                </Button>
                                            </PopoverClose>
                                        </div>
                                    </div>
                                </PopoverContent>
                            </Popover>
                        {/if}
                    {/if}
                {/each}
            </div>
        </CardContent>
    {/if}
    <CardFooter class="py-1 px-4 flex flex-col items-start">
        <div class="flex justify-end w-full items-center">
            <div
                class="flex items-center space-x-2 text-xs gap-3 text-muted-foreground mt-1 mr-2"
            >
                {#if dueDateStatus}
                    <span
                        class="flex text-xs font-semibold items-center {dueDateStatus.colorClass}"
                        title="Due: {task.dueDate
                            ? format(parseISO(task.dueDate), 'MMM d, yyyy')
                            : 'N/A'}"
                    >
                        <Clock2Icon class="h-4 w-4 mr-1" />
                        {dueDateStatus.text}
                    </span>
                {/if}
            </div>
        </div>

        <div class="flex space-x-1 w-full justify-end items-center gap-1 mt-0">
            {#if canMoveTask && hasPreviousColumn}
                <Button
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 pointer-events-auto"
                    onclick={(e) => {
                        e.stopPropagation();
                        onMoveToPreviousColumn(task);
                    }}
                    aria-label="Move to previous column"
                    title="Move to previous column"
                    disabled={isSubmitting}
                >
                    {#if isSubmitting}
                        <Loader2 class="h-4 w-4 animate-spin" />
                    {:else}
                        <ArrowLeftCircle class="h-4 w-4" />
                    {/if}
                </Button>
            {/if}
            {#if canMoveTask && hasNextColumn}
                <Button
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 pointer-events-auto"
                    onclick={(e) => {
                        e.stopPropagation();
                        onMoveToNextColumn(task);
                    }}
                    aria-label="Move to next column"
                    title="Move to next column"
                    disabled={isSubmitting}
                >
                    {#if isSubmitting}
                        <Loader2 class="h-4 w-4 animate-spin" />
                    {:else}
                        <ArrowRightCircle class="h-4 w-4" />
                    {/if}
                </Button>
            {/if}
            <Button
                variant="ghost"
                size="icon"
                class="h-7 w-7 pointer-events-auto"
                onclick={(e) => {
                    e.stopPropagation();
                    onViewDetails(task);
                }}
                onmousedown={(e) => e.stopPropagation()}
                aria-label="View task details"
                title="View task details"
                disabled={isSubmitting}
            >
                {#if isSubmitting}
                    <Loader2 class="h-4 w-4 animate-spin" />
                {:else}
                    <Eye class="h-4 w-4" />
                {/if}
            </Button>
            {#if canManageTask}
                <Button
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 pointer-events-auto"
                    onclick={(e) => {
                        e.stopPropagation();
                        onEdit(task);
                    }}
                    onmousedown={(e) => e.stopPropagation()}
                    aria-label="Edit task"
                    title="Edit task"
                    disabled={isSubmitting}
                >
                    {#if isSubmitting}
                        <Loader2 class="h-4 w-4 animate-spin" />
                    {:else}
                        <Edit2 class="h-4 w-4" />
                    {/if}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 hover:bg-destructive/10 hover:text-destructive"
                    onclick={(e) => {
                        e.stopPropagation();
                        onDelete(task.id);
                    }}
                    onmousedown={(e) => e.stopPropagation()}
                    aria-label="Delete task"
                    title="Delete task"
                    disabled={isSubmitting}
                >
                    {#if isSubmitting}
                        <Loader2 class="h-4 w-4 animate-spin" />
                    {:else}
                        <Trash2 class="h-4 w-4" />
                    {/if}
                </Button>
            {/if}
        </div>
    </CardFooter>
</Card>

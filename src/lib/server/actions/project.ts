import { generateProjectTasks } from "$lib/server/ai/flows/generate-project-tasks";
import { addTaskToProject } from "$lib/server/api/firebaseTask";
import { getProjectById } from "$lib/server/api/firebaseProject";
// Assuming Project type includes its tasks, or we need a way to get them.
import type { NewTaskData, Task, Project } from "$lib/types/types";
import {
  generateTaskDetails,
  type GenerateTaskDetailsInput,
  type GenerateTaskDetailsOutput,
} from "$lib/server/ai/flows/generate-task-details";

// Define a type for the generated task data for clarity
type GeneratedTask = Omit<Task, "id" | "createdAt" | "updatedAt">;

/**
 * Generates a list of tasks for a project based on a brief, but does not save them.
 * @returns A promise that resolves to an array of generated task data.
 */
export async function generateTasksAction(
  projectId: string,
  brief: string,
  currentUserUid: string,
  taskCount: number = 3,
): Promise<GeneratedTask[]> {
  try {
    const project = await getProjectById(projectId);

    if (!project) {
      throw new Error(`Project with ID "${projectId}" not found.`);
    }

    const generatedTasks = await generateProjectTasks(brief, taskCount);

    // The default column to add tasks to.
    const defaultColumnId = project.columns[0]?.id || "todo";

    // Map generated data to task objects, setting a preliminary order.
    return generatedTasks.map((taskData, index) => ({
      title: taskData.title,
      description: taskData.description,
      priority: "MEDIUM" as const,
      projectId,
      columnId: defaultColumnId,
      reporterId: currentUserUid,
      // Set a sequential order for the generated batch.
      // This will be adjusted when the tasks are actually added.
      order: index,
      assigneeUids: [],
      dueDate: null,
      tags: [],
    }));
  } catch (error) {
    console.error("Error in generateTasksAction:", error);
    // Provide more specific error context to the client.
    const message =
      error instanceof Error ? error.message : "An unknown error occurred.";
    throw new Error(`Failed to generate AI project tasks: ${message}`);
  }
}

/**
 * Adds a list of approved, pre-generated tasks to a project.
 * @returns A promise that resolves to an object indicating success, count, and the updated project.
 */
export async function addApprovedTasksAction(
  projectId: string,
  tasks: GeneratedTask[],
  currentUserUid: string,
): Promise<{
  success: boolean;
  addedTasksCount?: number;
  updatedProject?: Project;
  error?: string;
}> {
  try {
    // We must fetch the project with its tasks to correctly calculate the order.
    // NOTE: This assumes `getProjectById` also fetches tasks or their order values.
    // If not, a function like `getTasksByColumn` would be needed.
    const project = await getProjectById(projectId);

    if (!project) {
      return {
        success: false,
        error: `Project with ID "${projectId}" not found.`,
      };
    }

    // Determine the starting order for the new tasks.
    // This assumes all tasks in this batch go to the same, first column.
    // A more complex implementation could group tasks by their target `columnId`.
    const targetColumnId = project.columns[0]?.id || "todo";
    const tasksInColumn =
      project.tasks?.filter((t) => t.columnId === targetColumnId) || [];
    const maxOrder = tasksInColumn.reduce(
      (max, task) => Math.max(max, task.order),
      -1,
    );
    let startOrder = maxOrder + 1;

    let addedTasksCount = 0;
    // Sort tasks by their pre-assigned order to ensure they are added sequentially.
    const sortedTasks = tasks.sort((a, b) => a.order - b.order);

    for (const taskData of sortedTasks) {
      try {
        // The new order is the highest existing order plus the task's position in the new batch.
        const newOrder = startOrder + addedTasksCount;

        await addTaskToProject(
          projectId,
          {
            // Pass all properties except those managed by the backend (`id`, `createdAt`, etc.)
            title: taskData.title,
            description: taskData.description,
            priority: taskData.priority,
            reporterId: taskData.reporterId,
            assigneeUids: taskData.assigneeUids,
            dueDate: taskData.dueDate,
            tags: taskData.tags,
            // Pass the correctly calculated order.
            // This requires `addTaskToProject` and `NewTaskData` to support `order`.
            order: newOrder,
          },
          taskData.columnId || targetColumnId,
          currentUserUid,
        );
        addedTasksCount++;
      } catch (error) {
        console.error(`Error adding task "${taskData.title}":`, error);
        // Continue adding other tasks even if one fails.
      }
    }

    // Fetch the updated project to reflect all changes.
    const updatedProject = await getProjectById(projectId);

    return { success: true, addedTasksCount, updatedProject: updatedProject || undefined };
  } catch (error) {
    console.error("Error in addApprovedTasksAction:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return {
      success: false,
      error: `Failed to add tasks to project: ${message}`,
    };
  }
}

/**
 * Generates detailed subtasks and a description for a single task.
 * @returns A promise resolving to an object with the generated details or an error.
 */
export async function generateTaskDetailsAction(
  input: GenerateTaskDetailsInput,
): Promise<{
  success: boolean;
  details?: GenerateTaskDetailsOutput;
  error?: string;
}> {
  try {
    const details = await generateTaskDetails(input);
    return { success: true, details };
  } catch (error) {
    console.error("Error generating AI task details in server action:", error);
    const message =
      error instanceof Error ? error.message : "An unknown error occurred.";
    return {
      success: false,
      error: `Failed to generate task details: ${message}`,
    };
  }
}

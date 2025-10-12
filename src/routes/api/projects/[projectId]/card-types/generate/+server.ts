import { json, error } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { getProjectById } from '$lib/server/api/firebaseProject';
import { generateCardType } from '$lib/server/ai/flows/generate-card-type';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, params }) => {
  try {
    const { projectId } = params;
    const { brief } = await request.json();

    // Authenticate user
    const currentUserUid = await requireAuth({ request } as any);

    // Validate input
    if (!brief || typeof brief !== 'string' || brief.trim().length === 0) {
      throw error(400, 'Brief description is required and must be a non-empty string');
    }

    // Get existing card types to analyze patterns
    const project = await getProjectById(projectId);
    if (!project) {
      throw error(404, 'Project not found');
    }
    const existingCardTypes = project.cardTypes || [];

    // Summarize existing card types for the AI
    const existingCardTypesSummary = existingCardTypes.map(ct => {
      return `Card Type: ${ct.name}
Description: ${ct.description || 'No description'}
Fields: ${ct.fields.map(f => `${f.name} (${f.type})`).join(', ')}`;
    }).join('\n\n');

    const generatedCardType = await generateCardType({
      brief: brief.trim(),
      existingCardTypes: existingCardTypesSummary,
    });

    return json({ success: true, cardType: generatedCardType });
  } catch (err) {
    console.error('Error generating card type:', err);
    const message = err instanceof Error ? err.message : 'Failed to generate card type';
    throw error(500, message);
  }
};
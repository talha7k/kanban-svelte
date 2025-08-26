import { generateTaskDetailsAction } from '$lib/server/actions/project';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  try {
    const input = await request.json();
    
    // Validate input
    if (!input || typeof input !== 'object' || !input.briefInput) {
      return json(
        { success: false, error: 'Invalid input: briefInput is required' },
        { status: 400 }
      );
    }

    const result = await generateTaskDetailsAction(input);
    
    if (result.success) {
      return json(result, { status: 200 });
    } else {
      return json(result, { status: 500 });
    }
  } catch (error) {
    console.error('Error in generate-task-details API:', error);
    return json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Internal server error' 
      },
      { status: 500 }
    );
  }
};
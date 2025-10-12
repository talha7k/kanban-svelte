import { z } from 'genkit';
import { ai } from '$lib/server/ai/genkit';

const GenerateCardTypeInputSchema = z.object({
  brief: z.string().describe('A brief description of what the card type should represent.'),
  existingCardTypes: z.string().describe('A JSON string of existing card types in the project to analyze for patterns.'),
});

export type GenerateCardTypeInput = z.infer<typeof GenerateCardTypeInputSchema>;

const GenerateCardTypeOutputSchema = z.object({
  name: z.string().describe('A concise, descriptive name for the card type.'),
  description: z.string().describe('A detailed description of what this card type represents and when to use it.'),
  color: z.string().describe('A hex color code that represents this card type visually.'),
  fields: z.array(z.object({
    name: z.string().describe('The field name.'),
    type: z.string().describe('The field type (text_input, number_input, textarea, date_input, checkbox, dropdown, fixed).'),
    config: z.object({
      required: z.boolean().optional().describe('Whether this field is required.'),
      placeholder: z.string().optional().describe('Placeholder text for input fields.'),
      options: z.array(z.string()).optional().describe('Options for dropdown fields.'),
      min: z.number().optional().describe('Minimum value for number inputs.'),
      max: z.number().optional().describe('Maximum value for number inputs.'),
    }).optional(),
  })).describe('An array of fields that should be included in this card type.'),
});

export type GenerateCardTypeOutput = z.infer<typeof GenerateCardTypeOutputSchema>;

const prompt = ai.definePrompt({
  name: 'generateCardTypePrompt',
  input: { schema: GenerateCardTypeInputSchema },
  output: { schema: GenerateCardTypeOutputSchema },
  prompt: `You are an AI assistant that helps create card types for project management tools. Based on the user's brief description, generate a new card type with appropriate fields.

For the new card type based on this brief: "{{{brief}}}"

Existing card types in the project: {{{existingCardTypes}}}

Generate:
1. A clear, concise name for the card type
2. A detailed description explaining its purpose
3. An appropriate color (hex code) that visually represents the card type
4. Relevant fields that would be useful for this type of card

Consider these field types:
- text_input: For short text entries
- number_input: For numeric values
- textarea: For longer text content
- date_input: For dates
- checkbox: For boolean values
- dropdown: For selecting from predefined options

Make sure fields are practical and commonly needed for the described card type.`,
});

export async function generateCardType(input: GenerateCardTypeInput): Promise<GenerateCardTypeOutput> {
  try {
    const { output } = await prompt(input);
    return output!;
  } catch (error) {
    console.error('Error in generateCardType:', error);
    throw error;
  }
}
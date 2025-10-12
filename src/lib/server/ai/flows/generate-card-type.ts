import { z } from 'genkit';
import { ai } from '$lib/server/ai/genkit';

const GenerateCardTypeInputSchema = z.object({
  brief: z.string().describe('A brief description of what the card type should represent.'),
  existingCardTypes: z.string().describe('A summary of existing card types in the project to analyze for patterns.'),
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
       required: z.boolean().optional().describe('Whether this field is required (should generally be false for AI-generated fields).'),
       placeholder: z.string().optional().describe('Placeholder text for input fields.'),
       value: z.any().optional().describe('Fixed value for fixed-type fields.'),
       options: z.array(z.string()).optional().describe('Options for dropdown fields (required when type is dropdown).'),
       multiple: z.boolean().optional().describe('Whether dropdown allows multiple selections.'),
       min: z.number().optional().describe('Minimum value for number inputs.'),
       max: z.number().optional().describe('Maximum value for number inputs.'),
       pattern: z.string().optional().describe('Regex pattern for text input validation.'),
       minLength: z.number().optional().describe('Minimum length for text inputs.'),
       maxLength: z.number().optional().describe('Maximum length for text inputs.'),
       isDueDate: z.boolean().optional().describe('Whether this date_input field should be used as the due date field (only one per card type).'),
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

Consider these field types and their configuration options:
- text_input: For short text entries (can use minLength, maxLength, pattern for validation)
- number_input: For numeric values (can use min, max for range validation)
- textarea: For longer text content (can use minLength, maxLength for validation)
- date_input: For dates (can be marked as due date with config.isDueDate: true)
- checkbox: For boolean values
- dropdown: For selecting from predefined options (when using dropdown, always provide relevant options in the config.options array, can use multiple: true for multi-select)
- fixed: For fields with a fixed value (must include config.value)

IMPORTANT: For dropdown fields, you MUST include a config object with an options array containing 3-5 relevant options for that field type.

For date_input fields that represent due dates, set config.isDueDate: true. Only one field per card type should have this flag.

For fixed fields, you MUST include a config.value with the fixed value to display.

Example of a dropdown field:
{
  "name": "Priority",
  "type": "dropdown",
  "config": {
    "options": ["Low", "Medium", "High", "Critical"]
  }
}

Example of a due date field:
{
  "name": "Due Date",
  "type": "date_input",
  "config": {
    "isDueDate": true
  }
}

Example of a fixed field:
{
  "name": "Category",
  "type": "fixed",
  "config": {
    "value": "Bug Report"
  }
}

Make sure fields are practical and commonly needed for the described card type. Include due date fields when the card type involves time-sensitive tasks or deadlines.

IMPORTANT: Do NOT mark any fields as required (do not set config.required: true). Let users decide which fields should be mandatory after creating the card type.`,
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
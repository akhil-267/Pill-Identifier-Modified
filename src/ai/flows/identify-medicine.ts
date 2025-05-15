
'use server';
/**
 * @fileOverview Identifies a medicine from an image and provides its uses.
 *
 * - identifyMedicine - A function that handles the medicine identification process.
 * - IdentifyMedicineInput - The input type for the identifyMedicine function.
 * - IdentifyMedicineOutput - The return type for the identifyMedicine function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const IdentifyMedicineInputSchema = z.object({
  photoDataUri: z
    .string()
    .describe(
      "A photo of a tablet sheet, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
  language: z.string().describe('The language in which to provide the medicine uses.'),
});
export type IdentifyMedicineInput = z.infer<typeof IdentifyMedicineInputSchema>;

const IdentifyMedicineOutputSchema = z.object({
  isIdentified: z.boolean().describe('True if a medicine was successfully identified from the image, false otherwise.'),
  medicineName: z.string().describe('The name of the identified medicine. If not identified, this will contain an explanatory message like "No medicine identified" or "Image does not appear to be a medicine."'),
  uses: z.string().describe('The uses of the identified medicine in the specified language. This will be empty if no medicine is identified or if the image is invalid.'),
});
export type IdentifyMedicineOutput = z.infer<typeof IdentifyMedicineOutputSchema>;

export async function identifyMedicine(input: IdentifyMedicineInput): Promise<IdentifyMedicineOutput> {
  try {
    const result = await identifyMedicineFlow(input);
    // Ensure that if isIdentified is false, uses is empty.
    if (result && result.isIdentified === false) {
      result.uses = "";
    }
    return result;
  } catch (error: any) {
    console.error('Error in identifyMedicine flow execution:', error);
    let errorMessage = 'An unexpected error occurred during medicine identification.';
    if (error.message?.includes('API_KEY_INVALID') || error.details?.includes('API_KEY_INVALID')) {
      errorMessage = 'AI service error: The API key is invalid. Please check your GEMINI_API_KEY environment variable and Google Cloud project settings.';
       throw new Error(errorMessage);
    } else if (error.status === 'FAILED_PRECONDITION' && (error.message?.includes('GEMINI_API_KEY') || error.message?.includes('GOOGLE_API_KEY'))) {
       errorMessage = 'AI service error: API key is missing or not configured correctly. Please set the GEMINI_API_KEY environment variable.';
       throw new Error(errorMessage);
    }
    // For other errors, rethrow them or handle as needed
    throw error;
  }
}

const prompt = ai.definePrompt({
  name: 'identifyMedicinePrompt',
  input: {schema: IdentifyMedicineInputSchema},
  output: {schema: IdentifyMedicineOutputSchema},
  prompt: `You are an expert pharmacist. You will identify the medicine from the image and provide its uses in the specified language.

The user will upload a picture of the medicine.
- If you can clearly identify a medicine in the image:
  - Set 'isIdentified' to true.
  - Set 'medicineName' to the name of the identified medicine.
  - Provide the 'uses' of the medicine in the following language: {{{language}}}.
- If you cannot identify a medicine, or if the image does not appear to show a medicine, or if the image is of poor quality:
  - Set 'isIdentified' to false.
  - Set 'medicineName' to a concise explanation (e.g., "No medicine identified due to poor image quality", "Image does not appear to be a medicine", "Could not identify medicine").
  - Set 'uses' to an empty string.

Image: {{media url=photoDataUri}}
Language: {{{language}}}
  `,
});

const identifyMedicineFlow = ai.defineFlow(
  {
    name: 'identifyMedicineFlow',
    inputSchema: IdentifyMedicineInputSchema,
    outputSchema: IdentifyMedicineOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    if (output && output.isIdentified === false) {
      output.uses = ""; // Ensure uses is empty if not identified
    }
    return output!;
  }
);

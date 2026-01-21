'use server';

/**
 * @fileOverview A tool for branch managers to analyze repayment histories and external events to generate recommendations for managing repayments.
 *
 * - generateDueDateRecommendations - A function that generates recommendations based on repayment history and external events.
 * - DueDateMonitoringInput - The input type for the generateDueDateRecommendations function.
 * - DueDateMonitoringOutput - The return type for the generateDueDateRecommendations function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DueDateMonitoringInputSchema = z.object({
  repaymentHistory: z
    .string()
    .describe('A detailed history of repayments, including dates, amounts, and any issues encountered.'),
  externalEvents: z
    .string()
    .describe(
      'Information about relevant external events (world or local) that might impact repayments, such as economic downturns or natural disasters.'
    ),
  upcomingSchedule: z
    .string()
    .describe('Details on upcoming payment schedules'),
  overdueSchedule: z
    .string()
    .describe('Details on overdue payment schedules'),
  currentSchedule: z
    .string()
    .describe('Details on current payment schedules'),
});
export type DueDateMonitoringInput = z.infer<typeof DueDateMonitoringInputSchema>;

const DueDateMonitoringOutputSchema = z.object({
  recommendations: z
    .string()
    .describe(
      'A list of recommendations for managing repayments, based on the analysis of repayment history and external events.'
    ),
  riskAssessment: z.string().describe('An assessment of the risk level associated with upcoming repayments.'),
});
export type DueDateMonitoringOutput = z.infer<typeof DueDateMonitoringOutputSchema>;

export async function generateDueDateRecommendations(
  input: DueDateMonitoringInput
): Promise<DueDateMonitoringOutput> {
  return dueDateMonitoringFlow(input);
}

const dueDateMonitoringPrompt = ai.definePrompt({
  name: 'dueDateMonitoringPrompt',
  input: {schema: DueDateMonitoringInputSchema},
  output: {schema: DueDateMonitoringOutputSchema},
  prompt: `You are an AI assistant helping branch managers in microfinance lending operations.

  Analyze the provided repayment history, information about external events, and repayment schedules to generate actionable recommendations for managing repayments proactively.
  Provide a risk assessment level (high, medium, low).

  Repayment History: {{{repaymentHistory}}}
  External Events: {{{externalEvents}}}
  Upcoming Schedule: {{{upcomingSchedule}}}
  Overdue Schedule: {{{overdueSchedule}}}
  Current Schedule: {{{currentSchedule}}}

  Based on the above information, provide specific recommendations to the branch manager to take action on repayments, and a risk assessment.
  Include the risk assessment and recommendations in the output.`,
});

const dueDateMonitoringFlow = ai.defineFlow(
  {
    name: 'dueDateMonitoringFlow',
    inputSchema: DueDateMonitoringInputSchema,
    outputSchema: DueDateMonitoringOutputSchema,
  },
  async input => {
    const {output} = await dueDateMonitoringPrompt(input);
    return output!;
  }
); 
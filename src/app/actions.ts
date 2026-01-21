'use server';

import {
  generateDueDateRecommendations,
  DueDateMonitoringInput,
} from '@/ai/flows/due-date-monitoring-tool';
import { z } from 'zod';

const DueDateMonitoringInputSchema = z.object({
  repaymentHistory: z.string().min(1, 'Repayment history is required.'),
  externalEvents: z.string().min(1, 'External events information is required.'),
  upcomingSchedule: z.string().min(1, 'Upcoming schedule is required.'),
  overdueSchedule: z.string().min(1, 'Overdue schedule is required.'),
  currentSchedule: z.string().min(1, 'Current schedule is required.'),
});

type FormState = {
  recommendations: string;
  riskAssessment: string;
  error: string | null;
};

export async function generateDueDateRecommendationsAction(
  prevState: FormState,
  formData: FormData
): Promise<FormState> {
  const validatedFields = DueDateMonitoringInputSchema.safeParse({
    repaymentHistory: formData.get('repaymentHistory'),
    externalEvents: formData.get('externalEvents'),
    upcomingSchedule: formData.get('upcomingSchedule'),
    overdueSchedule: formData.get('overdueSchedule'),
    currentSchedule: formData.get('currentSchedule'),
  });

  if (!validatedFields.success) {
    return {
      recommendations: '',
      riskAssessment: '',
      error: 'All fields are required. Please provide the necessary information.',
    };
  }

  try {
    const result = await generateDueDateRecommendations(validatedFields.data);
    return {
      ...result,
      error: null,
    };
  } catch (error) {
    console.error('Error generating recommendations:', error);
    return {
      recommendations: '',
      riskAssessment: '',
      error: 'An unexpected error occurred. Please try again later.',
    };
  }
}

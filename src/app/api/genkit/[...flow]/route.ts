import createNextApi from '@genkit-ai/next';
import { ai } from '@/ai/genkit';
import '@/ai/flows/due-date-monitoring-tool';

export const dynamic = 'force-dynamic';

const handler = createNextApi(ai as any);
export { handler as GET, handler as POST };

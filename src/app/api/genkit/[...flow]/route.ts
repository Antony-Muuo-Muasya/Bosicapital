import { createApi } from '@genkit-ai/next';
import { ai } from '@/ai/genkit';

// This import is crucial for Next.js to discover and register your flows.
// Make sure to import all files that define flows.
import '@/ai/flows/due-date-monitoring-tool';

export const { GET, POST } = createApi({
  ai,
});

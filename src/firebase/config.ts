import type { FirebaseOptions } from 'firebase/app';

// This file is intentionally left with a mostly empty config object.
// The configuration is now constructed at runtime on the client-side
// in src/firebase/index.ts to ensure environment variables are loaded correctly
// in all environments (local, preview, production).

const firebaseConfig: FirebaseOptions = {};

export { firebaseConfig };

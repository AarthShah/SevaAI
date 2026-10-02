import { defineBackend } from '@aws-amplify/backend';

// Amplify owns its deployment configuration only. CivicSeva's application API,
// PostgreSQL database, authentication, and AI workflows remain in FastAPI.
export const backend = defineBackend({});

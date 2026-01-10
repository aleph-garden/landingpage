import { z } from 'zod';

/**
 * Configuration schema for Solid Pod connection
 */
export const ConfigSchema = z.object({
  podUrl: z.string().url(),
  webId: z.string().url(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
  oidcIssuer: z.string().url().default('https://solidcommunity.net'),
});

export type Config = z.infer<typeof ConfigSchema>;

import { z } from 'zod';

export const PluginConfigurationSchema = z.object({
  keepOutputDirectory: z.boolean().optional(),
  zipConcurrency: z.number().optional(),
  stats: z.boolean().optional(),
  config: z.string().optional().nullable(),
  // [START] Rspack influenced - Ignored if config file is provided
  esm: z.boolean().optional(),
  mode: z.enum(['production', 'development', 'none']).optional(),
  // [END] Rspack influenced - Ignored if config file is provided
});

export type PluginConfiguration = z.infer<typeof PluginConfigurationSchema>;

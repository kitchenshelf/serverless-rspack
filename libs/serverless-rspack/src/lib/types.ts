import Serverless from 'serverless';
import { z } from 'zod';

export const PluginOptionsSchema = z.object({
  keepOutputDirectory: z.boolean().optional(),
  zipConcurrency: z.number().optional(),
  stats: z.boolean().optional(),
  config: z.string().optional().nullable(),
  // [START] Rspack influenced - Ignored if config file is provided
  esm: z.boolean().optional(),
  mode: z.enum(['production', 'development', 'none']).optional(),
  tsConfigPath: z.string().optional().nullable(),
  externals: z.array(z.string()).optional().nullable(),
  // [END] Rspack influenced - Ignored if config file is provided
});

export type PluginOptions = z.infer<typeof PluginOptionsSchema>;

export type RsPackFunctionDefinitionHandler = {
  rspack?: boolean;
} & Serverless.FunctionDefinitionHandler;

import Serverless from 'serverless';
import { z } from 'zod';

export const PluginOptionsSchema = z.object({
  keepOutputDirectory: z.boolean().optional().default(false),
  zipConcurrency: z.number().optional().default(Infinity),
  stats: z.boolean().optional().default(false),
  config: z
    .object({
      path: z.string().optional(),
      strategy: z.enum(['override', 'combine']).default('override'),
    })
    .optional()
    .nullable(),
  // [START] Rspack influenced - Ignored if config file is provided with `override` strategy
  esm: z.boolean().optional().default(false),
  mode: z
    .enum(['production', 'development', 'none'])
    .optional()
    .default('production'),
  tsConfig: z.string().optional().nullable(),
  externals: z.array(z.string()).optional().nullable(),
  // [END] Rspack influenced - Ignored if config file is provided with `override` strategy
});

export type PluginOptions = z.infer<typeof PluginOptionsSchema>;

export type RsPackFunctionDefinitionHandler = {
  rspack?: boolean;
} & Serverless.FunctionDefinitionHandler;

import Serverless from 'serverless';
import { z } from 'zod';

const SourceMapOptions = [
  'eval',
  'cheap-source-map',
  'cheap-module-source-map',
  'source-map',
  'inline-cheap-source-map',
  'inline-cheap-module-source-map',
  'inline-source-map',
  'inline-nosources-cheap-source-map',
  'inline-nosources-cheap-module-source-map',
  'inline-nosources-source-map',
  'nosources-cheap-source-map',
  'nosources-cheap-module-source-map',
  'nosources-source-map',
  'hidden-nosources-cheap-source-map',
  'hidden-nosources-cheap-module-source-map',
  'hidden-nosources-source-map',
  'hidden-cheap-source-map',
  'hidden-cheap-module-source-map',
  'hidden-source-map',
  'eval-cheap-source-map',
  'eval-cheap-module-source-map',
  'eval-source-map',
  'eval-nosources-cheap-source-map',
  'eval-nosources-cheap-module-source-map',
  'eval-nosources-source-map',
] as const;

export const PluginOptionsSchema = z.object({
  keepOutputDirectory: z.boolean().optional().default(false),
  zipConcurrency: z.number().optional().default(Infinity),
  stats: z.boolean().optional().default(false),
  doctor: z
    .union([
      z.boolean(),
      z
        .object({
          enable: z.boolean().optional().default(true),
          outputDirectory: z.string().optional().nullable(),
        })
        .optional()
        .nullable(),
    ])
    .optional()
    .nullable(),
  config: z
    .object({
      path: z.string().optional(),
      strategy: z.enum(['override', 'combine']).default('override'),
    })
    .optional()
    .nullable(),
  scripts: z.array(z.string()).optional().nullable(),
  // [START] Rspack influenced - Ignored if config file is provided with `override` strategy
  esm: z.boolean().optional().default(false),
  mode: z
    .enum(['production', 'development', 'none'])
    .optional()
    .default('production'),
  sourcemap: z.union([z.literal(false), z.enum(SourceMapOptions)]).optional(),
  tsConfig: z.string().optional().nullable(),
  externals: z.array(z.string()).optional().nullable(),
  // [END] Rspack influenced - Ignored if config file is provided with `override` strategy
});

export type PluginOptions = z.infer<typeof PluginOptionsSchema>;

export type RsPackFunctionDefinitionHandler = {
  rspack?: RsPackFunctionDefinition | boolean;
} & Serverless.FunctionDefinitionHandler;

type RsPackFunctionDefinition = {
  enable?: boolean;
  scripts?: string[];
};

export function isInvokeOptions(
  options: Serverless.Options
): options is Serverless.Options & { function: string } {
  return typeof options.function === 'string';
}

export function isDeployFunctionOptions(
  options: Serverless.Options
): options is Serverless.Options & { function: string } {
  return typeof options.function === 'string';
}

export type PluginFunctionEntries = {
  [name: string]: {
    import: string;
    filename: string;
  };
};

export type PluginFunctionScripts = {
  [name: string]: string[];
};

import { RspackOptions } from "@rspack/core";

export interface Configuration extends RspackOptions {
  packagePath: string;

  keepOutputDirectory?: boolean;
  outputWorkFolder?: string;
  outputBuildFolder?: string;

  skipBuild?: boolean;
  esm?: boolean;
}

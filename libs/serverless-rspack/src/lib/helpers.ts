import type { FunctionDefinitionHandler } from 'serverless';

export const humanSize = (size: number) => {
  if (size === 0) {
    return '0.00 B';
  }
  if (size >= Number.MAX_SAFE_INTEGER) {
    return 'MSI';
  }
  const exponent = Math.floor(Math.log(size) / Math.log(1024));
  const sanitized = (size / 1024 ** exponent).toFixed(2);

  return `${sanitized} ${['B', 'KB', 'MB', 'GB', 'TB'][exponent]}`;
};

/**
 * Checks if the runtime for the given function is nodejs.
 * If the runtime is not set , checks the global runtime.
 * @param {FunctionDefinitionHandler} func the function to be checked
 * @returns {boolean} true if the function/global runtime is nodejs; false, otherwise
 */
export function isNodeFunction(
  func: FunctionDefinitionHandler,
  providerRuntime: string | undefined
): boolean {
  const runtime = (func.runtime || providerRuntime) ?? '';

  return typeof runtime === 'string' && runtime.startsWith('node');
}

export function determineFileParts(handlerFile: string) {
  const regex = /^(.*)\/([^/]+)$/;
  const result = regex.exec(handlerFile);

  const filePath = result?.[1] ?? '';
  const fileName = result?.[2] ?? handlerFile;
  return { filePath, fileName };
}

export function enabledViaSimpleConfig(field: unknown): field is boolean {
  return typeof field === 'boolean' && field === true;
}

export function enabledViaConfigObject<T extends { enable?: boolean }>(
  field: T
): field is T {
  return (
    typeof field === 'object' &&
    field !== null &&
    (field.enable === true || field.enable === undefined)
  );
}

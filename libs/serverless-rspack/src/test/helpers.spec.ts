import type { FunctionDefinitionHandler } from 'serverless';
import {
  determineFileParts,
  humanSize,
  isNodeFunction,
} from '../lib/helpers.js';

describe('humanSize', () => {
  it('formats different size ranges correctly', () => {
    expect(humanSize(512)).toBe('512.00 B');
    expect(humanSize(1024)).toBe('1.00 KB');
    expect(humanSize(1024 * 1024)).toBe('1.00 MB');
    expect(humanSize(1024 * 1024 * 1024)).toBe('1.00 GB');
    expect(humanSize(1024 * 1024 * 1024 * 1024)).toBe('1.00 TB');
  });

  it('handles edge cases', () => {
    expect(humanSize(0)).toBe('0.00 B');
    expect(humanSize(1)).toBe('1.00 B');
    expect(humanSize(Number.MAX_SAFE_INTEGER)).toBe('MSI');
  });
});

describe('isNodeFunction', () => {
  const baseFunc = {
    handler: 'handler.js',
  } as FunctionDefinitionHandler;

  it('detects nodejs runtime from function', () => {
    expect(
      isNodeFunction({ ...baseFunc, runtime: 'nodejs18.x' }, undefined)
    ).toBe(true);
    expect(
      isNodeFunction({ ...baseFunc, runtime: 'nodejs16.x' }, undefined)
    ).toBe(true);
    expect(
      isNodeFunction({ ...baseFunc, runtime: 'python3.9' }, undefined)
    ).toBe(false);
  });

  it('falls back to provider runtime', () => {
    expect(isNodeFunction(baseFunc, 'nodejs18.x')).toBe(true);
    expect(isNodeFunction(baseFunc, 'python3.9')).toBe(false);
  });

  it('handles edge cases', () => {
    expect(isNodeFunction(baseFunc, undefined)).toBe(false);
    expect(isNodeFunction({ ...baseFunc, runtime: '' }, undefined)).toBe(false);
    expect(isNodeFunction({ ...baseFunc, runtime: undefined }, undefined)).toBe(
      false
    );
  });
});

describe('determineFileParts', () => {
  it('splits path and filename correctly', () => {
    expect(determineFileParts('src/handler.js')).toEqual({
      fileName: 'handler.js',
      filePath: 'src',
    });
    expect(determineFileParts('deep/nested/path/file.js')).toEqual({
      fileName: 'file.js',
      filePath: 'deep/nested/path',
    });
  });

  it('handles files in root directory', () => {
    expect(determineFileParts('handler.js')).toEqual({
      fileName: 'handler.js',
      filePath: '',
    });
  });

  it('handles edge cases', () => {
    expect(determineFileParts('./handler.js')).toEqual({
      fileName: 'handler.js',
      filePath: '.',
    });
  });
});

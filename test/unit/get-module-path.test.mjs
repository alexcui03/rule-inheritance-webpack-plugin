/**
 * @license
 * Copyright 2026 Simon Shiki
 * SPDX-License-Identifier: MIT
 */

import path from 'node:path';

import RuleInheritancePlugin from '../../index';

const SAMPLE_PACKAGE_PATH = path.resolve(import.meta.dirname, '../fixtures/sample-package');
const SAMPLE_LOADER_PATH = path.resolve(import.meta.dirname, '../fixtures/sample-loader/index.js');

describe('getModulePath', () => {
  test('resolves a module path from a CommonJS package under ESM', () => {
    const plugin = new RuleInheritancePlugin();

    expect(() => plugin.getModulePath('sample-loader', SAMPLE_PACKAGE_PATH)).not.toThrow();
    expect(plugin.getModulePath('sample-loader', SAMPLE_PACKAGE_PATH)).toBe(SAMPLE_LOADER_PATH);
  });
});

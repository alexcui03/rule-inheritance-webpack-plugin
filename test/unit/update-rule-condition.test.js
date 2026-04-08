/**
 * @license
 * Copyright 2026 Alex Cui
 * SPDX-License-Identifier: MIT
 */

const RuleInheritancePlugin = require('../../index');

const TEST_PACKAGE_PATH = 'test-package';

describe('updateRuleCondition', () => {
  beforeAll(() => {
    const plugin = new RuleInheritancePlugin();
    this.plugin = plugin;
  });

  test('no include field', () => {
    const rule = this.plugin.updateRuleCondition({}, TEST_PACKAGE_PATH);

    expect(rule).toStrictEqual({
      include: [TEST_PACKAGE_PATH]
    });
  });

  test('{ include: [...] } (Array)', () => {
    const rule = this.plugin.updateRuleCondition({
      include: ['a', 'b']
    }, TEST_PACKAGE_PATH);

    expect(rule).toStrictEqual({
      include: {
        and: [TEST_PACKAGE_PATH, ['a', 'b']]
      }
    });
  });

  test('{ include: {...} } (Object)', () => {
    const rule = this.plugin.updateRuleCondition({
      include: {
        and: ['a', 'b'],
        or: ['c'],
        not: ['d']
      }
    }, TEST_PACKAGE_PATH);

    expect(rule).toStrictEqual({
      include: {
        and: [
          TEST_PACKAGE_PATH,
          {
            and: ['a', 'b'],
            or: ['c'],
            not: ['d']
          }
        ]
      }
    });
  });
});

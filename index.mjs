import RuleInheritancePlugin from './index';
import { resolve } from 'import-meta-resolve';
import { join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

class ESMRuleInheritancePlugin extends RuleInheritancePlugin {
  /**
   * Get module real path that required from specific package.
   * @override
   * @param {string} name Module name.
   * @param {string} packagePath Path to apply the require.
   * @returns {string} Path of module.
   */
  getModulePath(name, packagePath) {
    const targetPath = join(packagePath, 'package.json');
    const fileUrlString = pathToFileURL(targetPath).toString();
    return fileURLToPath(resolve(name, fileUrlString));
  }
}

export default ESMRuleInheritancePlugin;

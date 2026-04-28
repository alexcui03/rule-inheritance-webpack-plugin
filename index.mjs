import { RuleInheritancePlugin as CJSPlugin } from './index';
import { resolve } from 'import-meta-resolve';
import { pathToFileURL, fileURLToPath, join } from 'path';

class RuleInheritancePlugin extends CJSPlugin {
  /**
   * Get module real path that required from specific package.
   * @override ESM may have different entry
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

export default RuleInheritancePlugin;

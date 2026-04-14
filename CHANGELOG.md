# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Changed

- Try to find the webpack config whose entry's output path matches the path exported from the package. It will choose the first webpack config by default if multiple configs are exported.

## [0.4.0] - 2026-04-08

### Added

- Add 'callbacks' option to add callback functions to process loader options.
- Add 'ignoreBuiltinCallbacks' option to ignore default callbacks for loader options processing.
- Add default callback for 'ts-loader' to set correct config path by default.

### Changed

- Package existence will be checked before checking webpack.config.js.
- Log info instead of an error when package is skipped.

## [0.3.0] - 2026-04-04

### Added

- Subpackage that includes RuleInheritancePlugin will be processed recursively.
- Add option to control whether rules should be inherited recursively.

### Changed

- Inherited rules will be placed before original rules.

## [0.2.0] - 2026-03-23

### Added

- Add include condition to inherited rules.
- Modify use/loader fields to get correct module path.

### Changed

- Change hook and logger name.

## [0.1.0] - 2026-03-23

### Added

- Basic implementation.

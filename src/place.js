'use strict';

/**
 * src/place.js — Placement module
 *
 * Copies the rea-tools source content (commands, agents, the core reference
 * trio, and the `.rea/` typed-memory scaffold) from the rea-tools package
 * root into a target host project, per a per-tool layout table, and records
 * every written path in the ownership manifest (src/manifest.js).
 *
 * This module is pure file IO (Node built-ins only). It has no content
 * authoring logic ("CLI is dumb, Claude is smart") — it only places files
 * that already exist in `sourceRoot`.
 *
 * Layout is DATA: LAYOUT maps a tool name (e.g. 'claude') to a list of flat
 * source-dir -> host-dest-dir copies (with an optional per-dir exclude
 * list), plus the `.rea/` scaffold source/dest dirs. Adding a new host tool
 * is a data addition to LAYOUT, not new copy logic.
 *
 * Exported API:
 *   LAYOUT                                    - the per-tool layout table (data)
 *   place(sourceRoot, targetRoot, manifest, [tool='claude'])
 *                                              - copies every file per LAYOUT[tool], creating
 *                                                parent dirs, excluding per-dir exclusions, and
 *                                                placing the `.rea/` typed scaffold (only adding
 *                                                the README where a typed dir is missing/empty —
 *                                                never touching an already-populated dir). Records
 *                                                every written path in `manifest` (mutated) via
 *                                                manifest.recordOwned. Throws on an unknown tool.
 *                                                Returns the mutated manifest.
 */

const fs = require('node:fs');
const path = require('node:path');

const manifest = require('./manifest.js');

/**
 * Per-tool host layout, as data. Each `dirs` entry is a flat (non-recursive)
 * source-dir -> host-dest-dir copy; `exclude` names are skipped. The
 * `.rea/` scaffold is handled separately (`reaScaffoldSrcDir`/`reaScaffoldDestDir`)
 * because it has "only add what's missing" semantics rather than a plain copy.
 */
const LAYOUT = {
  claude: {
    dirs: [
      { srcDir: 'templates/commands', destDir: '.claude/commands', exclude: ['README.md'] },
      {
        srcDir: 'templates/agents',
        destDir: '.claude/agents',
        exclude: ['skill-writer.md', 'README.md'],
      },
      { srcDir: 'core', destDir: 'core', exclude: ['README.md'] },
    ],
    reaScaffoldSrcDir: 'templates/.rea',
    reaScaffoldDestDir: '.rea',
  },
};

/**
 * Copies every file (non-recursive) directly inside `sourceDirAbs` to
 * `destDirAbs`, skipping names in `exclude`, creating parent dirs as
 * needed, and recording each destination path (relative to `targetRoot`)
 * in `manifestObj`.
 */
function copyFlatDir(sourceDirAbs, destDirAbs, exclude, targetRoot, manifestObj) {
  const entries = fs.readdirSync(sourceDirAbs, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isFile() || exclude.includes(entry.name)) {
      continue;
    }
    const srcPath = path.join(sourceDirAbs, entry.name);
    const destPath = path.join(destDirAbs, entry.name);
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    // When sourceRoot === targetRoot (e.g. running the installer from a dev
    // checkout against itself — the dogfood scenario), a LAYOUT entry like
    // core -> core resolves srcPath and destPath to the SAME file.
    // fs.copyFileSync() with equal source/dest can truncate or throw, so
    // skip the physical copy in that case — but the file IS still owned
    // (it is exactly the content this run would have placed), so it must
    // still be recorded in the manifest.
    if (path.resolve(srcPath) !== path.resolve(destPath)) {
      fs.copyFileSync(srcPath, destPath);
    }
    manifest.recordOwned(manifestObj, manifest.normalizeRelPath(destPath, targetRoot));
  }
}

/**
 * Places the `.rea/` typed-memory scaffold: for each typed subdir under
 * `templates/.rea/` (e.g. knowledge/decisions/sessions/plans), copies its
 * README.md into the matching host `.rea/<type>/` dir — but only when that
 * host dir is missing or empty. An already-populated typed dir is left
 * completely untouched.
 */
function placeReaScaffold(sourceRoot, targetRoot, srcRelDir, destRelDir, manifestObj) {
  const srcDirAbs = path.join(sourceRoot, srcRelDir);
  const destDirAbs = path.join(targetRoot, destRelDir);
  const entries = fs.readdirSync(srcDirAbs, { withFileTypes: true });

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }
    const typeName = entry.name;
    const srcReadme = path.join(srcDirAbs, typeName, 'README.md');
    if (!fs.existsSync(srcReadme)) {
      continue;
    }

    const hostTypeDir = path.join(destDirAbs, typeName);
    const alreadyPopulated =
      fs.existsSync(hostTypeDir) && fs.readdirSync(hostTypeDir).length > 0;
    if (alreadyPopulated) {
      continue;
    }

    fs.mkdirSync(hostTypeDir, { recursive: true });
    const destReadme = path.join(hostTypeDir, 'README.md');
    fs.copyFileSync(srcReadme, destReadme);
    manifest.recordOwned(manifestObj, manifest.normalizeRelPath(destReadme, targetRoot));
  }
}

/**
 * Places the rea-tools source content into `targetRoot` per LAYOUT[tool]:
 * commands, agents (minus per-tool exclusions), the core reference trio,
 * and the `.rea/` typed scaffold. Records every written path in
 * `manifestObj` (mutated). Returns `manifestObj`.
 */
function place(sourceRoot, targetRoot, manifestObj, tool = 'claude') {
  // Resolve both roots to absolute paths up front (mirrors shims.js/prune.js).
  // A relative targetRoot would otherwise flow into path.join() dest paths as
  // a relative path, which manifest.normalizeRelPath() only relativizes when
  // the input is absolute — leaving the targetRoot prefix baked into the
  // recorded manifest key instead of a clean root-relative path.
  sourceRoot = path.resolve(sourceRoot);
  targetRoot = path.resolve(targetRoot);

  const layout = LAYOUT[tool];
  if (!layout) {
    throw new Error(`place(): unknown tool "${tool}". Known tools: ${Object.keys(LAYOUT).join(', ')}`);
  }

  for (const dirSpec of layout.dirs) {
    const srcDirAbs = path.join(sourceRoot, dirSpec.srcDir);
    const destDirAbs = path.join(targetRoot, dirSpec.destDir);
    copyFlatDir(srcDirAbs, destDirAbs, dirSpec.exclude || [], targetRoot, manifestObj);
  }

  placeReaScaffold(
    sourceRoot,
    targetRoot,
    layout.reaScaffoldSrcDir,
    layout.reaScaffoldDestDir,
    manifestObj
  );

  return manifestObj;
}

module.exports = {
  LAYOUT,
  place,
};

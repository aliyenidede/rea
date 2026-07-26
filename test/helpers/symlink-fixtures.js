'use strict';

// Shared symlink/junction test-fixture helpers used across the test suite's
// SECURITY (containment-escape) tests. NOT a test file itself — it exports
// helpers only, so `node --test test/*.test.js` (non-recursive glob) never
// picks it up. Extracted from test/safe-path.test.js and test/shims.test.js
// (the two files that already held byte-identical copies of all three
// functions below) to remove duplication flagged across 7 test files.

const assert = require('node:assert/strict');
const fs = require('node:fs');

/**
 * ASYMMETRIC skip rule (see the safe-path hardening ADR,
 * `docs/decisions/0002-safe-path-hardening.md`): on win32, a permission failure
 * (EPERM/ENOSYS — symlink/junction creation needs admin/Developer Mode
 * without it) is a LOUD `t.skip(...)`; on every OTHER platform (including
 * CI-Linux, the real coverage backstop for this security regression), the
 * same kind of failure is `assert.fail`, never a silent skip that could let
 * the regression drop out of CI unnoticed. Returns false (caller must return
 * immediately) if the test was skipped.
 */
function handleLinkCreationFailure(t, err) {
  const isPermissionIssue = err && (err.code === 'EPERM' || err.code === 'ENOSYS');
  if (process.platform === 'win32' && isPermissionIssue) {
    t.skip(`symlink/junction creation not permitted on this host (${err.code}): ${err.message}`);
    return false;
  }
  assert.fail(
    `symlink/junction creation failed unexpectedly on ${process.platform} ` +
      `(${err && err.code}): ${err && err.message}`
  );
  return false; // unreachable — assert.fail throws
}

/** Creates a FILE symlink at `linkPath` pointing to `targetAbs`. See handleLinkCreationFailure. */
function createFileSymlinkOrSkip(t, targetAbs, linkPath) {
  try {
    fs.symlinkSync(targetAbs, linkPath, 'file');
    return true;
  } catch (err) {
    return handleLinkCreationFailure(t, err);
  }
}

/**
 * Creates a directory symlink/junction at `linkPath` pointing to
 * `targetDirAbs`. A junction is used on win32 (no elevation needed there,
 * unlike a file symlink or a directory symlink). See handleLinkCreationFailure.
 */
function createDirLinkOrSkip(t, targetDirAbs, linkPath) {
  try {
    if (process.platform === 'win32') {
      fs.symlinkSync(targetDirAbs, linkPath, 'junction');
    } else {
      fs.symlinkSync(targetDirAbs, linkPath);
    }
    return true;
  } catch (err) {
    return handleLinkCreationFailure(t, err);
  }
}

module.exports = {
  handleLinkCreationFailure,
  createFileSymlinkOrSkip,
  createDirLinkOrSkip,
};

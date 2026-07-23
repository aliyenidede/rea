'use strict';

/**
 * test/templates.test.js — Template link-resolution + stray-tag smoke check (4b-8)
 *
 * Places the real template set into a temp host (exactly like src/setup.js's
 * orchestrator does: place() then writeShims(), both against the same
 * manifest) and runs two checks against that placed tree:
 *
 *   1. Every intra-repo relative Markdown link (`[text](target)`) in every
 *      placed `.md` file resolves at the HOST layout — not the source-tree
 *      layout. This is lesson L301: a template file's relative links are
 *      authored for where the file LANDS in a host project (e.g. an agent at
 *      `.claude/agents/x.md` reaches `core/rea-schema.md` via
 *      `../../core/rea-schema.md`), which is a different depth than the
 *      file's location in this source tree.
 *   2. No placed agent/command `.md` body contains an unmatched HTML/XML
 *      closing tag — backstops PF-1, which removed a stray `</content>` tag
 *      left over from a prior authoring mistake.
 *
 * Node built-ins only (node:test, node:assert/strict, node:fs, node:os,
 * node:path) plus the sibling src/ modules under test elsewhere.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const manifest = require('../src/manifest.js');
const { place } = require('../src/place.js');
const { writeShims } = require('../src/shims.js');

// The real rea-tools package root (this repo) — templates/ and core/ live here.
const SOURCE_ROOT = path.resolve(__dirname, '..');

/** Creates a unique tmp dir under the OS temp dir; returns its absolute path. */
function makeTmpRoot() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'rea-templates-test-'));
}

/**
 * Places the full real template set (commands, agents, core trio, the `.rea/`
 * scaffold, and the AGENTS.md/CLAUDE.md/.gemini shims) into a fresh temp
 * host, mirroring src/setup.js's real call order (place() then writeShims(),
 * both against the same manifest). Returns the temp host's absolute path.
 */
function placeIntoTempHost() {
  const targetRoot = makeTmpRoot();
  const m = manifest.createEmptyManifest();
  place(SOURCE_ROOT, targetRoot, m);
  writeShims(SOURCE_ROOT, targetRoot, m);
  return targetRoot;
}

/** Recursively lists every `.md` file under `dirAbs` (absolute paths). Missing dir -> []. */
function listMarkdownFilesRecursive(dirAbs) {
  if (!fs.existsSync(dirAbs)) {
    return [];
  }
  const results = [];
  for (const entry of fs.readdirSync(dirAbs, { withFileTypes: true })) {
    const entryPath = path.join(dirAbs, entry.name);
    if (entry.isDirectory()) {
      results.push(...listMarkdownFilesRecursive(entryPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.md')) {
      results.push(entryPath);
    }
  }
  return results;
}

/**
 * Strips content that legitimately contains `<...>`-shaped or backtick-shaped
 * text but is not prose to be scanned as real links/tags: fenced code
 * blocks, inline code spans, and HTML comments (including the rea-tools
 * `<!-- rea-tools:start/end -->` markers). Shared by the link-target
 * extractor (TEST 1) and the stray-closing-tag heuristic (TEST 2) so that a
 * documentation EXAMPLE inside a code fence is never mistaken for a real
 * link or a real HTML/XML tag.
 */
function stripNonTagContent(content) {
  return content
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`\n]*`/g, '')
    .replace(/<!--[\s\S]*?-->/g, '');
}

// ---------------------------------------------------------------------------
// TEST 1 — link resolution at the HOST layout (L301)
// ---------------------------------------------------------------------------

// Any target that looks like "scheme:..." (http:, https:, mailto:, etc.) is
// external — not a filesystem path this test can resolve.
const EXTERNAL_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*:/;

/**
 * Extracts every Markdown link target (`[text](target)`) from `content` that
 * is a same-repo RELATIVE filesystem path: external URLs (http/https/
 * mailto/any other "scheme:"), pure in-page anchors (`#foo`), and absolute
 * paths are skipped. Fenced code blocks and inline code spans are stripped
 * first (via `stripNonTagContent()`) so a documentation EXAMPLE link is never
 * mistaken for a real one. A `<...>`-wrapped target is unwrapped, and a
 * trailing `"Title"` / `'Title'` is dropped, before any trailing `#anchor`
 * or `?query` is stripped off each returned target.
 */
function extractRelativeLinkTargets(content) {
  const scanned = stripNonTagContent(content);
  const targets = [];
  const linkRe = /\[([^\]]*)\]\(([^)]+)\)/g;
  let match;
  while ((match = linkRe.exec(scanned)) !== null) {
    let target = match[2].trim();
    if (target.length === 0) {
      continue;
    }

    if (target.startsWith('<')) {
      // `<path with spaces.md>` — unwrap; anything after the closing `>`
      // (e.g. a title) is not part of the target.
      const closeIdx = target.indexOf('>');
      if (closeIdx === -1) {
        continue; // malformed: no closing angle bracket
      }
      target = target.slice(1, closeIdx).trim();
    } else {
      // `path "Title"` or `path 'Title'` — drop the trailing title.
      const titled = target.match(/^(\S+)\s+(?:"[^"]*"|'[^']*')$/);
      if (titled) {
        target = titled[1];
      }
    }

    if (target.length === 0) {
      continue;
    }
    if (target.startsWith('#')) {
      continue; // pure in-page anchor
    }
    if (EXTERNAL_SCHEME_RE.test(target)) {
      continue; // http:, https:, mailto:, etc.
    }
    if (path.isAbsolute(target) || target.startsWith('/')) {
      continue; // absolute path (POSIX or platform-absolute)
    }
    target = target.split('#')[0].split('?')[0];
    if (target.length === 0) {
      continue;
    }
    targets.push(target);
  }
  return targets;
}

test('extractRelativeLinkTargets(): ignores fenced-code/inline-code EXAMPLE links, unwraps <...>-wraps and drops "Title"s, and catches a synthetic dead relative link', () => {
  const content = [
    'Prose with a real external link: [ext](https://example.com) — skipped, not a filesystem path.',
    'A fenced-code EXAMPLE that must NOT be treated as a real link:',
    '```',
    '[fake](./not-a-real-target.md)',
    '```',
    'An inline-code EXAMPLE that must NOT be treated as a real link: `[fake2](./also-not-real.md)`.',
    'A titled link whose target must resolve without the title: [t](./titled-target.md "Title Text")',
    'An angle-bracket-wrapped link whose target must resolve without the brackets: [b](<./bracket target.md>)',
    'A real dead relative link that must be caught: [x](./nope/missing.md)',
  ].join('\n');

  const targets = extractRelativeLinkTargets(content);

  assert.deepEqual(
    targets,
    ['./titled-target.md', './bracket target.md', './nope/missing.md'],
    'code-fenced/inline-code EXAMPLE links must be ignored; titled and <...>-wrapped targets must be unwrapped; the real dead link must be returned'
  );
  assert.ok(
    targets.includes('./nope/missing.md'),
    'the synthetic dead relative link must be present in the extracted targets (proves the extractor still catches real breakage, not just vacuous passing)'
  );
});

test('every placed template .md file has intra-repo relative links that resolve at the HOST layout (L301)', () => {
  const targetRoot = placeIntoTempHost();
  try {
    const mdFiles = listMarkdownFilesRecursive(targetRoot);
    assert.ok(mdFiles.length > 0, 'sanity: the placed host tree has at least one .md file');

    const failures = [];
    for (const filePath of mdFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      for (const target of extractRelativeLinkTargets(content)) {
        const resolved = path.resolve(path.dirname(filePath), target);
        if (!fs.existsSync(resolved)) {
          failures.push(
            `${path.relative(targetRoot, filePath).replace(/\\/g, '/')}: link target "${target}" ` +
              `does not resolve at the host layout (expected ` +
              `${path.relative(targetRoot, resolved).replace(/\\/g, '/')} to exist under the host tree)`
          );
        }
      }
    }

    assert.deepEqual(
      failures,
      [],
      `broken host-relative link(s) found:\n${failures.join('\n')}`
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// TEST 2 — stray/unmatched HTML/XML closing tag check (backstops PF-1)
// ---------------------------------------------------------------------------

/**
 * Returns the list of closing tags (e.g. `</content>`) found in `rawContent`
 * that have NO matching `<name ...>` opener anywhere in the file. This is
 * deliberately a one-directional check (closer-without-opener only, not full
 * balancing) — the templates use many placeholder-style angle-bracket tokens
 * as prose (`<n>`, `<title>`, `<NNNN>-<slug>`, `<SECRET_NAME>`, ...) that are
 * opened but never "closed"; a full-balance check would false-positive on
 * every one of them. An orphan CLOSING tag with no opener anywhere, however,
 * is never legitimate prose — it is exactly the PF-1 bug class (a stray
 * `</content>` left over from a bad edit). Self-closing tags (`<foo />`) are
 * not treated as openers needing a matching closer.
 */
function findUnmatchedClosingTags(rawContent) {
  const content = stripNonTagContent(rawContent);

  const openers = new Set();
  const openRe = /<([a-zA-Z][a-zA-Z0-9-]*)\b([^>]*)>/g;
  let match;
  while ((match = openRe.exec(content)) !== null) {
    const attrs = match[2];
    if (attrs.trim().endsWith('/')) {
      continue; // self-closing <foo ... />
    }
    openers.add(match[1].toLowerCase());
  }

  const unmatched = [];
  const closeRe = /<\/([a-zA-Z][a-zA-Z0-9-]*)\s*>/g;
  while ((match = closeRe.exec(content)) !== null) {
    if (!openers.has(match[1].toLowerCase())) {
      unmatched.push(`</${match[1]}>`);
    }
  }
  return unmatched;
}

test('findUnmatchedClosingTags() heuristic: ignores placeholders/code/comments, catches a stray </content>', () => {
  // Realistic prose shapes drawn from the actual templates: a `### U<n>`
  // heading style token, an unclosed <title> placeholder, a fenced code
  // block that happens to contain a bare closing tag, a comparison-like
  // angle bracket, an underscore-bearing placeholder, and the rea-tools
  // HTML-comment markers. None of these are a real unmatched closing tag.
  const clean = [
    '### U<n> — <title>',
    'See `<SECRET_NAME>` and the diff range `<pre-batch-sha>..HEAD`.',
    '```',
    '</content>',
    '```',
    '<!-- rea-tools:start -->',
    'managed body',
    '<!-- rea-tools:end -->',
  ].join('\n');
  assert.deepEqual(
    findUnmatchedClosingTags(clean),
    [],
    'placeholders, fenced-code content, and marker comments must not be flagged'
  );

  const withStrayTag = 'Some prose describing the task.\n</content>\nMore prose after it.';
  assert.deepEqual(
    findUnmatchedClosingTags(withStrayTag),
    ['</content>'],
    'a bare stray </content> with no opener anywhere in the file must be caught'
  );
});

test('no placed agent/command .md body contains an unmatched HTML/XML closing tag (backstops PF-1)', () => {
  const targetRoot = placeIntoTempHost();
  try {
    const mdFiles = [
      ...listMarkdownFilesRecursive(path.join(targetRoot, '.claude', 'commands')),
      ...listMarkdownFilesRecursive(path.join(targetRoot, '.claude', 'agents')),
    ];
    assert.ok(mdFiles.length > 0, 'sanity: agent/command files were placed');

    const failures = [];
    for (const filePath of mdFiles) {
      const content = fs.readFileSync(filePath, 'utf8');
      const unmatched = findUnmatchedClosingTags(content);
      if (unmatched.length > 0) {
        failures.push(`${path.relative(targetRoot, filePath).replace(/\\/g, '/')}: ${unmatched.join(', ')}`);
      }
    }

    assert.deepEqual(
      failures,
      [],
      `unmatched closing tag(s) found:\n${failures.join('\n')}`
    );
  } finally {
    fs.rmSync(targetRoot, { recursive: true, force: true });
  }
});

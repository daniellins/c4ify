#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const skillRoot = path.resolve(__dirname, '..');

const TYPES = new Set(['c4']);
const THEORY = {
  c4: 'theory-c4.md',
};
const EXAMPLES = {
  c4: 'online-store.c4.json',
};

// --view <key> selects one view of a C4 model. It is stripped from argv
// before dispatch and reaches the renderer as C4IFY_VIEW.
let selectedView;
function extractViewArgs(args) {
  const rest = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--view') {
      selectedView = args[index + 1];
      if (!selectedView || selectedView.startsWith('--')) fail('--view requires a view key.');
      index += 1;
      continue;
    }
    if (arg.startsWith('--view=')) {
      selectedView = arg.slice('--view='.length);
      if (!selectedView) fail('--view requires a view key.');
      continue;
    }
    rest.push(arg);
  }
  // Child processes (renderer, live preview) inherit the selection.
  if (selectedView) process.env.C4IFY_VIEW = selectedView;
  return rest;
}

function usage() {
  return `Usage:
  c4ify render c4 <model.json> [output.html] --view <key> [--quality standard|showcase]
  c4ify deliver c4 <model.json> [output-directory] [--json] [--open] [--quality standard|showcase]
  c4ify deliver c4 <model.json> [output.html] --view <key> [--json] [--open] [--quality standard|showcase]
  c4ify preview c4 <model.json> [output.html] [--view <key>] [--no-open] [--quality standard|showcase]
  c4ify validate c4 <model.json> [--view <key>] [--json] [--quality standard|showcase]
  c4ify draft c4 <model.json> [output-directory] [--view <key>] [--png] [--json] [--quality standard|showcase]
  c4ify check <output.html>
  c4ify visual-check <output.html> [--json]
  c4ify guide [scenario or question] [--json] [--lang en|pt]
  c4ify brands [name, alias, domain, or category] [--json]
  c4ify brands capture <url> [--json]
  c4ify examples
  c4ify doctor
  c4ify demo [output-directory]

Without --view, deliver and validate process every view of the model and
write one linked HTML file per view (<view-key>.html) into the directory.

Types:
  c4
`;
}

function fail(message, code = 2) {
  console.error(message);
  process.exit(code);
}

function rejectCliArgument(message, details = {}) {
  const error = new Error(message);
  error.archifyArgument = {
    code: details.code || 'cli/invalid-arguments',
    subject: details.subject || {},
    evidence: details.evidence || {},
    supportedFixes: details.supportedFixes || ['correct the command arguments and retry'],
  };
  throw error;
}

function rendererPath(type) {
  if (!TYPES.has(type)) {
    rejectCliArgument(`Unknown diagram type "${type}". Expected one of: ${[...TYPES].join(', ')}`, {
      code: 'cli/unknown-diagram-type',
      subject: { type },
      evidence: { supportedTypes: [...TYPES] },
      supportedFixes: [`use one of: ${[...TYPES].join(', ')}`],
    });
  }
  return path.join(skillRoot, 'renderers', type, `render-${type}.mjs`);
}

function runNode(args, options = {}) {
  return spawnSync(process.execPath, args, {
    cwd: options.cwd || process.cwd(),
    encoding: 'utf8',
    stdio: options.stdio || 'inherit',
    env: options.env ? { ...process.env, ...options.env } : process.env,
  });
}

function extractQualityArgs(args) {
  const rest = [];
  let quality;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--quality') {
      quality = args[index + 1];
      if (!quality || quality.startsWith('--')) rejectCliArgument('--quality requires standard or showcase.', {
        code: 'cli/missing-option-value',
        subject: { option: '--quality' },
        supportedFixes: ['provide --quality standard or --quality showcase'],
      });
      index += 1;
      continue;
    }
    if (arg.startsWith('--quality=')) {
      quality = arg.slice('--quality='.length);
      if (!quality) rejectCliArgument('--quality requires standard or showcase.', {
        code: 'cli/missing-option-value',
        subject: { option: '--quality' },
        supportedFixes: ['provide --quality standard or --quality showcase'],
      });
      continue;
    }
    rest.push(arg);
  }
  if (quality !== undefined && !['standard', 'showcase'].includes(quality)) {
    rejectCliArgument(`Unknown quality profile "${quality}". Expected standard or showcase.`, {
      code: 'cli/invalid-option-value',
      subject: { option: '--quality' },
      evidence: { value: quality, supportedValues: ['standard', 'showcase'] },
      supportedFixes: ['use --quality standard or --quality showcase'],
    });
  }
  return { rest, quality };
}

function extractRepoRootArgs(args) {
  const rest = [];
  let repoRoot;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--repo-root') {
      repoRoot = args[index + 1];
      if (!repoRoot || repoRoot.startsWith('--')) rejectCliArgument('--repo-root requires a repository path.', {
        code: 'cli/missing-option-value',
        subject: { option: '--repo-root' },
        supportedFixes: ['provide one repository path after --repo-root'],
      });
      index += 1;
      continue;
    }
    if (arg.startsWith('--repo-root=')) {
      repoRoot = arg.slice('--repo-root='.length);
      if (!repoRoot) rejectCliArgument('--repo-root requires a repository path.', {
        code: 'cli/missing-option-value',
        subject: { option: '--repo-root' },
        supportedFixes: ['provide one repository path after --repo-root'],
      });
      continue;
    }
    rest.push(arg);
  }
  return { rest, repoRoot: repoRoot ? path.resolve(repoRoot) : undefined };
}

function rendererEnv(quality, repoRoot, diagnosticJson = false) {
  return {
    ...(selectedView ? { C4IFY_VIEW: selectedView } : {}),
    ...(quality ? { ARCHIFY_QUALITY_PROFILE: quality } : {}),
    ...(repoRoot ? { ARCHIFY_REPO_ROOT: repoRoot } : {}),
    ...(diagnosticJson ? { ARCHIFY_DIAGNOSTIC_FORMAT: 'json' } : {}),
  };
}

function diagnostic({ code, message, subject = {}, evidence = {}, supportedFixes = [], severity = 'error' }) {
  return {
    code,
    severity,
    message,
    subject,
    evidence,
    supportedFixes,
  };
}

function inputDiagnostic(error, inputPath) {
  const isSyntax = error instanceof SyntaxError;
  return diagnostic({
    code: isSyntax ? 'input/json-parse' : 'input/read',
    message: isSyntax
      ? `Input JSON could not be parsed: ${error.message}`
      : `Input could not be read: ${error.message}`,
    subject: { input: inputPath },
    evidence: {
      ...(error?.code ? { systemCode: error.code } : {}),
      reason: error.message,
    },
    supportedFixes: [isSyntax
      ? 'repair the JSON syntax and run validation again'
      : 'provide one readable JSON input file'],
  });
}

function rendererFailure(result) {
  if (result.error) {
    return {
      error: 'Renderer process could not start.',
      diagnostics: [diagnostic({
        code: 'internal/renderer-process',
        message: 'Renderer process could not start.',
        evidence: { reason: result.error.message },
      })],
    };
  }
  try {
    const payload = JSON.parse((result.stderr || '').trim());
    if (payload?.ok === false && Array.isArray(payload.diagnostics) && payload.diagnostics.length) {
      return {
        error: payload.error || payload.diagnostics[0].message,
        diagnostics: payload.diagnostics,
      };
    }
  } catch {
    // The diagnostic boundary is intentionally fail-closed. Never copy a raw
    // Node stack into a machine receipt when a renderer exits unexpectedly.
  }
  return {
    error: 'Renderer failed before emitting a structured diagnostic.',
    diagnostics: [diagnostic({
      code: 'internal/unclassified',
      message: 'Renderer failed before emitting a structured diagnostic.',
      evidence: { exitCode: result.status ?? 1 },
    })],
  };
}

const COMPOSITION_CHECKS = new Set([
  'label_route_clearance',
  'relationship_crossings',
  'relationship_corridors',
  'container_border_runs',
  'route_rhythm',
]);

const CHECK_FIXES = {
  single_svg: ['remove additional SVG roots so the artifact contains exactly one diagram SVG'],
  finite_svg: ['replace non-finite coordinates before rendering again'],
  orthogonal_arrows: ['use renderer-supported orthogonal routing controls'],
  legend_clearance: ['move the route or enlarge the viewBox so relationships do not enter the legend'],
};

const COMPOSITION_FIXES = {
  'composition/proper-crossing': ['adjust route/via or channel coordinates so unrelated relationships use separate corridors'],
  'composition/ambiguous-corridor': ['adjust route/via or channel coordinates so unrelated relationships do not visually merge'],
  'composition/container-border-run': ['route across the frame perpendicularly through a clear opening'],
  'composition/label-route-clearance': ['adjust labelAt, labelDx, labelDy, labelSegment, message y, or the other relationship route'],
  'composition/desktop-readability': ['reduce the viewBox width, shorten node copy, widen affected nodes, or split the diagram so node context remains at least 6px at a 1440px desktop viewport'],
  'composition/micro-segment': ['move the route/channel/via point so every visible segment is at least 8px'],
  'composition/short-interior-segment': ['move the route/channel/via point so every interior turn has at least 16px'],
};

function checkerDiagnostics(checker) {
  const diagnostics = [];
  for (const issue of checker?.composition?.issues || []) {
    if (issue.severity !== 'error') continue;
    const { severity, code, relationship, ...evidence } = issue;
    diagnostics.push(diagnostic({
      code,
      severity,
      // Method advisories carry their own explanation (e.g. which acronym);
      // surface it instead of hiding it in the evidence.
      message: evidence.message ? `${code}: ${evidence.message}` : `Final artifact failed ${code}.`,
      subject: relationship ? { relationship } : { check: 'composition' },
      evidence,
      supportedFixes: COMPOSITION_FIXES[code] || [],
    }));
  }
  for (const check of checker?.checks || []) {
    if (check.ok || COMPOSITION_CHECKS.has(check.name)) continue;
    diagnostics.push(diagnostic({
      code: `artifact/${check.name.replaceAll('_', '-')}`,
      message: (check.details || []).find(Boolean) || `Final artifact failed ${check.name}.`,
      subject: { check: check.name },
      evidence: { details: check.details || [] },
      supportedFixes: CHECK_FIXES[check.name] || [],
    }));
  }
  return diagnostics.length ? diagnostics : [diagnostic({
    code: 'artifact/check-failed',
    message: 'Final artifact check failed without a classified diagnostic.',
    subject: { check: 'unknown' },
    evidence: {},
  })];
}

function formatDiagnostics(error, diagnostics = []) {
  if (!diagnostics.length) return error;
  return [
    error,
    ...diagnostics.map((entry) => {
      const fix = entry.supportedFixes?.length ? ` Fix: ${entry.supportedFixes.join('; ')}.` : '';
      return `[${entry.code}] ${entry.message}${fix}`;
    }),
  ].join('\n');
}

function assertEvidenceType(type, repoRoot) {
  if (repoRoot && type !== 'architecture') {
    rejectCliArgument('--repo-root is currently supported for architecture diagrams only.', {
      code: 'cli/unsupported-option',
      subject: { option: '--repo-root', type },
      supportedFixes: ['remove --repo-root or use an architecture diagram'],
    });
  }
}

function exitFrom(result) {
  if (result.error) fail(result.error.message, 1);
  process.exit(result.status ?? 1);
}

function commandRender(args) {
  const qualityArgs = extractQualityArgs(args);
  const repoArgs = extractRepoRootArgs(qualityArgs.rest);
  // render takes no options of its own once --quality and --repo-root are
  // stripped, so anything left starting with -- is a typo. Without this a
  // mistyped flag was taken as the output path: `render architecture spec.json
  // --json out.html` wrote a file literally named `--json` and never wrote
  // out.html, exiting 0. Every sibling subcommand already guards this.
  const unknown = repoArgs.rest.filter((arg) => arg.startsWith('--'));
  if (unknown.length) fail(`Unknown render option "${unknown[0]}".`);
  const [type, input, output] = repoArgs.rest;
  if (!type || !input || repoArgs.rest.length > 3) fail(usage());
  assertEvidenceType(type, repoArgs.repoRoot);
  const result = runNode([rendererPath(type), input, ...(output ? [output] : [])], {
    env: rendererEnv(qualityArgs.quality, repoArgs.repoRoot),
  });
  if (result.status !== 0) exitFrom(result);
}

function reportArtifactFailure({ command, json, stage, type, input, output, error, diagnostics = [], status = 1, checker }) {
  const receipt = {
    schemaVersion: 1,
    ok: false,
    command,
    stage,
    type,
    input,
    ...(output === undefined ? {} : { output }),
    error,
    diagnostics,
    ...(checker ? { checker } : {}),
  };
  if (json) console.log(JSON.stringify(receipt, null, 2));
  else console.error(formatDiagnostics(error, diagnostics));
  process.exitCode = status;
}

function reportDeliveryFailure(options) {
  reportArtifactFailure({ ...options, command: 'deliver' });
}

function reportValidateFailure(options) {
  reportArtifactFailure({ ...options, command: 'validate' });
}

function reportArtifactArgumentFailure(command, error) {
  const details = error.archifyArgument || {};
  reportArtifactFailure({
    command,
    json: true,
    stage: 'arguments',
    error: error.message,
    diagnostics: [diagnostic({
      code: details.code || 'cli/invalid-arguments',
      message: error.message,
      subject: { command, ...(details.subject || {}) },
      evidence: details.evidence || {},
      supportedFixes: details.supportedFixes || ['correct the command arguments and retry'],
    })],
    status: 2,
  });
}

function sourceEvidenceFromArtifact(artifact) {
  const html = artifact.toString('utf8');
  const match = html.match(/<script id="archify-source-evidence-data" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) return null;
  const evidence = JSON.parse(match[1]);
  if (evidence?.verified !== true || !evidence.repository?.url || !evidence.repository?.revision || !Number.isInteger(evidence.referenceCount)) {
    throw new Error('Rendered source evidence receipt is incomplete.');
  }
  return evidence;
}

function engineeringProfileFromArtifact(artifact) {
  const match = artifact.toString('utf8').match(/<svg[^>]*\sdata-engineering-profile="([^"]+)"/);
  return match ? match[1] : null;
}

async function commandDeliver(args) {
  const qualityArgs = extractQualityArgs(args);
  const repoArgs = extractRepoRootArgs(qualityArgs.rest);
  const json = repoArgs.rest.includes('--json');
  const open = repoArgs.rest.includes('--open');
  const knownOptions = new Set(['--json', '--open']);
  const unknown = repoArgs.rest.filter((arg) => arg.startsWith('--') && !knownOptions.has(arg));
  if (unknown.length) rejectCliArgument(`Unknown deliver option "${unknown[0]}".`, {
    code: 'cli/unknown-option',
    subject: { option: unknown[0] },
    supportedFixes: ['remove the unknown option and retry'],
  });
  const positional = repoArgs.rest.filter((arg) => !knownOptions.has(arg));
  const [type, input, requestedOutput] = positional;
  if (!type || !input || positional.length > 3) rejectCliArgument(usage(), {
    code: 'cli/usage',
    supportedFixes: ['use: c4ify deliver <type> <input.json> [output.html] [options]'],
  });
  assertEvidenceType(type, repoArgs.repoRoot);
  const renderer = rendererPath(type);
  const { resolveOutputPath } = await import('../renderers/shared/output-path.mjs');
  const inputPath = path.resolve(input);
  let specification;
  let diagram;
  try {
    specification = fs.readFileSync(inputPath);
    diagram = JSON.parse(specification.toString('utf8'));
  } catch (error) {
    const repair = inputDiagnostic(error, inputPath);
    reportDeliveryFailure({
      json,
      stage: 'input',
      type,
      input: inputPath,
      output: path.resolve(requestedOutput || `${type}.html`),
      error: `Could not read delivery input "${inputPath}": ${error.message}`,
      diagnostics: [repair],
    });
    return;
  }

  const authoredOutput = typeof diagram?.meta?.output === 'string' && diagram.meta.output
    ? diagram.meta.output
    : undefined;
  let outputPath;
  try {
    ({ outputPath } = resolveOutputPath({
      requestedOutput,
      authoredOutput,
      defaultOutput: `${type}.html`,
      inputPaths: [inputPath],
    }));
  } catch (error) {
    const attemptedOutput = path.resolve(requestedOutput || authoredOutput || `${type}.html`);
    reportDeliveryFailure({
      json,
      stage: 'prepare',
      type,
      input: inputPath,
      output: attemptedOutput,
      error: error.message,
      diagnostics: error.archifyDiagnostics || [diagnostic({
        code: 'output/path-resolution',
        message: error.message,
        subject: { output: attemptedOutput },
        evidence: { ...(error?.code ? { systemCode: error.code } : {}) },
        supportedFixes: ['choose a safe output path and retry'],
      })],
    });
    return;
  }
  const outputDirectory = path.dirname(outputPath);
  try {
    fs.mkdirSync(outputDirectory, { recursive: true });
  } catch (error) {
    const message = `Could not create delivery directory "${outputDirectory}": ${error.message}`;
    reportDeliveryFailure({
      json,
      stage: 'prepare',
      type,
      input: inputPath,
      output: outputPath,
      error: message,
      diagnostics: [diagnostic({
        code: 'delivery/prepare-directory',
        message,
        subject: { outputDirectory },
        evidence: { ...(error?.code ? { systemCode: error.code } : {}), reason: error.message },
        supportedFixes: ['choose a writable output directory'],
      })],
    });
    return;
  }

  // Keep the candidate beside the target so the final rename is one
  // same-filesystem commit. A render or artifact-check failure never touches
  // an existing trusted output.
  let stagingDirectory;
  try {
    stagingDirectory = fs.mkdtempSync(path.join(outputDirectory, '.archify-delivery-'));
  } catch (error) {
    const message = `Could not create a delivery candidate beside "${outputPath}": ${error.message}`;
    reportDeliveryFailure({
      json,
      stage: 'prepare',
      type,
      input: inputPath,
      output: outputPath,
      error: message,
      diagnostics: [diagnostic({
        code: 'delivery/prepare-candidate',
        message,
        subject: { output: outputPath },
        evidence: { ...(error?.code ? { systemCode: error.code } : {}), reason: error.message },
        supportedFixes: ['choose a writable output directory on the target filesystem'],
      })],
    });
    return;
  }
  const candidatePath = path.join(stagingDirectory, path.basename(outputPath));
  const specificationSnapshotPath = path.join(stagingDirectory, 'specification.snapshot.json');

  try {
    try {
      fs.writeFileSync(specificationSnapshotPath, specification, { flag: 'wx' });
    } catch (error) {
      const message = `Could not freeze the delivery specification: ${error.message}`;
      reportDeliveryFailure({
        json,
        stage: 'prepare',
        type,
        input: inputPath,
        output: outputPath,
        error: message,
        diagnostics: [diagnostic({
          code: 'delivery/freeze-specification',
          message,
          subject: { input: inputPath },
          evidence: { ...(error?.code ? { systemCode: error.code } : {}), reason: error.message },
          supportedFixes: ['choose a writable output directory on the target filesystem'],
        })],
      });
      return;
    }

    const render = runNode([renderer, specificationSnapshotPath, candidatePath], {
      stdio: 'pipe',
      env: rendererEnv(qualityArgs.quality, repoArgs.repoRoot, true),
    });
    if (render.status !== 0) {
      const failure = rendererFailure(render);
      reportDeliveryFailure({
        json,
        stage: 'render',
        type,
        input: inputPath,
        output: outputPath,
        error: failure.error,
        diagnostics: failure.diagnostics,
        status: render.status ?? 1,
      });
      return;
    }

    const check = runNode([path.join(skillRoot, 'scripts/check-render-output.mjs'), candidatePath], {
      stdio: 'pipe',
    });
    if (check.status !== 0) {
      if (check.stderr) process.stderr.write(check.stderr);
      let checker;
      try {
        checker = JSON.parse(check.stdout);
        checker.file = outputPath;
      } catch {
        checker = { ok: false, file: outputPath, diagnostic: check.stdout.trim() };
      }
      reportDeliveryFailure({
        json,
        stage: 'check',
        type,
        input: inputPath,
        output: outputPath,
        error: 'Final artifact check failed; the previous artifact was preserved.',
        diagnostics: checkerDiagnostics(checker),
        status: check.status ?? 1,
        checker,
      });
      return;
    }

    let result;
    try {
      result = JSON.parse(check.stdout);
    } catch (error) {
      const message = `Could not parse the successful artifact-check receipt: ${error.message}`;
      reportDeliveryFailure({
        json,
        stage: 'receipt',
        type,
        input: inputPath,
        output: outputPath,
        error: message,
        diagnostics: [diagnostic({
          code: 'delivery/receipt-invalid',
          message,
          subject: { output: outputPath },
          evidence: { reason: error.message },
        })],
      });
      return;
    }
    let artifact;
    try {
      artifact = fs.readFileSync(candidatePath);
    } catch (error) {
      const message = `Could not read the verified delivery candidate: ${error.message}`;
      reportDeliveryFailure({
        json,
        stage: 'receipt',
        type,
        input: inputPath,
        output: outputPath,
        error: message,
        diagnostics: [diagnostic({
          code: 'delivery/candidate-unreadable',
          message,
          subject: { output: outputPath },
          evidence: { ...(error?.code ? { systemCode: error.code } : {}), reason: error.message },
        })],
      });
      return;
    }
    let sourceEvidence;
    try {
      sourceEvidence = sourceEvidenceFromArtifact(artifact);
    } catch (error) {
      const message = `Could not read the repository evidence receipt: ${error.message}`;
      reportDeliveryFailure({
        json,
        stage: 'receipt',
        type,
        input: inputPath,
        output: outputPath,
        error: message,
        diagnostics: [diagnostic({
          code: 'delivery/evidence-receipt-invalid',
          message,
          subject: { output: outputPath },
          evidence: { reason: error.message },
        })],
      });
      return;
    }
    const engineeringProfile = engineeringProfileFromArtifact(artifact);
    const receipt = {
      schemaVersion: 1,
      ok: true,
      command: 'deliver',
      type,
      input: inputPath,
      output: outputPath,
      specification: {
        sha256: createHash('sha256').update(specification).digest('hex'),
        bytes: specification.byteLength,
      },
      artifact: {
        sha256: createHash('sha256').update(artifact).digest('hex'),
        bytes: artifact.byteLength,
      },
      validation: {
        checksPassed: result.checks.filter((checkItem) => checkItem.ok).length,
        checkCount: result.checks.length,
        compositionProfile: result.composition.profile,
        compositionStatus: result.composition.status,
        ...(engineeringProfile ? { engineeringProfile } : {}),
        errors: result.composition.summary.errors,
        warnings: result.composition.summary.warnings,
      },
      ...(sourceEvidence ? {
        evidence: {
          verified: true,
          repository: sourceEvidence.repository.url,
          revision: sourceEvidence.repository.revision,
          references: sourceEvidence.referenceCount,
          ...(sourceEvidence.repository.linkMode ? { linkMode: sourceEvidence.repository.linkMode } : {}),
        },
      } : {}),
    };

    try {
      resolveOutputPath({
        requestedOutput,
        authoredOutput,
        defaultOutput: `${type}.html`,
        inputPaths: [inputPath],
      });
    } catch (error) {
      reportDeliveryFailure({
        json,
        stage: 'commit',
        type,
        input: inputPath,
        output: outputPath,
        error: error.message,
        diagnostics: error.archifyDiagnostics || [diagnostic({
          code: 'output/path-resolution',
          message: error.message,
          subject: { output: outputPath },
          evidence: { ...(error?.code ? { systemCode: error.code } : {}) },
          supportedFixes: ['restore a safe output path and retry'],
        })],
      });
      return;
    }

    try {
      fs.renameSync(candidatePath, outputPath);
    } catch (error) {
      const message = `Could not commit verified delivery "${outputPath}": ${error.message}`;
      reportDeliveryFailure({
        json,
        stage: 'commit',
        type,
        input: inputPath,
        output: outputPath,
        error: message,
        diagnostics: [diagnostic({
          code: 'delivery/commit',
          message,
          subject: { output: outputPath },
          evidence: { ...(error?.code ? { systemCode: error.code } : {}), reason: error.message },
          supportedFixes: ['choose a replaceable file target on the same writable filesystem'],
        })],
      });
      return;
    }

    if (open) {
      try {
        const { openArtifact } = await import('./open-artifact.mjs');
        receipt.open = openArtifact(outputPath);
      } catch {
        receipt.open = {
          requested: true,
          status: 'unsupported',
          target: outputPath,
          method: null,
        };
      }
      if (receipt.open.status !== 'opened') {
        console.error(`Could not open the verified artifact (${receipt.open.status}). Open it manually: ${outputPath}`);
      }
    }

    if (json) {
      console.log(JSON.stringify(receipt, null, 2));
    } else {
      console.log(`delivered ${type} ${outputPath}`);
      const engineering = receipt.validation.engineeringProfile
        ? `; engineering ${receipt.validation.engineeringProfile}: pass`
        : '';
      console.log(`${receipt.validation.checksPassed}/${receipt.validation.checkCount} artifact checks; composition ${receipt.validation.compositionProfile}: ${receipt.validation.compositionStatus}${engineering}; sha256 ${receipt.artifact.sha256.slice(0, 12)}`);
      if (receipt.open?.status === 'opened') console.log(`opened ${outputPath}`);
    }
  } finally {
    try {
      fs.rmSync(stagingDirectory, { recursive: true, force: true });
    } catch (error) {
      console.error(`Warning: could not remove delivery staging directory "${stagingDirectory}": ${error.message}`);
    }
  }
}

async function commandPreview(args) {
  const qualityArgs = extractQualityArgs(args);
  const repoArgs = extractRepoRootArgs(qualityArgs.rest);
  const noOpen = repoArgs.rest.includes('--no-open');
  const knownOptions = new Set(['--no-open']);
  const unknown = repoArgs.rest.filter((arg) => arg.startsWith('--') && !knownOptions.has(arg));
  if (unknown.length) fail(`Unknown preview option "${unknown[0]}".`);
  const positional = repoArgs.rest.filter((arg) => !knownOptions.has(arg));
  const [type, input, output] = positional;
  if (!type || !input || positional.length > 3) fail(usage());
  assertEvidenceType(type, repoArgs.repoRoot);
  rendererPath(type);

  let runPreview;
  try {
    ({ runPreview } = await import('./preview.mjs'));
  } catch (error) {
    fail(`Could not load live preview: ${error.message}`, 1);
  }
  try {
    await runPreview({
      type,
      input,
      output,
      quality: qualityArgs.quality,
      repoRoot: repoArgs.repoRoot,
      open: !noOpen,
    });
  } catch (error) {
    fail(`Could not start live preview: ${error.message}`, 1);
  }
}

function commandCheck(args) {
  const unknown = args.find((arg) => arg.startsWith('--'));
  if (unknown) fail(`Unknown check option "${unknown}".`);
  const [html] = args;
  if (!html || args.length !== 1) fail(usage());
  const result = runNode([path.join(skillRoot, 'scripts/check-render-output.mjs'), html]);
  if (result.status !== 0) exitFrom(result);
}

async function commandVisualCheck(args) {
  const json = args.includes('--json');
  const knownOptions = new Set(['--json']);
  const unknown = args.filter((arg) => arg.startsWith('--') && !knownOptions.has(arg));
  if (unknown.length) fail(`Unknown visual-check option "${unknown[0]}".`, 1);
  const positional = args.filter((arg) => !knownOptions.has(arg));
  if (positional.length !== 1) fail(usage(), 1);

  let runVisualCheck;
  try {
    ({ runVisualCheck } = await import('./visual-check.mjs'));
  } catch (error) {
    fail(`Could not load visual-check: ${error.message}`, 1);
  }

  let result;
  try {
    result = await runVisualCheck({ artifactPath: positional[0] });
  } catch (error) {
    if (json) {
      console.log(JSON.stringify({
        schemaVersion: 1,
        ok: false,
        command: 'visual-check',
        evidenceKind: 'automated-browser',
        status: 'fail',
        visualReview: 'pending',
        artifact: { path: path.resolve(positional[0]) },
        error: error.message,
      }, null, 2));
    } else {
      console.error(`automated browser evidence failed: ${error.message}`);
      console.error('perceptual visual review pending');
    }
    process.exitCode = 1;
    return;
  }

  if (json) {
    console.log(JSON.stringify(result.receipt, null, 2));
  } else {
    console.log(`automated browser evidence ${result.receipt.status}: ${result.receipt.artifact.path}`);
    console.log(`visual-check containment ${result.receipt.containment.status}; captures ${result.receipt.captures.status}; perceptual visual review pending`);
    console.log(`receipt ${path.join(path.dirname(result.receipt.artifact.path), result.receipt.sidecars.receipt)}`);
    if (result.receipt.captures.contactSheet) {
      console.log(`contact sheet ${path.join(path.dirname(result.receipt.artifact.path), result.receipt.captures.contactSheet)}`);
    }
    if (result.receipt.error) console.error(result.receipt.error);
  }
  process.exitCode = result.exitCode;
}

function commandExamples(args) {
  const unknown = args.find((arg) => arg.startsWith('--'));
  if (unknown) fail(`Unknown examples option "${unknown}".`);
  if (args.length) fail(usage());
  const result = runNode([path.join(skillRoot, 'scripts/render-examples.mjs')], { cwd: skillRoot });
  if (result.status !== 0) exitFrom(result);
}

async function commandDoctor(args) {
  const unknown = args.find((arg) => arg.startsWith('--'));
  if (unknown) fail(`Unknown doctor option "${unknown}".`);
  if (args.length) fail(usage());
  const checks = [];
  const nodeMajor = Number.parseInt(process.versions.node.split('.')[0], 10);
  checks.push({
    label: `Node.js v${process.versions.node} (requires >=18)`,
    ok: nodeMajor >= 18,
    missing: 0,
    failureLabel: 'unsupported',
  });

  const template = path.join(skillRoot, 'assets/template.html');
  checks.push({
    label: 'Core template',
    ok: fs.existsSync(template),
    missing: fs.existsSync(template) ? 0 : 1,
  });

  const examplesRenderer = path.join(skillRoot, 'scripts/render-examples.mjs');
  checks.push({
    label: 'Example renderer',
    ok: fs.existsSync(examplesRenderer),
    missing: fs.existsSync(examplesRenderer) ? 0 : 1,
  });

  const previewRuntime = path.join(skillRoot, 'bin/preview.mjs');
  checks.push({
    label: 'Live preview runtime',
    ok: fs.existsSync(previewRuntime),
    missing: fs.existsSync(previewRuntime) ? 0 : 1,
  });

  const visualCheckRuntime = path.join(skillRoot, 'bin/visual-check.mjs');
  checks.push({
    label: 'Visual-check runtime',
    ok: fs.existsSync(visualCheckRuntime),
    missing: fs.existsSync(visualCheckRuntime) ? 0 : 1,
  });

  const outputPathRuntime = path.join(skillRoot, 'renderers/shared/output-path.mjs');
  checks.push({
    label: 'Output path safety runtime',
    ok: fs.existsSync(outputPathRuntime),
    missing: fs.existsSync(outputPathRuntime) ? 0 : 1,
  });

  const scenarioGuide = path.join(skillRoot, 'recipes/scenarios.mjs');
  checks.push({
    label: 'Scenario recipe guide',
    ok: fs.existsSync(scenarioGuide),
    missing: fs.existsSync(scenarioGuide) ? 0 : 1,
  });

  const authoringReferences = [
    path.join(skillRoot, 'references', 'authoring-contract.md'),
    path.join(skillRoot, 'references', 'viewer-runtime.md'),
    path.join(skillRoot, 'references', 'delivery-contract.md'),
  ];
  const authoringReferencesMissing = authoringReferences.filter((file) => !fs.existsSync(file)).length;
  checks.push({
    label: 'Progressive authoring references',
    ok: authoringReferencesMissing === 0,
    missing: authoringReferencesMissing,
  });

  const validators = path.join(skillRoot, 'renderers/shared/generated-validators.mjs');
  const validatorsExist = fs.existsSync(validators);
  let validatorsValid = false;
  if (validatorsExist) {
    try {
      const module = await import(`${pathToFileURL(validators).href}?doctor=${Date.now()}`);
      validatorsValid = [...TYPES].every((type) => typeof module[type] === 'function');
    } catch {
      validatorsValid = false;
    }
  }
  checks.push({
    label: 'Standalone schema validators',
    ok: validatorsValid,
    missing: validatorsExist ? 0 : 1,
    invalid: validatorsExist && !validatorsValid ? 1 : 0,
    failureLabel: validatorsExist ? 'invalid' : 'missing',
  });

  const examples = EXAMPLES;

  for (const type of TYPES) {
    const required = [
      path.join(skillRoot, 'renderers', type, `render-${type}.mjs`),
      path.join(skillRoot, 'schemas', `${type}.schema.json`),
      path.join(skillRoot, 'examples', examples[type]),
      path.join(skillRoot, 'references', `authoring-${type}.md`),
      path.join(skillRoot, 'references', THEORY[type]),
    ];
    const missing = required.filter((file) => !fs.existsSync(file)).length;
    checks.push({
      label: `${type} renderer, schema, example, and references`,
      ok: missing === 0,
      missing,
    });
  }

  console.log('c4ify doctor\n');
  for (const check of checks) {
    console.log(`[${check.ok ? 'ok' : (check.failureLabel || 'missing')}] ${check.label}`);
  }

  const nodeFailed = checks[0].ok ? 0 : 1;
  const missingFiles = checks.reduce((count, check) => count + check.missing, 0);
  const invalidRuntime = checks.reduce((count, check) => count + (check.invalid || 0), 0);
  if (nodeFailed === 0 && missingFiles === 0 && invalidRuntime === 0) {
    console.log('\nc4ify is ready.');
    return;
  }

  const problems = [];
  if (nodeFailed) problems.push('Node.js 18 or newer is required');
  if (missingFiles) problems.push(`${missingFiles} required file${missingFiles === 1 ? '' : 's'} missing`);
  if (invalidRuntime) problems.push(`${invalidRuntime} runtime check${invalidRuntime === 1 ? '' : 's'} failed`);
  console.error(`\nc4ify is not ready: ${problems.join('; ')}.`);
  process.exitCode = 1;
}

async function commandGuide(args) {
  let lang;
  let json = false;
  const queryParts = [];

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--json') {
      json = true;
    } else if (arg === '--lang') {
      const value = args[index + 1];
      if (value !== 'en' && value !== 'pt') fail('--lang must be "en" or "pt".');
      lang = value;
      index += 1;
    } else if (arg.startsWith('--lang=')) {
      const value = arg.slice('--lang='.length);
      if (value !== 'en' && value !== 'pt') fail('--lang must be "en" or "pt".');
      lang = value;
    } else if (arg.startsWith('--')) {
      fail(`Unknown guide option "${arg}".`);
    } else {
      queryParts.push(arg);
    }
  }

  const guidePath = path.join(skillRoot, 'recipes/scenarios.mjs');
  let guide;
  try {
    guide = await import(pathToFileURL(guidePath).href);
  } catch (error) {
    fail(`Could not load the scenario recipe guide: ${error.message}`, 1);
  }

  const query = queryParts.join(' ').trim();
  if (!query) {
    const selectedLang = lang || 'en';
    if (json) {
      console.log(JSON.stringify({
        ok: true,
        mode: 'list',
        lang: selectedLang,
        recipes: guide.listScenarioRecipes(selectedLang),
      }, null, 2));
    } else {
      console.log(guide.formatScenarioList(selectedLang));
    }
    return;
  }

  const result = guide.recommendScenario(query, lang ? { lang } : {});
  console.log(json ? JSON.stringify(result, null, 2) : guide.formatScenarioRecommendation(result));
}

async function commandBrands(args) {
  const json = args.includes('--json');
  const unknown = args.filter((arg) => arg.startsWith('--') && arg !== '--json');
  if (unknown.length) fail(`Unknown brands option "${unknown[0]}".`);
  const positional = args.filter((arg) => arg !== '--json');
  if (positional[0] === 'capture') {
    if (positional.length !== 2) fail('Usage: c4ify brands capture <url> [--json]');
    const { captureBrandReference } = await import('../renderers/shared/brand-marks.mjs');
    let capture;
    try {
      capture = await captureBrandReference(positional[1]);
    } catch (error) {
      fail(error.message);
    }
    const result = {
      schemaVersion: 1,
      ok: true,
      command: 'brands capture',
      brand: capture.brand,
      evidence: {
        status: capture.resolved.status,
        source: capture.resolved.sourceUrl,
        ...(capture.resolved.sha256 ? { sha256: capture.resolved.sha256 } : {}),
        ...(capture.resolved.contentType ? { contentType: capture.resolved.contentType } : {}),
      },
    };
    console.log(json ? JSON.stringify(result, null, 2) : JSON.stringify(result.brand));
    return;
  }
  const query = positional.join(' ').trim();
  const { listBrandMarks } = await import('../renderers/shared/brand-marks.mjs');
  const marks = listBrandMarks(query);
  if (json) {
    console.log(JSON.stringify({
      schemaVersion: 1,
      ok: true,
      command: 'brands',
      query,
      count: marks.length,
      marks,
      fallback: 'Run "c4ify brands capture <url> --json", then use the returned digest-pinned brand value.',
    }, null, 2));
    return;
  }
  if (!marks.length) {
    console.log(`No built-in brand matched "${query}". Run "c4ify brands capture <url> --json", then use the returned digest-pinned brand value.`);
    return;
  }
  const grouped = Map.groupBy
    ? Map.groupBy(marks, (mark) => mark.category)
    : marks.reduce((map, mark) => map.set(mark.category, [...(map.get(mark.category) || []), mark]), new Map());
  for (const [category, entries] of grouped) {
    console.log(`${category}: ${entries.map((mark) => mark.id).join(', ')}`);
  }
}

function commandDemo(args) {
  const unknown = args.find((arg) => arg.startsWith('--'));
  if (unknown) fail(`Unknown demo option "${unknown}".`);
  if (args.length > 1) fail(usage());
  const outputDirectory = path.resolve(args[0] || path.join(process.cwd(), 'c4ify-demo'));
  const input = path.join(skillRoot, 'examples', EXAMPLES.c4);
  const result = runNode([path.join(skillRoot, 'bin/c4ify.mjs'), 'deliver', 'c4', input, outputDirectory, '--quality', 'standard']);
  if (result.status !== 0) exitFrom(result);
  console.log(`\nDemo ready: ${outputDirectory}`);
  console.log('Next: open the first view in your browser, double-click an element marked with (+) to zoom in, then model your own system:');
  console.log('  c4ify deliver c4 <model.json> <output-directory>');
}

// A C4 model holds several views. Without --view, deliver/validate run the
// single-view pipeline once per view (each with its own verified receipt) and
// report them together. Deliver writes <view-key>.html into one directory so
// the navigation bar and drill-down links resolve as siblings.
// Options that take a value; their value is not a positional argument.
const VALUE_OPTIONS = new Set(['--quality', '--repo-root']);

function positionalArgs(args) {
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    if (VALUE_OPTIONS.has(args[index])) { index += 1; continue; }
    if (!args[index].startsWith('--')) positional.push(args[index]);
  }
  return positional;
}

function allViewsRequested(args) {
  return positionalArgs(args)[0] === 'c4';
}

function splitAllViewsArgs(command, args) {
  const passthrough = [];
  const positional = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (VALUE_OPTIONS.has(arg)) {
      const value = args[index + 1];
      if (!value || value.startsWith('--')) fail(`${arg} requires a value.`);
      passthrough.push(arg, value);
      index += 1;
      continue;
    }
    if (arg.startsWith('--quality=') || arg.startsWith('--repo-root=') || arg === '--layout-json') {
      passthrough.push(arg);
      continue;
    }
    if (arg === '--json' || arg === '--open') continue;
    if (arg.startsWith('--')) fail(`Unknown ${command} option "${arg}".`);
    positional.push(arg);
  }
  return { passthrough, positional };
}

function runViewCommand(command, type, input, directory, key, passthrough) {
  const output = command === 'deliver' ? [path.join(directory, `${key}.html`)] : [];
  const result = runNode([path.join(skillRoot, 'bin/c4ify.mjs'), command, type, input, ...output, '--view', key, '--json', ...passthrough], { stdio: 'pipe' });
  try {
    return { view: key, ...JSON.parse(result.stdout) };
  } catch {
    return { view: key, ok: false, error: (result.stderr || result.stdout || '').trim() || `${command} failed` };
  }
}

function printAllViews(command, summary) {
  for (const receipt of summary.views) {
    if (receipt.ok) {
      const errors = receipt.validation?.errors ?? receipt.composition?.summary?.errors ?? 0;
      const warnings = receipt.validation?.warnings ?? receipt.composition?.summary?.warnings ?? 0;
      console.log(`ok ${receipt.view}${receipt.output ? ` ${receipt.output}` : ''} (${errors} errors, ${warnings} warnings)`);
    } else {
      console.error(`FAILED ${receipt.view}: ${receipt.error}`);
      for (const entry of receipt.diagnostics || []) console.error(`  [${entry.code}] ${entry.message}`);
    }
  }
  if (command === 'deliver' && summary.ok) console.log(`entry ${summary.entry}`);
}

// Draft: render every view (or --view) even when composition gates fail, so
// the author can look at the layout while fixing it. HARD model rules still
// stop the render. Problems are outlined in red on the diagram and listed
// above it; nothing is verified or committed atomically (use deliver for that).
async function commandDraft(rawArgs) {
  const png = rawArgs.includes('--png');
  const args = rawArgs.filter((arg) => arg !== '--png');
  const json = args.includes('--json');
  const { passthrough, positional } = splitAllViewsArgs('draft', args);
  const [type, input, target] = positional;
  if (type !== 'c4' || !input || positional.length > 3) fail('Usage: c4ify draft c4 <model.json> [output-directory] [--view <key>] [--png] [--quality standard|showcase] [--json]');
  const qualityIndex = passthrough.indexOf('--quality');
  const qualityEquals = passthrough.find((arg) => arg.startsWith('--quality='));
  const quality = qualityIndex >= 0 ? passthrough[qualityIndex + 1] : qualityEquals ? qualityEquals.slice('--quality='.length) : 'showcase';
  let model;
  try {
    model = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
  } catch (error) {
    fail(`Could not read model "${input}": ${error.message}`, 1);
  }
  const keys = selectedView ? [selectedView] : (Array.isArray(model?.views) ? model.views.map((view) => view?.key).filter(Boolean) : []);
  if (!keys.length) fail('The model has no views to draft.', 1);
  const base = path.basename(input).replace(/\.c4\.json$|\.json$/i, '');
  const directory = path.resolve(target || `${base}-c4-draft`);
  fs.mkdirSync(directory, { recursive: true });
  const views = keys.map((key) => {
    const output = path.join(directory, `${key}.html`);
    const result = runNode([rendererPath(type), path.resolve(input), output], {
      stdio: 'pipe',
      env: { C4IFY_VIEW: key, C4IFY_DRAFT: '1', ARCHIFY_QUALITY_PROFILE: quality, ARCHIFY_DIAGNOSTIC_FORMAT: 'json' },
    });
    const line = (result.stderr || '').split(/\r?\n/).find((entry) => entry.startsWith('C4IFY_DRAFT_PROBLEMS '));
    if (result.status !== 0 || !line) {
      const failure = rendererFailure(result);
      return { view: key, ok: false, rendered: false, error: failure.error, diagnostics: failure.diagnostics };
    }
    const report = JSON.parse(line.slice('C4IFY_DRAFT_PROBLEMS '.length));
    return { view: key, ok: report.problems.length === 0, rendered: true, output, layout: report.candidate, ratio: report.ratio, problems: report.problems };
  });
  if (png) {
    // One quick 1440×900 light capture per view (visual-check takes 8).
    const { captureSnapshot } = await import('./visual-check.mjs');
    for (const view of views.filter((entry) => entry.rendered)) {
      try {
        const snapshot = await captureSnapshot({ artifactPath: view.output, screenshotPath: view.output.replace(/\.html$/i, '.png') });
        view.screenshot = snapshot.screenshot;
        view.fitsScreen = snapshot.fitsScreen;
      } catch (error) {
        view.screenshotError = error.message;
      }
    }
  }
  const summary = { schemaVersion: 1, ok: views.every((view) => view.ok), command: 'draft', quality, directory, views };
  if (json) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    for (const view of views) {
      if (!view.rendered) {
        console.error(`FAILED ${view.view}: ${view.error}`);
        for (const entry of view.diagnostics || []) console.error(`  [${entry.code}] ${entry.message}`);
        continue;
      }
      const layout = `${view.layout.direction}, ${view.layout.maxPerRow}/row, ${view.layout.elementWidth}px, +${view.layout.gapBoost} gap, ${view.ratio}:1`;
      console.log(`${view.ok ? 'clean' : `${view.problems.length} problems`} ${view.view} ${view.output} (${layout})`);
      if (view.screenshot) console.log(`  screenshot ${view.screenshot}${view.fitsScreen === false ? ' (scrolls at 1440×900)' : ''}`);
      if (view.screenshotError) console.log(`  screenshot failed: ${view.screenshotError}`);
      for (const problem of view.problems) console.log(`  - ${problem}`);
    }
  }
  if (!summary.ok) process.exitCode = 1;
}

async function commandAllViews(command, args) {
  const json = args.includes('--json');
  const open = args.includes('--open');
  const { passthrough, positional } = splitAllViewsArgs(command, args);
  const [type, input, target] = positional;
  if (!type || !input || positional.length > (command === 'deliver' ? 3 : 2)) fail(usage());
  let model;
  try {
    model = JSON.parse(fs.readFileSync(path.resolve(input), 'utf8'));
  } catch (error) {
    fail(`Could not read model "${input}": ${error.message}`, 1);
  }
  const keys = Array.isArray(model?.views) ? model.views.map((view) => view?.key).filter(Boolean) : [];
  if (!keys.length) {
    // The single-view pipeline reports the schema problem precisely.
    if (command === 'deliver') await commandDeliver(args);
    else commandValidate(args);
    return;
  }
  const base = path.basename(input).replace(/\.c4\.json$|\.json$/i, '');
  const directory = path.resolve(target || `${base}-c4`);
  if (command === 'deliver' && /\.html?$/i.test(directory)) {
    fail('Without --view, deliver writes one file per view: pass an output directory, not an .html file.');
  }
  const views = keys.map((key) => runViewCommand(command, type, input, directory, key, passthrough));
  const ok = views.every((receipt) => receipt.ok);
  const summary = {
    schemaVersion: 1,
    ok,
    command,
    type,
    input: path.resolve(input),
    ...(command === 'deliver' ? { directory, entry: path.join(directory, `${keys[0]}.html`) } : {}),
    views,
  };
  if (ok && open && command === 'deliver') {
    try {
      const { openArtifact } = await import('./open-artifact.mjs');
      summary.open = openArtifact(summary.entry);
    } catch {
      summary.open = { requested: true, status: 'unsupported', target: summary.entry, method: null };
    }
  }
  if (json) console.log(JSON.stringify(summary, null, 2));
  else printAllViews(command, summary);
  if (!ok) process.exitCode = 1;
}

function commandValidate(args) {
  const qualityArgs = extractQualityArgs(args);
  const repoArgs = extractRepoRootArgs(qualityArgs.rest);
  args = repoArgs.rest;
  const quality = qualityArgs.quality;
  const repoRoot = repoArgs.repoRoot;
  const knownOptions = new Set(['--json', '--layout-json']);
  const unknown = args.filter((arg) => arg.startsWith('--') && !knownOptions.has(arg));
  if (unknown.length) rejectCliArgument(`Unknown validate option "${unknown[0]}".`, {
    code: 'cli/unknown-option',
    subject: { option: unknown[0] },
    supportedFixes: ['remove the unknown option and retry'],
  });
  const json = args.includes('--json');
  const layoutJson = args.includes('--layout-json');
  const rest = args.filter((arg) => !knownOptions.has(arg));
  const [type, input] = rest;
  if (!type || !input || rest.length !== 2) rejectCliArgument(usage(), {
    code: 'cli/usage',
    supportedFixes: ['use: c4ify validate <type> <input.json> [options]'],
  });
  assertEvidenceType(type, repoRoot);
  const renderer = rendererPath(type);

  if (layoutJson) {
    rejectCliArgument('--layout-json is not supported by c4ify renderers.', {
      code: 'cli/unsupported-option',
      subject: { option: '--layout-json', type },
      supportedFixes: ['remove --layout-json'],
    });
  }

  if (layoutJson) {
    // Layout mode emits JSON without writing HTML; keep its unused target typed.
    const layoutOutput = path.join(os.tmpdir(), `archify-layout-${process.pid}-${type}.html`);
    const result = runNode([renderer, input, layoutOutput, '--layout-json'], {
      stdio: 'pipe',
      env: rendererEnv(quality, repoRoot, true),
    });
    if (result.status !== 0) {
      try {
        const receipt = JSON.parse(result.stdout);
        if (receipt?.contract && Array.isArray(receipt.diagnostics)) {
          process.stdout.write(`${JSON.stringify(receipt, null, 2)}\n`);
          process.exitCode = result.status ?? 1;
          return;
        }
      } catch {
        // Fall through to the renderer failure contract when no compiler
        // receipt was produced (for example, input JSON could not be read).
      }
      const failure = rendererFailure(result);
      reportValidateFailure({
        json,
        stage: failure.diagnostics.some((entry) => entry.code.startsWith('input/')) ? 'input' : 'render',
        type,
        input: path.resolve(input),
        error: failure.error,
        diagnostics: failure.diagnostics,
        status: result.status ?? 1,
      });
      return;
    }
    process.stdout.write(result.stdout);
    return;
  }

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'archify-validate-'));
  const out = path.join(tmp, `${type}.html`);
  let exitCode = 0;

  try {
    const render = runNode([renderer, input, out], {
      stdio: 'pipe',
      env: rendererEnv(quality, repoRoot, true),
    });
    if (render.status !== 0) {
      const failure = rendererFailure(render);
      reportValidateFailure({
        json,
        stage: failure.diagnostics.some((entry) => entry.code.startsWith('input/')) ? 'input' : 'render',
        type,
        input: path.resolve(input),
        error: failure.error,
        diagnostics: failure.diagnostics,
        status: render.status ?? 1,
      });
      exitCode = render.status ?? 1;
    } else {
      const check = runNode([path.join(skillRoot, 'scripts/check-render-output.mjs'), out], { stdio: 'pipe' });
      if (check.status !== 0) {
        let checker;
        try {
          checker = JSON.parse(check.stdout);
          checker.file = path.resolve(input);
        } catch {
          checker = { ok: false, diagnostic: 'Artifact checker failed without a parseable receipt.' };
        }
        reportValidateFailure({
          json,
          stage: 'check',
          type,
          input: path.resolve(input),
          error: 'Final artifact check failed.',
          diagnostics: checkerDiagnostics(checker),
          checker,
          status: check.status ?? 1,
        });
        exitCode = check.status ?? 1;
      } else {
        const result = JSON.parse(check.stdout);
        const engineeringProfile = engineeringProfileFromArtifact(fs.readFileSync(out));
        if (json) {
          console.log(JSON.stringify({
            schemaVersion: 1,
            ok: true,
            command: 'validate',
            type,
            input: path.resolve(input),
            checks: result.checks,
            composition: result.composition,
            ...(engineeringProfile ? { engineeringProfile } : {}),
          }, null, 2));
        } else {
          const engineering = engineeringProfile
            ? `; engineering ${engineeringProfile}: pass`
            : '';
          console.log(`ok ${type} ${path.resolve(input)} (${result.checks.length} artifact checks; composition ${result.composition.profile}: ${result.composition.summary.errors} errors, ${result.composition.summary.warnings} warnings${engineering})`);
        }
      }
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }

  if (exitCode !== 0) process.exitCode = exitCode;
}

const [command, ...rawArgs] = process.argv.slice(2);
const args = extractViewArgs(rawArgs);

try {
  switch (command) {
    case undefined:
    case '-h':
    case '--help':
    case 'help':
      console.log(usage());
      break;
    case 'render':
      commandRender(args);
      break;
    case 'deliver':
      if (!selectedView && allViewsRequested(args)) await commandAllViews('deliver', args);
      else await commandDeliver(args);
      break;
    case 'preview':
      await commandPreview(args);
      break;
    case 'validate':
      if (!selectedView && allViewsRequested(args)) await commandAllViews('validate', args);
      else commandValidate(args);
      break;
    case 'draft':
      await commandDraft(args);
      break;
    case 'check':
      commandCheck(args);
      break;
    case 'visual-check':
      await commandVisualCheck(args);
      break;
    case 'guide':
      await commandGuide(args);
      break;
    case 'brands':
      await commandBrands(args);
      break;
    case 'examples':
      commandExamples(args);
      break;
    case 'doctor':
      await commandDoctor(args);
      break;
    case 'demo':
      commandDemo(args);
      break;
    default:
      fail(`Unknown command "${command}".\n\n${usage()}`);
  }
} catch (error) {
  if (!error.archifyArgument) throw error;
  if (['validate', 'deliver'].includes(command) && args.includes('--json')) {
    reportArtifactArgumentFailure(command, error);
  } else {
    fail(error.message);
  }
}

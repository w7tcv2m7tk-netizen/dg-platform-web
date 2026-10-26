import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { builtinModules } from "node:module";
import path from "node:path";
import { test } from "node:test";
import ts from "typescript";

const component = readFileSync("src/components/commerce/DocumentBrandMark.tsx", "utf8");
const foundingInvite = readFileSync("src/components/founding/InviteToFounding10Form.tsx", "utf8");
const industryBusinessTypeManager = readFileSync("src/components/platform/IndustryBusinessTypeManager.tsx", "utf8");
const industryTemplateSwitcher = readFileSync("src/components/industry/IndustryTemplateSwitcher.tsx", "utf8");
const catalogueClientConsumers = [
  foundingInvite,
  industryBusinessTypeManager,
  industryTemplateSwitcher,
  readFileSync("src/components/settings/ConnectedServicesCatalog.tsx", "utf8"),
  readFileSync("src/components/settings/ConnectedServicesHealthOverview.tsx", "utf8"),
  readFileSync("src/components/platform/AppInstallToggle.tsx", "utf8"),
  readFileSync("src/components/onboarding/VipIndustryProfileSetup.tsx", "utf8"),
  readFileSync("src/components/onboarding/AdaptiveOnboardingJourney.tsx", "utf8"),
  readFileSync("src/components/settings/ReferAndEarnPanel.tsx", "utf8"),
  readFileSync("src/components/partner/CommissionIllustrator.tsx", "utf8"),
  readFileSync("src/components/founding/FoundingStageActions.tsx", "utf8"),
  readFileSync("src/components/command/CommandOpsHome.tsx", "utf8"),
  readFileSync("src/components/wantd/WantdHomeSearch.tsx", "utf8"),
  readFileSync("src/components/websites/WantdWantInput.tsx", "utf8"),
  readFileSync("src/components/delivery/PublicDeliveryPartnerInviteAccept.tsx", "utf8"),
  readFileSync("src/components/founding/PublicFoundingResellerInviteAccept.tsx", "utf8"),
  readFileSync("src/components/founding/PublicFoundingInviteAccept.tsx", "utf8"),
];

test("DocumentBrandMark imports branding helpers from the browser-safe leaf module", () => {
  assert.match(
    component,
    /import\s*\{[^}]*\bresolveLetterheadBrandAsset\b[^}]*\}\s*from\s*["']@dg\/platform-core\/org\/brand-theme["']/,
  );
  assert.doesNotMatch(component, /from\s*["']@dg\/platform-core["']/);
});

test("InviteToFounding10Form imports founding types and constants from their leaf module", () => {
  assert.match(
    foundingInvite,
    /import\s*\{[^}]*\bFOUNDING_SOURCE_LABELS\b[^}]*\bFOUNDING_SOURCES\b[^}]*\bFoundingSource\b[^}]*\}\s*from\s*["']@dg\/platform-core\/founding\/types["']/s,
  );
  assert.doesNotMatch(foundingInvite, /from\s*["']@dg\/platform-core["']/);
});

test("IndustryBusinessTypeManager imports catalogue helpers from their leaf module", () => {
  assert.match(
    industryBusinessTypeManager,
    /import\s*\{[^}]*\bgetIndustry\b[^}]*\bisTemplateActivatable\b[^}]*\blistIndustries\b[^}]*\}\s*from\s*["']@dg\/platform-core\/industry\/catalogue["']/s,
  );
  assert.match(
    industryBusinessTypeManager,
    /import\s+type\s+\{\s*ResolvedIndustryEntitlement\s*\}\s*from\s*["']@dg\/platform-core\/industry\/entitlements["']/,
  );
  assert.doesNotMatch(industryBusinessTypeManager, /from\s*["']@dg\/platform-core["']/);
});

test("client consumers of industry catalogue helpers avoid the server-capable barrel", () => {
  for (const source of catalogueClientConsumers) {
    assert.doesNotMatch(source, /from\s*["']@dg\/platform-core["']/);
  }
  assert.match(industryTemplateSwitcher, /@dg\/platform-core\/industry\/platform/);
  assert.match(industryTemplateSwitcher, /@dg\/platform-core\/industry\/entitlements/);
  assert.match(
    readFileSync("src/components/onboarding/VipIndustryProfileSetup.tsx", "utf8"),
    /@dg\/platform-core\/apps\/industry-taxonomy/,
  );
  assert.match(
    readFileSync("src/components/settings/ReferAndEarnPanel.tsx", "utf8"),
    /@dg\/platform-core\/referrals\/constants/,
  );
  const commissionIllustrator = readFileSync("src/components/partner/CommissionIllustrator.tsx", "utf8");
  assert.match(commissionIllustrator, /@dg\/platform-core\/partners\/programme/);
  assert.match(commissionIllustrator, /@dg\/platform-core\/partners\/commercial-model/);
  assert.match(commissionIllustrator, /@dg\/platform-core\/partners\/types/);
  const foundingStageActions = readFileSync("src/components/founding/FoundingStageActions.tsx", "utf8");
  assert.match(foundingStageActions, /@dg\/platform-core\/founding\/types/);
  assert.match(foundingStageActions, /@dg\/platform-core\/founding\/pipeline/);
  assert.match(foundingStageActions, /@dg\/platform-core\/founding\/urls/);
  const commandOpsHome = readFileSync("src/components/command/CommandOpsHome.tsx", "utf8");
  assert.match(commandOpsHome, /@dg\/platform-core\/command-centre\/presentation/);
  assert.match(commandOpsHome, /@dg\/platform-core\/command-centre\/types/);
  assert.match(commandOpsHome, /@dg\/platform-core\/command-centre\/sales-week/);
  for (const source of [
    readFileSync("src/components/wantd/WantdHomeSearch.tsx", "utf8"),
    readFileSync("src/components/websites/WantdWantInput.tsx", "utf8"),
  ]) {
    assert.match(source, /@dg\/platform-core\/wantd\/brand/);
  }
  assert.match(
    readFileSync("src/components/websites/WantdSiteChrome.tsx", "utf8"),
    /import\s+\{\s*WANTD_NAV\s*\}\s*from\s*["']@dg\/platform-core\/wantd\/brand["']/,
  );
  for (const source of [
    readFileSync("src/components/delivery/PublicDeliveryPartnerInviteAccept.tsx", "utf8"),
    readFileSync("src/components/founding/PublicFoundingResellerInviteAccept.tsx", "utf8"),
  ]) {
    assert.match(source, /@dg\/platform-core\/partners\/invite-copy/);
  }
  assert.match(
    readFileSync("src/components/founding/PublicFoundingInviteAccept.tsx", "utf8"),
    /@dg\/platform-core\/founding\/types/,
  );
  const adaptiveJourney = readFileSync("src/components/onboarding/AdaptiveOnboardingJourney.tsx", "utf8");
  assert.match(adaptiveJourney, /@dg\/platform-core\/onboarding\/gen2-journey/);
  assert.match(adaptiveJourney, /@dg\/platform-core\/billing\/paid-apps/);
  assert.match(adaptiveJourney, /@dg\/platform-core\/apps\/industry-taxonomy/);
  assert.match(adaptiveJourney, /@dg\/platform-core\/billing\/subscription-types/);
});

function sourceFilesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceFilesUnder(entryPath);
    return /\.[jt]sx?$/.test(entry.name) ? [entryPath] : [];
  });
}

test("client components do not runtime-import the server-capable platform-core root barrel", () => {
  const violations = [];

  for (const filePath of sourceFilesUnder("src")) {
    const source = readFileSync(filePath, "utf8");
    const scriptKind = filePath.endsWith(".tsx")
      ? ts.ScriptKind.TSX
      : filePath.endsWith(".jsx")
        ? ts.ScriptKind.JSX
        : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind);
    const isClientComponent = sourceFile.statements.some(
      (statement) =>
        ts.isExpressionStatement(statement) &&
        ts.isStringLiteral(statement.expression) &&
        statement.expression.text === "use client",
    );
    if (!isClientComponent) continue;

    for (const statement of sourceFile.statements) {
      if (
        !ts.isImportDeclaration(statement) ||
        !ts.isStringLiteral(statement.moduleSpecifier) ||
        statement.moduleSpecifier.text !== "@dg/platform-core"
      ) {
        continue;
      }

      const clause = statement.importClause;
      const hasRuntimeBinding =
        !clause ||
        (!clause.isTypeOnly &&
          (!!clause.name ||
            !clause.namedBindings ||
            ts.isNamespaceImport(clause.namedBindings) ||
            clause.namedBindings.elements.some((element) => !element.isTypeOnly)));

      if (hasRuntimeBinding) violations.push(path.relative(process.cwd(), filePath));
    }
  }

  assert.deepEqual([...new Set(violations)].sort(), []);
});

function runtimeModuleSpecifiers(sourceFile) {
  const specifiers = [];
  function visit(node) {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const hasRuntimeBinding =
        !clause ||
        (!clause.isTypeOnly &&
          (!!clause.name ||
            !clause.namedBindings ||
            ts.isNamespaceImport(clause.namedBindings) ||
            clause.namedBindings.elements.some((element) => !element.isTypeOnly)));
      if (hasRuntimeBinding) specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      !node.isTypeOnly &&
      (!node.exportClause ||
        ts.isNamespaceExport(node.exportClause) ||
        node.exportClause.elements.some((element) => !element.isTypeOnly))
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    } else if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "require" &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sourceFile);
  return specifiers;
}

function sourceFileFor(filePath, options) {
  const text = readFileSync(filePath, "utf8");
  const scriptKind = filePath.endsWith(".tsx")
    ? ts.ScriptKind.TSX
    : filePath.endsWith(".jsx")
      ? ts.ScriptKind.JSX
      : ts.ScriptKind.TS;
  return ts.createSourceFile(filePath, text, options.target ?? ts.ScriptTarget.Latest, true, scriptKind);
}

function resolveWorkspaceModule(fromFile, specifier, options) {
  const normalizedBuiltin = specifier.replace(/^node:/, "");
  const knownBuiltins = new Set(builtinModules.map((name) => name.replace(/^node:/, "")));
  if (knownBuiltins.has(normalizedBuiltin)) return { builtin: specifier };
  const resolved = ts.resolveModuleName(specifier, fromFile, options, ts.sys).resolvedModule;
  if (!resolved) return null;
  const filePath = path.resolve(resolved.resolvedFileName);
  if (filePath.includes(`${path.sep}node_modules${path.sep}`)) return null;
  return { filePath };
}

function reconstructPath(filePath, parents) {
  const result = [];
  let current = filePath;
  while (current) {
    result.push(current);
    current = parents.get(current);
  }
  return result.reverse().map((item) => path.relative(process.cwd(), item));
}

test("client runtime graphs do not reach the platform-core root barrel", () => {
  const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  assert.ifError(config.error);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const options = parsed.options;
  const rootBarrel = path.resolve("packages/platform-core/src/index.ts");
  const clientEntries = sourceFilesUnder("src").filter((filePath) => {
    const sourceFile = sourceFileFor(filePath, options);
    return sourceFile.statements.some(
      (statement) =>
        ts.isExpressionStatement(statement) &&
        ts.isStringLiteral(statement.expression) &&
        statement.expression.text === "use client",
    );
  });
  const rootPaths = [];

  for (const entry of clientEntries) {
    const start = path.resolve(entry);
    const queue = [start];
    const parents = new Map([[start, null]]);
    while (queue.length) {
      const current = queue.shift();
      const sourceFile = sourceFileFor(current, options);
      for (const specifier of runtimeModuleSpecifiers(sourceFile)) {
        const resolved = resolveWorkspaceModule(current, specifier, options);
        if (!resolved?.filePath) continue;
        if (resolved.filePath === rootBarrel) {
          rootPaths.push([
            ...reconstructPath(current, parents),
            "@dg/platform-core",
            path.relative(process.cwd(), rootBarrel),
          ]);
          continue;
        }
        if (!parents.has(resolved.filePath)) {
          parents.set(resolved.filePath, current);
          queue.push(resolved.filePath);
        }
      }
    }
  }

  const uniquePaths = [...new Map(rootPaths.map((chain) => [chain.join(" -> "), chain])).values()];
  assert.deepEqual(
    uniquePaths,
    [],
    `Client dependency paths reach the server-capable root barrel:\n${uniquePaths
      .map((chain) => `- ${chain.join(" -> ")}`)
      .join("\n")}`,
  );
});

test("the platform-core root export graph's Node built-ins are visible to the boundary audit", () => {
  const config = ts.readConfigFile("tsconfig.json", ts.sys.readFile);
  assert.ifError(config.error);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, process.cwd());
  const options = parsed.options;
  const rootBarrel = path.resolve("packages/platform-core/src/index.ts");
  const queue = [rootBarrel];
  const parents = new Map([[rootBarrel, null]]);
  const builtinPaths = [];

  while (queue.length) {
    const current = queue.shift();
    const sourceFile = sourceFileFor(current, options);
    for (const specifier of runtimeModuleSpecifiers(sourceFile)) {
      const resolved = resolveWorkspaceModule(current, specifier, options);
      if (resolved?.builtin) {
        builtinPaths.push([
          ...reconstructPath(current, parents),
          resolved.builtin,
        ]);
      } else if (
        resolved?.filePath &&
        resolved.filePath.startsWith(path.resolve("packages/platform-core/src") + path.sep) &&
        !parents.has(resolved.filePath)
      ) {
        parents.set(resolved.filePath, current);
        queue.push(resolved.filePath);
      }
    }
  }

  assert.ok(
    builtinPaths.length > 0,
    "Expected the root barrel's runtime graph to expose Node built-ins for boundary diagnostics.",
  );
});

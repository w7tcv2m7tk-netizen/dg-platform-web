import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { builtinModules } from "node:module";
import { test } from "node:test";
import ts from "typescript";

// Check the actual runtime module graph, not spelling of individual imports.
// Types disappear during compilation; export-star runtime edges still count.
test("EnabledAppsProvider runtime dependencies cannot reach Node/server modules", () => {
  const root = process.cwd();
  const visited = new Set();
  const builtins = new Set([...builtinModules, ...builtinModules.map(x => `node:${x}`)]);
  function resolve(specifier, current) {
    const base = specifier.startsWith("@dg/platform-core/")
      ? path.join(root, "packages/platform-core/src", specifier.slice("@dg/platform-core/".length))
      : specifier === "@dg/platform-core" ? path.join(root, "packages/platform-core/src/index")
      : specifier.startsWith("@/") ? path.join(root, "src", specifier.slice(2))
      : specifier.startsWith(".") ? path.resolve(path.dirname(current), specifier) : null;
    if (!base) return null;
    const resolved = [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(p => existsSync(p) && /\.(ts|tsx)$/.test(p));
    assert.ok(resolved, `Unresolved runtime dependency ${specifier}`);
    return resolved;
  }
  function walk(current, chain) {
    if (visited.has(current)) return;
    visited.add(current);
    const source = ts.createSourceFile(current, readFileSync(current, "utf8"), ts.ScriptTarget.Latest, true);
    function edge(specifier) {
      const trace = [...chain, path.relative(root, current), specifier].join(" -> ");
      assert.ok(!builtins.has(specifier) && !specifier.startsWith("node:"), trace);
      assert.ok(!["server-only", "@dg/database", "@prisma/client"].includes(specifier), trace);
      const target = resolve(specifier, current);
      if (target) walk(target, [...chain, path.relative(root, current)]);
    }
    for (const node of source.statements) {
      if (ts.isImportDeclaration(node)) {
        if (node.importClause?.isTypeOnly) continue;
        const bindings = node.importClause?.namedBindings;
        if (!node.importClause?.name && bindings && ts.isNamedImports(bindings)
          && bindings.elements.every(e => e.isTypeOnly)) continue;
        edge(node.moduleSpecifier.text);
      }
      if (ts.isExportDeclaration(node) && node.moduleSpecifier && !node.isTypeOnly) {
        if (node.exportClause && ts.isNamedExports(node.exportClause) && node.exportClause.elements.every(e => e.isTypeOnly)) continue;
        edge(node.moduleSpecifier.text);
      }
    }
    function dynamic(node) {
      if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
        || (ts.isIdentifier(node.expression) && node.expression.text === "require"))) {
        assert.ok(node.arguments[0] && ts.isStringLiteral(node.arguments[0]), "Client dependency must be statically inspectable");
        edge(node.arguments[0].text);
      }
      ts.forEachChild(node, dynamic);
    }
    dynamic(source);
  }
  walk(path.join(root, "src/components/platform/EnabledAppsProvider.tsx"), []);
  assert.ok(visited.size > 5, "Transitive graph was inspected");
});

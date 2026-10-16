import fs from 'node:fs';
import assert from 'node:assert/strict';
// Approved 12 October 2026: one order in the manifest and existing shared shell.
// Execute the actual literal configuration, not a separately maintained fixture nav.
const { default: ts } = await import('typescript');
const { runInNewContext } = await import('node:vm');
const { default: test } = await import('node:test');
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);
const expectedTabs = [
  ['Overview', '/apps/prospecting'],
  ['Discover', '/apps/prospecting/discovery'],
  ['Prospects', '/apps/prospecting/prospects'],
  ['Pipeline', '/apps/prospecting/pipeline'],
  ['Today', '/apps/prospecting/today'],
  ['Activity', '/apps/prospecting/activity'],
];
function configuredRoutes(file, key) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
  let object;
  function visit(node) {
    if ((ts.isPropertyAssignment(node) || ts.isVariableDeclaration(node)) && node.name?.getText(source) === key && ts.isObjectLiteralExpression(node.initializer)) object = node.initializer;
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.ok(object, `Missing existing ${key} configuration`);
  const routes = object.properties.find(property => property.name?.getText(source) === 'routes');
  return JSON.parse(JSON.stringify(runInNewContext(`(${routes.initializer.getText(source)})`)));
}
const shellRoutes = configuredRoutes('packages/platform-core/src/apps/navigation.ts', 'prospecting');
const manifestRoutes = configuredRoutes('packages/platform-core/src/apps/builtins/prospecting.ts', 'prospectingApp');
test('shared Prospecting tabs follow the approved order', () => assert.deepEqual(shellRoutes.map(({label,path}) => [label,path]), expectedTabs));
test('Prospecting manifest agrees with the shared navigation order', () => assert.deepEqual(manifestRoutes.map(({label,path}) => [label,path]), expectedTabs));
test('existing legacy route aliases remain intact', () => {
  for (const [label, alias] of [['Overview','/command/growth-engine'],['Pipeline','/command/growth-engine/pipeline'],['Today','/command/sales-week'],['Activity','/command/growth-engine/follow-ups']]) assert.ok(shellRoutes.find(route => route.label === label).matchAlso.includes(alias));
});
function load(file, dependencies) {
  const loaded = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  runInNewContext(code, { module: loaded, exports: loaded.exports, require: name => {
    if (!(name in dependencies)) throw new Error(`Unexpected dependency ${name}`);
    return dependencies[name];
  }, URLSearchParams });
  return loaded.exports;
}
const matching = load('packages/platform-core/src/apps/active-nav.ts', { './route-tree': load('packages/platform-core/src/apps/route-tree.ts', {}) });
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');
function navigationMarkup(pathname) {
  const component = load('src/components/navigation/AppHorizontalSubnav.tsx', {
    'react': React, 'react/jsx-runtime': require('react/jsx-runtime'),
    'next/navigation': { usePathname: () => pathname, useSearchParams: () => new URLSearchParams() },
    'next/link': { default: ({children,...props}) => React.createElement('a',props,children) },
    '@/components/ShellNavLink': { ShellNavLink: ({children,href,className}) => React.createElement('a',{href,className:className(false)},children) },
    '@/lib/nav-route-match': matching,
  });
  return renderToStaticMarkup(React.createElement(component.AppHorizontalSubnav,{routes:shellRoutes,ariaLabel:'Prospecting sections'}));
}
for (const [label, pathname] of expectedTabs) test(`${label} retains its page and unique active tab`, () => {
  assert.ok(fs.existsSync(`src/app/(shell)${pathname}/page.tsx`));
  assert.deepEqual(shellRoutes.filter(route => matching.routeIsActive(pathname,route.path,shellRoutes)).map(route=>route.label),[label]);
  const html = navigationMarkup(pathname);
  assert.equal((html.match(/<a /g) || []).length, 6);
  assert.equal((html.match(/font-medium/g) || []).length, 1);
  assert.match(html,/flex-wrap/);
});
if (process.argv.includes('--nav-browser')) {
  const { chromium } = await import('playwright');
  const css = fs.readdirSync('.next/static/chunks').filter(file=>file.endsWith('.css')).map(file=>fs.readFileSync(`.next/static/chunks/${file}`,'utf8')).join('\n');
  for (const width of [390,1440]) test(`approved tabs render in order at ${width}px with each route highlighted`, async () => {
    const browser = await chromium.launch({headless:true});
    try {
      const page = await browser.newPage({viewport:{width,height:800}});
      for (const [active,pathname] of expectedTabs) {
        await page.setContent(`<style>${css}</style><div class="max-w-full p-4">${navigationMarkup(pathname)}</div>`);
        assert.deepEqual(await page.getByRole('navigation').getByRole('link').allTextContents(),expectedTabs.map(([label])=>label));
        assert.equal(await page.locator('nav a.font-medium').innerText(),active);
        assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth));
      }
    } finally { await browser.close(); }
  });
}

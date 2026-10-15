import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import { retrieveBriefing } from '../src/lib/business-briefing/retrieval.ts';
import { briefingEnabled, safeSourceUrl } from '../src/lib/business-briefing/contract.ts';
import { buildAccessContext, hasPermission } from '../packages/platform-core/src/access/index.ts';
const scope = { organisationId: 'org-a', businessId: 'org-a' };
const now = Date.parse('2026-10-09T00:00:00Z');
const fixture = () => ({ ...scope, version: 1, id: 'test-only', industry: 'real-estate', geography: 'Brisbane', headline: 'Test evidence', generatedAt: '2026-10-08T00:00:00Z', expiresAt: '2026-10-10T00:00:00Z', sources: [{ id: 's', kind: 'external', label: 'Test source', reference: 'Test reference', url: 'https://example.com/evidence', observedAt: '2026-10-08T00:00:00Z' }], insights: [1,2,3].map(n => ({ id: String(n), category: 'industry', title: 'Test', whyItMatters: 'Test rationale', nextAction: 'Review evidence', uncertainty: 'Test uncertainty', sourceIds: ['s'] })) });
const get = (read, overrides = {}) => retrieveBriefing({ enabled: true, authorisedScope: scope, canView: true, now, read, ...overrides });

async function loadComponent(path, dependencies = {}, globals = {}) {
  const { default: ts } = await import('typescript');
  const require = createRequire(import.meta.url);
  const testModule = { exports: {} };
  const code = ts.transpileModule(readFileSync(path, 'utf8'), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  }).outputText;
  runInNewContext(code, { ...globals, module: testModule, exports: testModule.exports,
    require: id => Object.hasOwn(dependencies, id) ? dependencies[id] : require(id) });
  return testModule.exports;
}

test('server boundary skips authentication when OFF and re-resolves scope after organisation switching', async () => {
  const env = {};
  let session = null, contextReads = 0;
  const requests = [];
  const server = await loadComponent('src/lib/business-briefing/server.ts', {
    'server-only': {},
    '@dg/platform-core/access': { buildAccessContext, hasPermission },
    '@/lib/platform-page-context': { getPlatformPageContext: async () => { contextReads++; return { session }; } },
    './contract': { briefingEnabled },
    './retrieval': { retrieveBriefing: input => { requests.push(input); return retrieveBriefing(input); } },
  }, { process: { env } });
  assert.equal((await server.getBusinessBriefing()).status, 'disabled');
  assert.equal(contextReads, 0);
  env.AIDA_BUSINESS_BRIEFING_ENABLED = 'true';
  assert.equal((await server.getBusinessBriefing()).status, 'forbidden');
  for (const organisationId of ['org-a', 'org-b', 'org-a']) {
    session = { organisationId, role: 'member', clerkUserId: 'user-a', permissionGrants: [] };
    assert.equal((await server.getBusinessBriefing()).status, 'empty');
    const request = requests.at(-1);
    assert.equal(request.authorisedScope.organisationId, organisationId);
    assert.equal(request.authorisedScope.businessId, organisationId);
    assert.equal(request.canView, true);
  }
  session = null;
  assert.equal((await server.getBusinessBriefing()).status, 'forbidden');
  assert.equal(contextReads, 5);
});

test('Ask Aida only drafts chat; playback and microphone APIs are never invoked', async () => {
  const drafts = [];
  const unexpected = () => assert.fail('media activation is outside this feature');
  const { BusinessBriefing } = await loadComponent('src/components/overview/BusinessBriefing.tsx', {
    '@/components/platform/ChatWidgetProvider': { useChatWidget: () => ({ openSupportChat: draft => drafts.push(draft) }) },
    '@/lib/business-briefing/contract': { safeSourceUrl },
  }, { navigator: { mediaDevices: { getUserMedia: unexpected } },
    speechSynthesis: { speak: unexpected }, Audio: unexpected, MediaRecorder: unexpected });
  const flatten = node => Array.isArray(node) ? node.flatMap(flatten) : node?.props ? [node, ...flatten(node.props.children)] : [];
  for (const state of [{ status: 'empty' }, { status: 'ready', briefing: fixture() }]) {
    const nodes = flatten(BusinessBriefing({ state }));
    const buttons = nodes.filter(n => n.type === 'button');
    assert.equal(buttons[0].props.disabled, true);
    assert.equal(buttons[0].props.onClick, undefined);
    assert.equal(drafts.length, state.status === 'empty' ? 0 : 1);
    buttons[1].props.onClick();
    assert.equal(nodes.find(n => n.type === 'a' && n.props.href === '#growth-opportunities').props.href, '#growth-opportunities');
  }
  assert.equal(drafts.length, 2);
  assert.match(drafts[0], /business evidence and industry sources/);
  assert.match(drafts[1], /2026-10-08/);
});

test('rendered dashboard preserves Growth Performance with OFF, empty and forbidden briefing states', async () => {
  const { createElement } = await import('react');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { BusinessBriefing } = await loadComponent('src/components/overview/BusinessBriefing.tsx', {
    '@/components/platform/ChatWidgetProvider': { useChatWidget: () => ({ openSupportChat: () => {} }) },
    '@/lib/business-briefing/contract': { safeSourceUrl },
  });
  const { BusinessOverviewDashboard } = await loadComponent('src/components/overview/BusinessOverviewDashboard.tsx', {
    'next/link': { default: ({ children, ...props }) => createElement('a', props, children) },
  });
  const overview = { priorities: [], insights: [], timeline: [], snapshot: [], goals: [],
    recommendedActions: [], growthOpportunities: [], connectedSystems: [], scoreBreakdown: [],
    healthTrend: [], scoresLive: false, greeting: 'Hello', organisationName: 'Synthetic test organisation' };
  for (const status of ['disabled', 'forbidden', 'empty']) {
    const html = renderToStaticMarkup(createElement(BusinessOverviewDashboard, { overview,
      growthScorecard: createElement('section', null, 'Growth Performance'),
      businessBriefing: createElement(BusinessBriefing, { state: { status } }) }));
    assert.match(html, /Growth Performance/);
    if (status === 'empty') {
      assert.match(html, /No verified business briefing/);
      assert.ok(html.indexOf('Your Business Briefing') < html.indexOf('Growth Performance'));
    } else assert.doesNotMatch(html, /Your Business Briefing|Listen to Briefing/);
  }
});
test('flag defaults OFF and accepts only explicit true', async () => {
  for (const v of [undefined, '', 'false', '1', 'TRUE']) assert.equal(briefingEnabled(v), false);
  assert.equal(briefingEnabled('true'), true);
  assert.deepEqual(await get(() => { throw Error('must not read'); }, { enabled: false }), { status: 'disabled' });
});
test('auth and permissions fail closed before reading', async () => {
  for (const overrides of [{canView:false}, {authorisedScope:null}]) assert.deepEqual(await get(() => { throw Error('must not read'); }, overrides), {status:'forbidden'});
  const access = buildAccessContext({ role: 'member', organisationId: 'org-a', principalId: 'user-a', enabledAppIds: [] });
  assert.equal(hasPermission(access, {module:'intelligence', action:'view', scope:'organisation'}), true);
  assert.equal(hasPermission(access, {module:'billing', action:'manage', scope:'organisation'}), false);
});
test('repository receives authenticated business scope and rejects mismatches', async () => {
  assert.equal((await get(async received => { assert.deepEqual(received, scope); return fixture(); })).status, 'ready');
  for (const changed of [{organisationId:'org-b'}, {businessId:'business-b'}]) assert.equal((await get(async () => ({...fixture(), ...changed}))).status, 'error');
});
test('empty, stale and failed retrieval have explicit states', async () => {
  assert.equal((await get(async()=>null)).status,'empty');
  assert.equal((await get(async()=>{throw Error('secret database details');})).status,'error');
  assert.equal((await get(async()=>fixture(), {now:Date.parse('2026-10-11')})).status,'empty');
});
test('every insight requires resolvable attribution and safe external links', async () => {
  for (const mutate of [b=>b.insights[0].sourceIds=[], b=>b.insights[0].sourceIds=['unknown'], b=>b.sources[0].url='javascript:alert(1)', b=>b.sources[0].reference='']) {
    const b=fixture(); mutate(b); assert.equal((await get(async()=>b)).status,'error');
  }
  assert.equal(safeSourceUrl('http://example.com'),undefined);
  assert.equal(safeSourceUrl('https://user:pass@example.com'),undefined);
});
test('dashboard ordering, existing chat and server/client boundary', () => {
  const dashboard=readFileSync('src/components/overview/BusinessOverviewDashboard.tsx','utf8');
  assert.ok(dashboard.indexOf('{businessBriefing}') < dashboard.indexOf('{growthScorecard}'));
  const client=readFileSync('src/components/overview/BusinessBriefing.tsx','utf8');
  assert.ok(client.includes('openSupportChat('));
  assert.ok(client.includes('safeSourceUrl(source.url)'));
  assert.ok(client.includes('No verified business briefing'));
  assert.ok(client.includes('state.status === "disabled" || state.status === "forbidden"'));
  assert.ok(!/business-briefing\/server|@dg\/database|@dg\/platform-core|process\.env|getUserMedia/.test(client));
  const server=readFileSync('src/lib/business-briefing/server.ts','utf8');
  assert.ok(server.includes('import "server-only"'));
  assert.ok(server.includes('principalId: session.clerkUserId'));
  assert.ok(server.includes('read: async () => null'));
});

test('presentation renders honest empty/loading/error and attributed ready output', async () => {
  const { default: ts } = await import('typescript');
  const { createRequire } = await import('node:module');
  const { runInNewContext } = await import('node:vm');
  const { renderToStaticMarkup } = await import('react-dom/server');
  const { createElement } = await import('react');
  const require = createRequire(import.meta.url);
  const testModule = {exports:{}};
  const code = ts.transpileModule(readFileSync('src/components/overview/BusinessBriefing.tsx','utf8'), {compilerOptions:{jsx:ts.JsxEmit.ReactJSX,module:ts.ModuleKind.CommonJS}}).outputText;
  runInNewContext(code, {module: testModule, exports:testModule.exports, require: id => id.includes('ChatWidgetProvider') ? {useChatWidget:()=>({openSupportChat:()=>{}})} : id.includes('business-briefing/contract') ? {safeSourceUrl} : require(id)});
  const render = state => renderToStaticMarkup(createElement(testModule.exports.BusinessBriefing,{state}));
  assert.equal(render({status:'disabled'}),'');
  assert.equal(render({status:'forbidden'}),'');
  assert.match(render({status:'empty'}),/No verified business briefing/);
  assert.match(render({status:'loading'}),/aria-busy="true"/);
  assert.match(render({status:'error'}),/role="alert"/);
  const html=render({status:'ready',briefing:fixture()});
  assert.match(html,/https:\/\/example.com\/evidence/);
  assert.match(html,/Test reference/);
  assert.match(html,/Last updated/);
  assert.match(html,/disabled=""/);
});

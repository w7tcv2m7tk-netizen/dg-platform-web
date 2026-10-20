import assert from 'node:assert/strict';
import { test } from 'node:test';
import { evaluateEnvironmentPairing } from './env-pairing.mjs';
const fixture = () => ({ DG_LOCAL_SYNTHETIC:'1', NODE_ENV:'development', DG_NEON_ENV:'development', DATABASE_URL:'postgresql://synthetic@127.0.0.1:55439/dg_synthetic_prospecting?connection_limit=2', NEXT_PUBLIC_APP_URL:'http://127.0.0.1:3400', CLERK_SECRET_KEY:'sk_test_fixture', NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_test_fixture' });
test('explicit unhosted local synthetic development context succeeds',()=> assert.equal(evaluateEnvironmentPairing(fixture()).ok,true));
for (const [name,patch] of Object.entries({
 'production runtime':{NODE_ENV:'production'}, 'test runtime':{NODE_ENV:'test'},
 'hosted production':{VERCEL_ENV:'production'}, 'hosted preview':{VERCEL_ENV:'preview'},
 'Vercel marker':{VERCEL:'1'}, 'CI runner':{CI:'true'},
 'live Clerk secret':{CLERK_SECRET_KEY:'sk_live_fixture'}, 'live Clerk public':{NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_live_fixture'},
 'missing test key':{CLERK_SECRET_KEY:undefined}, 'production declaration':{DG_NEON_ENV:'production'},
 'remote database':{DATABASE_URL:'postgresql://synthetic@example.com:55439/dg_synthetic_prospecting'},
 'remote direct URL':{DIRECT_URL:'postgresql://synthetic@example.com:55439/dg_synthetic_prospecting'},
 'routing override':{DATABASE_URL:fixture().DATABASE_URL+'&host=example.com'},
 'routing options':{DATABASE_URL:fixture().DATABASE_URL+'&options=host%3Dexample.com'},
 'default port':{DATABASE_URL:'postgresql://synthetic@127.0.0.1:5432/dg_synthetic_prospecting'},
 'non-disposable database':{DATABASE_URL:'postgresql://synthetic@127.0.0.1:55439/production'},
 'lookalike loopback host':{DATABASE_URL:'postgresql://synthetic@127.0.0.1.example.com:55439/dg_synthetic_prospecting'},
 'remote application':{NEXT_PUBLIC_APP_URL:'https://app.digitalgate.com.au'},
 'live Stripe':{STRIPE_SECRET_KEY:'sk_live_fixture'}, 'test Stripe':{STRIPE_SECRET_KEY:'sk_test_fixture'},
 'production auth proxy':{CLERK_PROXY_URL:'https://digitalgate.com.au/__clerk'},
 'missing explicit opt-in':{DG_LOCAL_SYNTHETIC:undefined},
})) test(`local mode rejects ${name}`,()=>assert.equal(evaluateEnvironmentPairing({...fixture(),...patch}).ok,false));
test('local diagnostics do not disclose credentials or connection URLs',()=>{
 const env={...fixture(),DATABASE_URL:'postgresql://sensitive:never_log_me@example.com:55439/dg_synthetic_prospecting'};
 assert.doesNotMatch(JSON.stringify(evaluateEnvironmentPairing(env)),/never_log_me|postgresql:\/\//);
});
test('ordinary production pairing remains unchanged',()=>{
 const env={NODE_ENV:'production',DG_NEON_ENV:'production',DATABASE_URL:'postgresql://u:p@ep-bold-tree-a7bny92m.ap-southeast-2.aws.neon.tech/neondb',CLERK_SECRET_KEY:'sk_live_fixture',NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_live_fixture'};
 assert.equal(evaluateEnvironmentPairing(env).ok,true);
 assert.equal(evaluateEnvironmentPairing({...env,DG_LOCAL_SYNTHETIC:'1'}).ok,false);
});

test('localhost application origin is accepted without permitting hostname DB routing',()=>{
 assert.equal(evaluateEnvironmentPairing({...fixture(),NEXT_PUBLIC_APP_URL:'http://localhost:3400'}).ok,true);
 assert.equal(evaluateEnvironmentPairing({...fixture(),DATABASE_URL:'postgresql://u@localhost:55439/dg_synthetic_test'}).ok,false);
});

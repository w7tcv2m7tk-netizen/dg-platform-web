import assert from 'node:assert/strict';
import {test} from 'node:test';
import {classifyNeonHost,evaluateEnvironmentPairing,verifyLocalCheckoutCertificationDatabase} from './env-pairing.mjs';
const nonce='a'.repeat(64);
const database='dg_checkout_certification_012345abcdef';
const url=`postgresql://fixture@127.0.0.1:55432/${database}?connect_timeout=3&pool_timeout=1&socket_timeout=5&connection_limit=4`;
const base={NODE_ENV:'development',DG_LOCAL_CHECKOUT_CERTIFICATION:'authorised-disposable',DG_NEON_ENV:'development',DATABASE_URL:url,DATABASE_URL_UNPOOLED:url,DG_CHECKOUT_CERTIFICATION_NONCE:nonce,CLERK_SECRET_KEY:'sk_test_fixture',NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_test_fixture',STRIPE_SECRET_KEY:'sk_test_fixture',NEXT_PUBLIC_APP_URL:'http://localhost:35432'};
const identity={nonce,database,address:'127.0.0.1',port:55432};
test('explicit local authorisation is separate from Neon identity and requires database ownership',async()=>{
 const config=evaluateEnvironmentPairing(base);assert.equal(config.ok,true);assert.equal(config.neonHost,'unknown');assert.equal(config.neonEndpointId,null);assert.equal(classifyNeonHost(url,base).class,'unknown');
 let reads=0;await verifyLocalCheckoutCertificationDatabase(base,async()=>{reads++;return [identity];});assert.equal(reads,1);
});
for(const [label,patch] of [
 ['missing authorisation',{DG_LOCAL_CHECKOUT_CERTIFICATION:undefined}],['wrong authorisation',{DG_LOCAL_CHECKOUT_CERTIFICATION:'true'}],
 ['production runtime',{NODE_ENV:'production'}],['missing runtime',{NODE_ENV:undefined}],['hosted target',{VERCEL_TARGET_ENV:'production'}],['test runtime',{NODE_ENV:'test'}],['Vercel preview',{VERCEL_ENV:'preview'}],['Vercel production',{VERCEL_ENV:'production'}],['hosted flag',{VERCEL:'1'}],['hosted URL',{VERCEL_URL:'example.vercel.app'}],['CI',{CI:'true'}],
 ['missing declaration',{DG_NEON_ENV:undefined}],['production declaration',{DG_NEON_ENV:'production'}],['live Clerk',{CLERK_SECRET_KEY:'sk_live_fixture'}],['missing Clerk public key',{NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:undefined}],['live Stripe',{STRIPE_SECRET_KEY:'sk_live_fixture'}],
 ['missing nonce',{DG_CHECKOUT_CERTIFICATION_NONCE:undefined}],['production URL',{DATABASE_URL:'postgresql://fixture@ep-bold-tree-a7bny92m.ap-southeast-2.aws.neon.tech/neondb'}],
 ['unpooled mismatch',{DATABASE_URL_UNPOOLED:url.replace('55432','55433')}],['default port',{DATABASE_URL:url.replace('55432','5432'),DATABASE_URL_UNPOOLED:url.replace('55432','5432')}],
 ['non-disposable database',{DATABASE_URL:url.replace(database,'neondb'),DATABASE_URL_UNPOOLED:url.replace(database,'neondb')}],
 ['unbounded query',{DATABASE_URL:url.replace('socket_timeout=5','socket_timeout=0'),DATABASE_URL_UNPOOLED:url.replace('socket_timeout=5','socket_timeout=0')}],
 ['connection override',{DATABASE_URL:url+'&host=production',DATABASE_URL_UNPOOLED:url+'&host=production'}],['production app origin',{NEXT_PUBLIC_APP_URL:'https://app.digitalgate.com.au'}],['production auth proxy',{CLERK_PROXY_URL:'https://digitalgate.com.au/__clerk'}],
])test(`${label} fails closed`,async()=>{const env={...base,...patch};assert.equal(evaluateEnvironmentPairing(env).ok,false);let calls=0;await assert.rejects(verifyLocalCheckoutCertificationDatabase(env,async()=>{calls++;return [identity];}));assert.equal(calls,0);});
for(const [label,rows] of [['wrong nonce',[{...identity,nonce:'b'.repeat(64)}]],['wrong database',[{...identity,database:'neondb'}]],['wrong server',[{...identity,address:'10.0.0.1'}]],['wrong port',[{...identity,port:5432}]],['missing identity',[]]])test(`${label} denies runtime startup`,async()=>{await assert.rejects(verifyLocalCheckoutCertificationDatabase(base,async()=>rows),/ownership verification failed/);});
test('database errors are sanitised',async()=>{await assert.rejects(verifyLocalCheckoutCertificationDatabase(base,async()=>{throw Error('postgresql://secret:password@host/db sk_test_secret');}),error=>{assert.equal(error.message,'Disposable database ownership verification failed');return true;});});

test('without the explicit exception, all original Neon pairing restrictions still apply',()=>{
 const ordinary={...base};delete ordinary.DG_LOCAL_CHECKOUT_CERTIFICATION;assert.equal(evaluateEnvironmentPairing(ordinary).ok,false);
 const prod={...ordinary,NODE_ENV:'production',DG_NEON_ENV:'production',DATABASE_URL:'postgresql://fixture@ep-bold-tree-a7bny92m.ap-southeast-2.aws.neon.tech/neondb',CLERK_SECRET_KEY:'sk_live_fixture',NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:'pk_live_fixture'};assert.equal(evaluateEnvironmentPairing(prod).ok,true);
});

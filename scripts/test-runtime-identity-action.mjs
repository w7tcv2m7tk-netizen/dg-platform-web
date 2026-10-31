import {test,mock} from 'node:test';
import assert from 'node:assert/strict';
mock.module('next/cache.js',{namedExports:{unstable_noStore:()=>{}}});
const {readRuntimeIdentity}=await import('../src/app/(shell)/command/runtime-identity/actions.ts');
test('retired action never provides a grant-free diagnostic',async()=>{assert.deepEqual(await readRuntimeIdentity(),{status:'denied'});});

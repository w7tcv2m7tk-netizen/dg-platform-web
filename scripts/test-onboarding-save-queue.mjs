import assert from 'node:assert/strict';
import {test} from 'node:test';
import {createOnboardingSaveQueue} from '../src/lib/onboarding/save-queue.ts';
const delay=()=>new Promise(resolve=>setTimeout(resolve,5));
test('profile and review-position saves retain both settings with no overlapping writes',async()=>{
  let row={profile:{},premiumApps:['growth_suite']},active=0,peak=0;
  const queue=createOnboardingSaveQueue(async(url,init)=>{
    active++;peak=Math.max(peak,active);const snapshot=structuredClone(row);await delay();
    const body=JSON.parse(init.body);
    row=url.endsWith('/state')?{...snapshot,...body}:{...snapshot,profile:body.profile};
    active--;return new Response('{}');
  });
  const draft=queue.saveDraft({businessName:'Synthetic Finance'},{premiumApps:['reviews'],journeyPosition:{stage:'order_summary'}},{},()=>true);
  const step=queue.run(async()=>{const snapshot=structuredClone(row);await delay();row={...snapshot,stepComplete:true};});
  await Promise.all([draft,step]);assert.equal(peak,1);assert.equal(row.profile.businessName,'Synthetic Finance');
  assert.deepEqual(row.premiumApps,['reviews']);assert.equal(row.journeyPosition.stage,'order_summary');assert.equal(row.stepComplete,true);
});
test('a superseded draft cannot overwrite a later basket or stage',async()=>{
  let current=true,calls=0;const queue=createOnboardingSaveQueue(async()=>{calls++;return new Response('{}');});
  const blocker=queue.run(async()=>{await delay();current=false;});
  await Promise.all([blocker,queue.saveDraft({},{premiumApps:['growth_suite']},{},()=>current)]);assert.equal(calls,0);
});
test('profile failure reports failure and prevents the dependent state write',async()=>{
  const calls=[];const queue=createOnboardingSaveQueue(async url=>{calls.push(url);return new Response('{}',{status:403});});
  assert.equal(await queue.saveDraft({},{},{},()=>true),false);assert.deepEqual(calls,['/api/v1/onboarding/gen2']);
});
test('state failure is visible and a rejected save does not poison later retries',async()=>{
  let calls=0;const queue=createOnboardingSaveQueue(async()=>{calls++;return new Response('{}',{status:calls===2?500:200});});
  assert.equal(await queue.saveDraft({},{},{},()=>true),false);
  await assert.rejects(queue.run(async()=>{throw Error('network');}),/network/);
  assert.equal(await queue.saveDraft({},{},{},()=>true),true);
});

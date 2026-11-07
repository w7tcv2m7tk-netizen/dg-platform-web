import assert from 'node:assert/strict';
import {test} from 'node:test';
import {verifyCheckoutAdmission, CheckoutAdmissionDenied, checkoutAdmissionTermsHash} from '../packages/platform-core/src/billing/checkout-admission.ts';
import {admitPlatformCheckout, CheckoutTemporarilyUnavailable} from '../packages/platform-core/src/billing/checkout-creation-gate.ts';

// Exercise the actual admission function with no provider or database connection.
for (const blocked of [false,true]) for (const held of [false,true]) {
  test(`no permit: blocked=${blocked}, webhook hold=${held}`,async()=>{
    const tx={ $executeRaw:async()=>0, $queryRaw:async sql=>
      sql.join('').includes('SELECT blocked') ? [{blocked,subscription_webhooks_held:held}] : [] };
    const call=()=>verifyCheckoutAdmission(tx,{organisationId:'synthetic',providerScope:'synthetic',terms:{}});
    if(blocked||held) await assert.rejects(call,CheckoutAdmissionDenied);
    else assert.equal(await call(),null);
  });
}
for (const blocked of [false,true]) for (const held of [false,true]) {
  test(`unscoped admission SQL: blocked=${blocked}, webhook hold=${held}`,async()=>{
    const database={$queryRaw:async sql=>{
      const query=sql.join('');
      // Model the independent SQL hold predicate; permits are null on this path.
      return !blocked && (!held || !/subscription_webhooks_held\s*=\s*false/.test(query))
        ? [{expiresAt:2000000000n}] : [];
    }};
    const call=()=>admitPlatformCheckout({database});
    if(blocked||held) await assert.rejects(call,CheckoutTemporarilyUnavailable);
    else assert.equal((await call()).expiresAt,2000000000);
  });
}

for (const blocked of [false,true]) for (const held of [false,true]) {
 test(`valid scoped permit: blocked=${blocked}, webhook hold=${held}`,async()=>{
   const terms={synthetic:true};
   const row={id:'permit',clerk_user_id:'actor',provider_scope:'synthetic',terms,terms_hash:checkoutAdmissionTermsHash(terms),attempt_id:null,usable:true};
   const tx={$executeRaw:async()=>1,membership:{findUnique:async()=>({status:'active'})},$queryRaw:async sql=>{
     const query=sql.join('');
     if(query.includes('SELECT blocked'))return [{blocked,subscription_webhooks_held:held}];
     if(query.includes('pg_current_xact_id'))return [{transaction_id:'1'}];
     return [row];
   }};
   const call=()=>verifyCheckoutAdmission(tx,{organisationId:'synthetic',clerkUserId:'actor',providerScope:'synthetic',terms,attemptId:'attempt'},true);
   if(held)await assert.rejects(call,CheckoutAdmissionDenied);else assert.equal(await call(),'permit');
 });
}

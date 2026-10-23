// Requirements: platform.auth, detach.portal_billing. Synthetic test mode only.
// Owns a nonce-verified disposable PostgreSQL database and temporary CLI listener.
// No Production environment, database, customer, or webhook configuration writes.
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {spawn,spawnSync} from 'node:child_process';import {createServer} from 'node:net';import {createRequire} from 'node:module';import {randomBytes} from 'node:crypto';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');const require=createRequire(path.join(root,'package.json'));const {chromium}=require('playwright');const Stripe=require('stripe');const values=require('dotenv').parse(fs.readFileSync(process.env.DG_ACCEPTANCE_TEST_ENV_FILE||'/Users/okcomputers/Documents/dg-platform-web/.env.local'));
if(!/^(sk|rk)_test_/.test(values.STRIPE_SECRET_KEY||'')||!values.CLERK_SECRET_KEY?.startsWith('sk_test_')||!values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?.startsWith('pk_test_'))throw Error('Test credentials required');
const stripe=new Stripe(values.STRIPE_SECRET_KEY,{timeout:15000,maxNetworkRetries:0,apiVersion:'2025-02-24.acacia'});const pg='/opt/homebrew/opt/postgresql@18/bin';const owned=fs.mkdtempSync(path.join(os.tmpdir(),'dg-external-checkout-'));fs.chmodSync(owned,0o700);const data=path.join(owned,'data');const nonce=randomBytes(32).toString('hex');const suffix=randomBytes(6).toString('hex');const dbName=`dg_checkout_certification_${suffix}`;
const safe={};for(const k of ['PATH','HOME','USER','LOGNAME','TMPDIR','LANG'])if(process.env[k])safe[k]=process.env[k];
const port=()=>new Promise((resolve,reject)=>{const s=createServer();s.on('error',reject);s.listen(0,'127.0.0.1',()=>{const n=s.address().port;s.close(()=>resolve(n));});});const dbPort=await port(),appPort=await port();if(dbPort===5432||appPort===5432)throw Error('Default port forbidden');const origin=`http://localhost:${appPort}`;const dbUrl=`postgresql://checkout_certification@127.0.0.1:${dbPort}/${dbName}?connect_timeout=3&pool_timeout=1&socket_timeout=5&connection_limit=4`;
const env={...safe,DATABASE_URL:dbUrl,DATABASE_URL_UNPOOLED:dbUrl,DG_NEON_ENV:'development',NODE_ENV:'development',DG_LOCAL_CHECKOUT_CERTIFICATION:'authorised-disposable',DG_CHECKOUT_CERTIFICATION_NONCE:nonce,CLERK_SECRET_KEY:values.CLERK_SECRET_KEY,NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:values.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,STRIPE_SECRET_KEY:values.STRIPE_SECRET_KEY,NEXT_PUBLIC_APP_URL:origin,NEXT_PUBLIC_PLATFORM_URL:origin,NEXT_PUBLIC_APP_HOST:'localhost',NEXT_TELEMETRY_DISABLED:'1'};
const redact=s=>String(s).replace(/(?:sk|rk|pk)_(?:live|test)_[A-Za-z0-9_-]+|whsec_[A-Za-z0-9_-]+|eyJ[A-Za-z0-9_.-]+/g,'[credential-redacted]').replace(/postgres(?:ql)?:\/\/\S+/g,'[database-redacted]');
const report={candidate:'48218a2196b444770f7b967c9cced9700d7f6303',localDelta:true,journey:'normal onboarding UI; synthetic fixtures only',startedAt:new Date().toISOString(),origin,syntheticOnly:true,databaseHost:'127.0.0.1',hostedConfigurationChanged:false,checks:[],customers:[]};
const record=(name,details)=>{report.checks.push({name,...details});fs.writeFileSync(path.join(owned,'report.json'),JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify({stage:name,...details}));};
const run=(cmd,args,extra={})=>{const r=spawnSync(cmd,args,{cwd:root,env:safe,encoding:'utf8',stdio:'pipe',...extra});if(r.status!==0)throw Error(`${path.basename(cmd)} failed (${r.status})`);return r.stdout;};
const sql=s=>run(path.join(pg,'psql'),['-X','-h','127.0.0.1','-p',String(dbPort),'-U','checkout_certification','-d',dbName,'-v','ON_ERROR_STOP=1','-tA','-c',s]);
const quote=s=>"'"+String(s).replaceAll("'","''")+"'";
const clerk=async(route,body,method='POST')=>{const r=await fetch('https://api.clerk.com/v1/'+route,{method,headers:{Authorization:`Bearer ${values.CLERK_SECRET_KEY}`,'Content-Type':'application/json','User-Agent':'DigitalGate-Local-Checkout-Certification'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(15000)});const j=await r.json();if(!r.ok)throw Error(`Clerk ${route.split('/')[0]} rejected (${r.status}): ${j.errors?.[0]?.code||'unknown'} (${j.errors?.[0]?.meta?.param_name||'unspecified field'})`);return j;};
let app,listener,browser,appFd,listenerFd;const users=[],subscriptions=[],sessions=[],cleanupFailures=[];let dbStarted=false;
try{
 const b=await stripe.balance.retrieve();if(b.livemode!==false)throw Error('Sandbox check failed');record('sandbox_verified',{pass:true});
 run(path.join(pg,'initdb'),['-D',data,'-U','checkout_certification','-A','trust','--encoding=UTF8','--locale=C','-L',path.resolve(pg,'../share/postgresql')]);run(path.join(pg,'pg_ctl'),['-D',data,'-l',path.join(owned,'postgres.log'),'-w','start','-o',`-h 127.0.0.1 -p ${dbPort} -k ${owned} -c dg.checkout_certification_nonce=${nonce}`]);dbStarted=true;run(path.join(pg,'createdb'),['-h','127.0.0.1','-p',String(dbPort),'-U','checkout_certification',dbName]);
 const schema=path.join(owned,'schema.sql');run(path.join(root,'node_modules/.bin/prisma'),['migrate','diff','--from-empty','--to-schema-datamodel','packages/database/prisma','--script','--output',schema],{env});run(path.join(pg,'psql'),['-X','-h','127.0.0.1','-p',String(dbPort),'-U','checkout_certification','-d',dbName,'-v','ON_ERROR_STOP=1','--single-transaction','-f',schema]);record('local_database_identity',{address:sql('SELECT host(inet_server_addr())').trim(),nonceMatches:sql("SELECT current_setting('dg.checkout_certification_nonce',true)="+quote(nonce)).trim()==='t'});sql("INSERT INTO platform_checkout_creation_gate(id,blocked,revision,changed_at,subscription_webhooks_held) VALUES(1,false,1,now(),false)");record('owned_disposable_database',{pass:true,gateOpenOnlyLocally:true});
 const events='checkout.session.completed,checkout.session.async_payment_succeeded,checkout.session.expired,payment_intent.payment_failed,invoice.paid,invoice.payment_failed,invoice.payment_action_required,customer.subscription.created,customer.subscription.updated,customer.subscription.deleted,customer.subscription.paused,customer.subscription.resumed';
 listenerFd=fs.openSync(path.join(owned,'listener.log'),'w',0o600);listener=spawn('/opt/homebrew/bin/stripe',['listen','--skip-update','--events',events,'--forward-to',origin+'/api/webhooks/stripe'],{cwd:root,env:{...safe,STRIPE_API_KEY:values.STRIPE_SECRET_KEY},stdio:['ignore','pipe','pipe']});
 let listenerOutput='';for(const stream of [listener.stdout,listener.stderr])stream.on('data',chunk=>{const s=chunk.toString();listenerOutput+=s;fs.writeSync(listenerFd,redact(s));});
 let end=Date.now()+30000;while(Date.now()<end&&!listenerOutput.match(/whsec_[A-Za-z0-9]+/)){if(listener.exitCode!==null)throw Error('Test listener exited');await new Promise(r=>setTimeout(r,100));}const secret=listenerOutput.match(/whsec_[A-Za-z0-9]+/)?.[0];listenerOutput='';if(!secret)throw Error('No signing secret from temporary listener');env.STRIPE_WEBHOOK_SECRET=secret;record('temporary_listener_ready',{pass:true,secretLogged:false});
 appFd=fs.openSync(path.join(owned,'application.log'),'w',0o600);app=spawn(process.execPath,[path.join(root,'node_modules/next/dist/bin/next'),'dev','--webpack','--hostname','localhost','--port',String(appPort)],{cwd:root,env,stdio:['ignore',appFd,appFd]});
 end=Date.now()+180000;let ready=false;while(Date.now()<end){if(app.exitCode!==null)throw Error('Development app exited');try{const r=await fetch(origin+'/login',{signal:AbortSignal.timeout(20000)});if(r.status===200){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}if(!ready)throw Error('Local login startup timed out');record('local_login_ready',{pass:true});const invalid=await fetch(origin+'/api/webhooks/stripe',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':'t=1,v1=invalid'},body:'{}',signal:AbortSignal.timeout(30000)});if(invalid.status!==400)throw Error('Invalid webhook signature was not rejected');record('invalid_signature_rejected',{pass:true,status:invalid.status});
 browser=await chromium.launch({headless:true});
 for(const scenario of [{label:'Mortgage prospect',tier:'professional',industry:'finance',template:'mortgage-finance-broking',premium:['reviews'],staleOffer:true},{label:'Cleaning prospect',tier:'business',industry:'services',template:'cleaning',premium:['growth_suite'],staleOffer:false}]){
  const customer={label:scenario.label,checks:[]};if(process.argv.includes('--finance-only')&&scenario.industry!=='finance')continue;report.customers.push(customer);let context;try { const email=`checkout-cert-${scenario.industry}-${suffix}+clerk_test@example.com`;
  const user=await clerk('users',{email_address:[email],skip_password_requirement:true,first_name:'Synthetic',last_name:'Checkout'});users.push(user.id);const orgId=`cert-${scenario.industry}-${suffix}`,memberId=`member-${scenario.industry}-${suffix}`;customer.organisationId=orgId;
  const progress={version:1,currentStep:'welcome',completedSteps:[],platformTier:scenario.tier,billingCadence:'monthly',industryApps:[],industryTemplates:[],premiumApps:[],supportPlan:'standard',startedAt:new Date().toISOString(),updatedAt:new Date().toISOString(),checklist:{}};
  const settings={featureFlags:{'finance.beta':scenario.industry==='finance'},gen2Onboarding:progress,billing:{foundingCustomer:true,programme:'founding',...(scenario.staleOffer?{commercialOffer:{version:1,id:'historical-unsigned',label:'Historical proposal',status:'agreed',currency:'aud',amountCents:94700,cadence:'monthly',platformTier:'professional',industryApps:['finance'],industryTemplates:[],premiumApps:[],trialDays:0}}:{})}};
  sql(`INSERT INTO organisations(id,name,slug,status,settings,created_at,updated_at) VALUES(${quote(orgId)},${quote('Synthetic '+scenario.label)},${quote(orgId)},'trial',${quote(JSON.stringify(settings))}::jsonb,now(),now());INSERT INTO memberships(id,organisation_id,clerk_user_id,role,status,email,created_at,updated_at) VALUES(${quote(memberId)},${quote(orgId)},${quote(user.id)},'owner','active',${quote(email)},now(),now())`);
  const token=await clerk('sign_in_tokens',{user_id:user.id,expires_in_seconds:600});
  context=await browser.newContext();let page=await context.newPage();
  customer.browserFailures=[];
  page.on('requestfailed',r=>{try{customer.browserFailures.push({host:new URL(r.url()).hostname,reason:r.failure()?.errorText});}catch{}});
  page.on('pageerror',e=>customer.browserFailures.push({scriptError:redact(e.message).slice(0,500)}));
  await page.goto(origin+'/login',{waitUntil:'domcontentloaded',timeout:120000});
  // Playwright's options are the THIRD argument. A timeout passed as the
  // second argument is only page data and silently leaves the default timeout.
  try{await page.waitForFunction(()=>window.Clerk?.loaded===true&&!!window.Clerk.client?.signIn,undefined,{timeout:60000});}
  catch{throw Error('Clerk SDK readiness failed: '+JSON.stringify(customer.browserFailures));}
  await page.evaluate(async ticket=>{const result=await window.Clerk.client.signIn.create({strategy:'ticket',ticket});if(result.status!=='complete')throw Error('Sign-in incomplete');await window.Clerk.setActive({session:result.createdSessionId});},token.token);
  try{await page.goto(origin+'/onboarding',{waitUntil:'domcontentloaded',timeout:120000});}catch(error){if(!String(error.message).includes('ERR_ABORTED'))throw error;await page.goto(origin+'/onboarding',{waitUntil:'domcontentloaded',timeout:120000});}
  const req=async(method,body)=>page.evaluate(async({method,body})=>{const r=await fetch('/api/v1/onboarding/gen2',{method,signal:AbortSignal.timeout(30000),headers:{'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});return {status:r.status,body:await r.json()};},{method,body});
  const heading=async name=>page.getByRole('heading',{name}).waitFor({state:'visible',timeout:30000});
  const next=async()=>page.getByRole('button',{name:'Continue',exact:true}).click();
  const waitSaved=async(predicate,label)=>{const deadline=Date.now()+15000;while(Date.now()<deadline){const r=await req('GET');if(r.status===200&&predicate(r.body.data))return;await new Promise(resolve=>setTimeout(resolve,250));}throw Error('UI autosave did not persist '+label);};
  await page.getByRole('button',{name:'Begin setup',exact:true}).click();
  await heading('Tell me about the business.');
  await page.getByLabel('Business name',{exact:true}).fill('Synthetic '+scenario.label);
  await page.getByLabel('Email',{exact:true}).fill(email);
  await page.getByLabel('Primary contact',{exact:true}).fill('Synthetic Owner');
  await next();await heading('What is your main industry?');
  await page.getByRole('button',{name:scenario.industry==='finance'?/^Finance/:/^Services/}).click();
  await waitSaved(d=>d?.progress?.operatingProfile?.primaryIndustry===scenario.industry&&d.progress.premiumApps?.includes('growth_suite'),'industry selection');
  await next();await heading('Choose your primary business type.');
  await page.getByRole('button',{name:scenario.industry==='finance'?/^Mortgage & Finance Broking/:/^Commercial Cleaning/}).click();
  await waitSaved(d=>d?.progress?.operatingProfile?.templates?.includes(scenario.template),'business type');
  await next();await heading('Help me understand how you create value.');
  await page.getByLabel('Services / products',{exact:true}).fill('Synthetic certification services');
  await page.getByLabel('Target customers',{exact:true}).fill('Synthetic customers');
  await waitSaved(d=>d?.profile?.brandVoice?.targetAudience==='Synthetic customers','operating profile');
  await next();await heading('What should DigitalGate improve first?');
  await page.getByRole('button',{name:'Generate more leads',exact:true}).click();
  await next();await heading('Choose your platform level.');
  await page.getByRole('button',{name:scenario.tier==='professional'?/^Growth/:/^Scale/}).click();
  await next();await heading('Aida’s recommended setup.');
  // Industry selection recommends Growth Suite. Finance explicitly declines it;
  // the UI retains included Reviews at no extra cost. Cleaning keeps the bundle.
  if(!scenario.premium.includes('growth_suite'))await page.getByRole('button',{name:/Growth Suite.*All Growth Apps/}).click();
  await waitSaved(d=>JSON.stringify([...(d?.progress?.premiumApps??[])].sort())===JSON.stringify([...scenario.premium].sort()),'premium basket');
  await next();await heading('How much support would you like?');
  await next();await heading('Brand');await next();
  await heading(/Here’s what I’m preparing/);
  // Reload the saved review position: do not seed completed onboarding or use
  // review=1, whose UI intentionally cannot create the normal trial checkout.
  const saveDeadline=Date.now()+15000;let saved;
  while(Date.now()<saveDeadline){saved=await req('GET');const p=saved.body.data?.progress;if(p?.journeyPosition?.stage==='order_summary'&&p.platformTier===scenario.tier&&JSON.stringify([...(p.premiumApps??[])].sort())===JSON.stringify([...scenario.premium].sort()))break;await new Promise(r=>setTimeout(r,250));}
  if(saved?.body.data?.progress?.journeyPosition?.stage!=='order_summary')throw Error('Review position was not saved');
  customer.savedSelection={platformTier:saved.body.data.progress.platformTier,premiumApps:saved.body.data.progress.premiumApps,industryApps:saved.body.data.progress.industryApps};
  if(JSON.stringify([...(saved.body.data.progress.premiumApps??[])].sort())!==JSON.stringify([...scenario.premium].sort()))throw Error('Saved premium basket differs from UI selection');
  await page.reload({waitUntil:'domcontentloaded'});await heading(/Here’s what I’m preparing/);
  const initial=await req('GET');if(initial.status!==200)throw Error('Authenticated saved onboarding rejected');
  if(initial.body.data?.progress?.completedAt)throw Error('Onboarding completed before payment');
  customer.checks.push({name:'ui_onboarding_and_saved_resumption',pass:true});
  const createThroughUi=async()=>{
    // The hosted redirect itself is the observable browser result. Reading the
    // departed page's API response body through CDP is unreliable on navigation.
    await Promise.all([
      page.waitForURL(u=>u.hostname==='checkout.stripe.com',{timeout:60000}),
      page.getByRole('button',{name:'Start 14-day trial',exact:true}).click({noWaitAfter:true}),
    ]);
    const sessionId=decodeURIComponent(new URL(page.url()).pathname).match(/(?:^|\/)(cs_test_[A-Za-z0-9]+)(?:\/|$)/)?.[1];
    if(!sessionId)throw Error('Hosted UI redirect did not expose a test Checkout session');
    return {sessionId};
  };
  const uiCheckout=await createThroughUi();
  const input={platformTier:scenario.tier,billingCadence:'monthly',industryApps:[scenario.industry],premiumApps:scenario.premium,supportPlan:'standard'};
  let session=await stripe.checkout.sessions.retrieve(uiCheckout.sessionId);sessions.push(session.id);if(session.livemode)throw Error('Live session forbidden');
  const duplicateResponse=await context.request.post(origin+'/api/v1/onboarding/gen2',{data:input});const duplicateBody=await duplicateResponse.json();if(duplicateResponse.status()!==200||duplicateBody.data?.sessionId!==session.id)throw Error('Duplicate session prevention failed');customer.checks.push({name:'duplicate_session_reused',pass:true});
  if(scenario.industry==='services'){await stripe.checkout.sessions.expire(session.id);let expiryEvent,expiryReceipt;const expiryDeadline=Date.now()+30000;while(Date.now()<expiryDeadline){const es=await stripe.events.list({type:'checkout.session.expired',limit:20});expiryEvent=es.data.find(e=>e.data.object.id===session.id);if(expiryEvent){expiryReceipt=sql(`SELECT status FROM stripe_webhook_receipts WHERE event_id=${quote(expiryEvent.id)}`).trim();if(expiryReceipt==='processed')break;}await new Promise(r=>setTimeout(r,500));}if(expiryReceipt!=='processed')throw Error('Actual signed expiration webhook not processed');customer.checks.push({name:'actual_signed_expiry_delivery',pass:true});record('signed_expiry_webhook',{customer:scenario.label,pass:true});await page.goto(origin+'/onboarding',{waitUntil:'domcontentloaded'});await heading(/Here’s what I’m preparing/);const replaced=await createThroughUi();if(replaced.sessionId===session.id)throw Error('Expired session not replaced safely');session=await stripe.checkout.sessions.retrieve(replaced.sessionId);sessions.push(session.id);customer.checks.push({name:'expired_session_recovered',pass:true});}
  const lines=await stripe.checkout.sessions.listLineItems(session.id,{limit:100});customer.stripeLines=lines.data.map(l=>({description:l.description,quantity:l.quantity,amount:l.price?.unit_amount,currency:l.price?.currency,interval:l.price?.recurring?.interval}));
  if(session.subscription_data){} // Checkout trial is verified on its resulting subscription below.
  if(customer.stripeLines.length!==2||customer.stripeLines[0].amount!==(scenario.tier==='professional'?24900:49900)||customer.stripeLines.reduce((sum,l)=>sum+l.amount*l.quantity,0)!==(scenario.industry==='finance'?39800:99800)||customer.stripeLines.some(l=>l.currency!=='aud'||l.interval!=='month'||l.quantity!==1))throw Error('Actual Checkout pricing mismatch');
  record('test_checkout_created',{customer:scenario.label,pass:true,lines:customer.stripeLines});
  customer.browserFailures=[];page.on('requestfailed',r=>{try{customer.browserFailures.push({host:new URL(r.url()).hostname,reason:r.failure()?.errorText});}catch{}});page.on('pageerror',e=>customer.browserFailures.push({scriptError:redact(e.message).slice(0,500)}));
  await page.goto(session.url,{waitUntil:'domcontentloaded',timeout:120000});await page.waitForTimeout(3000);
  fs.writeFileSync(path.join(owned,`stripe-ui-${scenario.industry}.txt`),(await page.locator('body').innerText()).slice(0,14000),{mode:0o600});
  const inputInventory=[];for(const f of page.frames()){inputInventory.push({host:(()=>{try{return new URL(f.url()).hostname}catch{return 'inline'}})(),inputs:await f.locator('input').evaluateAll(nodes=>nodes.map(n=>({name:n.name,id:n.id,type:n.type,placeholder:n.placeholder,autocomplete:n.autocomplete}))).catch(()=>[])});}fs.writeFileSync(path.join(owned,`stripe-inputs-${scenario.industry}.json`),JSON.stringify(inputInventory,null,2),{mode:0o600});
  // Stripe's accordion toggle may be hidden after selection. Use a visible
  // payment-method control only when the actual card fields are not ready.
  const cardSelectors='input[name="cardNumber"],input[name="number"],input[autocomplete="cc-number"]';
  const cardReady=async()=>{for(const frame of page.frames())if(await frame.locator(cardSelectors).first().isVisible().catch(()=>false))return true;return false;};
  await page.screenshot({path:path.join(owned,`stripe-before-card-${scenario.industry}.png`),fullPage:true});
  if(!await cardReady()){
    const cardChoice=page.getByRole('button',{name:'Pay with card',exact:true});
    if(await cardChoice.first().isVisible().catch(()=>false))await cardChoice.first().click();
    else{
      const visibleCard=page.getByText('Card',{exact:true}).filter({visible:true});
      if(await visibleCard.count()){
        // Stripe's ordinary card accordion cover receives this physical click.
        const bounds=await visibleCard.first().boundingBox();
        if(bounds)await page.mouse.click(bounds.x+bounds.width/2,bounds.y+bounds.height/2);
      }
    }
  }
  const cardDeadline=Date.now()+30000;while(Date.now()<cardDeadline&&!await cardReady())await new Promise(resolve=>setTimeout(resolve,250));
  await page.screenshot({path:path.join(owned,`stripe-form-${scenario.industry}.png`),fullPage:true});
  fs.writeFileSync(path.join(owned,`stripe-form-${scenario.industry}.txt`),(await page.locator('body').innerText()).slice(0,14000),{mode:0o600});
  const afterInputs=[];for(const f of page.frames())afterInputs.push({host:(()=>{try{return new URL(f.url()).hostname}catch{return 'inline'}})(),inputs:await f.locator('input, [role="textbox"], [contenteditable="true"]').evaluateAll(nodes=>nodes.map(n=>({tag:n.tagName,name:n.getAttribute('name'),id:n.id,type:n.getAttribute('type'),placeholder:n.getAttribute('placeholder')}))).catch(()=>[])});fs.writeFileSync(path.join(owned,`stripe-after-inputs-${scenario.industry}.json`),JSON.stringify(afterInputs,null,2),{mode:0o600});
  const fill=async(selectors,value)=>{for(const f of page.frames())for(const selector of selectors){const loc=f.locator(selector);if(await loc.count()&&await loc.first().isVisible()){await loc.first().fill(value);return true;}}return false;};
  await fill(['input[name="email"]','input[type="email"]'],email);const cardFilled=await fill(['input[name="cardNumber"]','input[name="number"]','input[autocomplete="cc-number"]'],'4242424242424242');await fill(['input[name="cardExpiry"]','input[name="expiry"]','input[autocomplete="cc-exp"]'],'1230');await fill(['input[name="cardCvc"]','input[name="cvc"]','input[autocomplete="cc-csc"]'],'123');await fill(['input[name="billingName"]','input[autocomplete="cc-name"]'],'Synthetic Checkout');for(const f of page.frames()){const country=f.locator('select[name="billingCountry"], select#billingCountry');if(await country.count())await country.first().selectOption('AU').catch(()=>{});}
  await fill(['input[name="billingPostalCode"]','input[autocomplete="postal-code"]'],'4000');
  if(!cardFilled)throw Error('Hosted Checkout card fields unavailable; inspect browser form evidence (no challenge bypass attempted)');const saveLink=page.locator('input[name="enableStripePass"]');if(await saveLink.count()&&await saveLink.isChecked())await saveLink.uncheck();
  const subscribe=page.getByRole('button',{name:/Start trial|Subscribe|Start free trial|Confirm/i});if(!await subscribe.count())throw Error('Checkout submit button unavailable; inspect synthetic UI artifact');await subscribe.last().click();
  end=Date.now()+90000;let completed;while(Date.now()<end){completed=await stripe.checkout.sessions.retrieve(session.id);if(completed.status==='complete')break;await page.waitForTimeout(1000);}if(completed?.status!=='complete')throw Error('Hosted Stripe Checkout did not complete');
  await page.waitForURL(u=>u.origin===origin,{timeout:30000});
  const sub=await stripe.subscriptions.retrieve(completed.subscription);subscriptions.push(sub.id);if(sub.livemode||sub.status!=='trialing'||sub.trial_end-sub.trial_start!==14*86400)throw Error('Verified Stripe trial mismatch');customer.subscriptionId=sub.id;customer.stripeTrial={start:sub.trial_start,end:sub.trial_end,days:14};customer.checks.push({name:'actual_stripe_14_day_trial',pass:true});
  end=Date.now()+90000;let canonical;while(Date.now()<end){canonical=JSON.parse(sql(`SELECT coalesce(json_agg(s),'[]'::json) FROM (SELECT status,entitlement,industry_apps,premium_apps,stripe_status,stripe_customer_id,stripe_subscription_id FROM platform_subscriptions WHERE organisation_id=${quote(orgId)}) s`));if(canonical[0]?.status==='TRIALING')break;await new Promise(r=>setTimeout(r,500));}if(canonical[0]?.status!=='TRIALING'||canonical[0].entitlement!=='FULL'||canonical[0].stripe_customer_id!==completed.customer||canonical[0].stripe_subscription_id!==sub.id||!canonical[0].industry_apps.includes(scenario.industry))throw Error('Signed webhook activation/entitlement missing');customer.canonical=canonical[0];
  const actualEvents=await stripe.events.list({type:'checkout.session.completed',limit:20});const originalEvent=actualEvents.data.find(e=>e.data.object.id===session.id);if(!originalEvent)throw Error('Completed Checkout event evidence missing');let receiptBefore='';const receiptDeadline=Date.now()+60000;while(Date.now()<receiptDeadline){receiptBefore=sql(`SELECT status||':'||attempts FROM stripe_webhook_receipts WHERE event_id=${quote(session.id)}`).trim();if(receiptBefore.startsWith('processed:'))break;await new Promise(resolve=>setTimeout(resolve,250));}customer.receiptStatus=receiptBefore;if(!receiptBefore.startsWith('processed:'))throw Error('Completed checkout receipt did not reach processed: '+receiptBefore);const payload=JSON.stringify(originalEvent);const replay=()=>fetch(origin+'/api/webhooks/stripe',{method:'POST',headers:{'Content-Type':'application/json','stripe-signature':stripe.webhooks.generateTestHeaderString({payload,secret:env.STRIPE_WEBHOOK_SECRET})},body:payload,signal:AbortSignal.timeout(30000)});sql('UPDATE platform_checkout_creation_gate SET subscription_webhooks_held=true WHERE id=1');const held=await replay();if(held.status!==503)throw Error('Held actual event did not return retryable 503');sql('UPDATE platform_checkout_creation_gate SET subscription_webhooks_held=false WHERE id=1');const released=await replay();if(released.status!==200||sql(`SELECT status||':'||attempts FROM stripe_webhook_receipts WHERE event_id=${quote(session.id)}`).trim()!==receiptBefore)throw Error('Released duplicate event was not idempotent');customer.checks.push({name:'actual_event_local_resign_hold_release_duplicate',pass:true});customer.completedEventId=originalEvent.id;customer.checkoutReceiptKey=session.id;
  const receipts=sql("SELECT count(*) FROM stripe_webhook_receipts WHERE status='processed'");customer.processedReceiptCount=Number(receipts);customer.checks.push({name:'signed_webhook_activation',pass:true});
  // Signed webhook activation comes first; the normal UI finishes setup.
  await page.getByRole('button',{name:'Enter my workspace',exact:true}).waitFor({state:'visible',timeout:90000});
  await page.getByRole('button',{name:'Enter my workspace',exact:true}).click();
  await page.waitForURL(u=>u.origin===origin&&u.pathname==='/dashboard',{timeout:90000});
  const finalProgress=await req('GET');if(!finalProgress.body.data?.progress?.completedAt)throw Error('UI onboarding completion timestamp missing');
  customer.checks.push({name:'ui_onboarding_completion_before_dashboard',pass:true});
  const deniedPurchase=await page.evaluate(async appId=>{const r=await fetch('/api/v1/org/apps',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'toggle',appId,enabled:true})});return r.status;},scenario.industry==='finance'?'services':'finance');if(deniedPurchase!==403)throw Error('Unpurchased industry app activation was not denied');customer.checks.push({name:'unpaid_app_denied',pass:true});
  const activation=await page.evaluate(async appId=>{const r=await fetch('/api/v1/org/apps',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'toggle',appId,enabled:true})});return {status:r.status,body:await r.json()};},scenario.industry);if(activation.status!==200)throw Error(`Purchased app activation failed ${activation.status}: ${activation.body.error?.code}`);const industryApi=await page.evaluate(async industry=>{const r=await fetch(industry==='finance'?'/api/v1/finance/applications':'/api/v1/services/jobs');return {status:r.status,body:await r.json()};},scenario.industry);if(industryApi.status!==200)throw Error(`Purchased industry API rejected ${industryApi.status}: ${industryApi.body.error?.code}`);customer.checks.push({name:'purchased_industry_api',pass:true});const appPage=await context.request.get(origin+'/apps/'+scenario.industry);if(appPage.status()!==200)throw Error('Purchased industry page rejected '+appPage.status());customer.checks.push({name:'purchased_industry_page',pass:true});
  const dashboard=await page.goto(origin+'/dashboard',{waitUntil:'domcontentloaded',timeout:120000});customer.dashboardStatus=dashboard.status();if(dashboard.status()!==200)throw Error('Dashboard access failed');customer.checks.push({name:'authenticated_dashboard',pass:true});
  record('customer_journey_completed',{customer:scenario.label,pass:true,canonical:customer.canonical});
  }catch(error){customer.failure=redact(error.message);record('customer_journey_blocked',{customer:scenario.label,reason:customer.failure});}finally{if(context)await context.close();}
 }
 report.result=report.customers.length>0&&report.customers.every(c=>!c.failure)?'PASS':'BLOCKED';
}catch(error){report.result='BLOCKED';report.failure=redact(error.message);console.log(JSON.stringify({stage:'blocked',reason:report.failure}));}
finally{
 // Only fixture objects created by this run are eligible for cleanup.
 // Recover sessions from this run's owned coordinator rows too: a browser
 // navigation failure can occur after Stripe creates a session but before the
 // runner reads the UI response. Never inventory or clean another run's objects.
 const ownedOrgs=report.customers.map(c=>c.organisationId).filter(Boolean);
 if(dbStarted&&ownedOrgs.length)try{
   const rows=sql(`SELECT session_id FROM platform_checkout_attempts WHERE organisation_id IN (${ownedOrgs.map(quote).join(',')}) AND session_id IS NOT NULL`).trim().split('\n').filter(Boolean);
   for(const id of rows){const session=await stripe.checkout.sessions.retrieve(id);if(session.livemode!==false||!ownedOrgs.includes(session.metadata?.organisation_id))throw Error('Cleanup fixture ownership mismatch');if(!sessions.includes(id))sessions.push(id);const sub=typeof session.subscription==='string'?session.subscription:session.subscription?.id;if(sub&&!subscriptions.includes(sub))subscriptions.push(sub);}
 }catch(error){cleanupFailures.push({resource:'owned fixture inventory',reason:redact(error.message)});}
 for(const id of subscriptions)try{await stripe.subscriptions.cancel(id);}catch(error){cleanupFailures.push({resource:'synthetic subscription',reason:redact(error.message)});}
 for(const id of sessions)try{const s=await stripe.checkout.sessions.retrieve(id);if(s.status==='open')await stripe.checkout.sessions.expire(id);}catch(error){cleanupFailures.push({resource:'synthetic checkout',reason:redact(error.message)});}
 for(const id of users)try{await clerk('users/'+id,null,'DELETE');}catch(error){cleanupFailures.push({resource:'synthetic Clerk user',reason:redact(error.message)});}
 if(browser)await browser.close();
 for(const child of [app,listener])if(child&&child.exitCode===null){child.kill('SIGTERM');await new Promise(resolve=>{const t=setTimeout(()=>{child.kill('SIGKILL');resolve();},5000);child.once('exit',()=>{clearTimeout(t);resolve();});});}
 if(appFd!==undefined)fs.closeSync(appFd);if(listenerFd!==undefined)fs.closeSync(listenerFd);
 if(dbStarted)run(path.join(pg,'pg_ctl'),['-D',data,'-m','immediate','-w','stop']);fs.rmSync(data,{recursive:true,force:true});
 if(cleanupFailures.length){report.result='BLOCKED';report.cleanupFailures=cleanupFailures;}
 report.finishedAt=new Date().toISOString();report.cleanup={localDatabaseStoppedAndRemoved:true,applicationStopped:!app||app.exitCode!==null,listenerStopped:!listener||listener.exitCode!==null,syntheticClerkUsers:users.length,createdTestSessions:sessions.length,createdTestSubscriptions:subscriptions.length};
 fs.writeFileSync(path.join(owned,'report.json'),JSON.stringify(report,null,2),{mode:0o600});console.log(JSON.stringify({reportPath:path.join(owned,'report.json'),result:report.result,cleanup:report.cleanup}));
}

if(report.result!=='PASS')process.exitCode=1;

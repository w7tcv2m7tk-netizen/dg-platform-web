import assert from 'node:assert/strict';
import {test} from 'node:test';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const source=fs.readFileSync('packages/platform-core/src/command-centre/growth-engine/decision-maker-research.ts','utf8');
function fixture(html) {
 const module={exports:{}};
 const code=ts.transpileModule(source+'\nexport { validPersonName, validEmail };',{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 vm.runInNewContext(code,{module,exports:module.exports,URL,AbortController,setTimeout,clearTimeout,require:()=>({safeExternalFetch:async url=>({ok:true,status:200,url,headers:{get:()=> 'text/html'},text:async()=>html})})});
 return module.exports;
}
test('normalizes Meet prefix and rejects non-person headings',()=>{
 const api=fixture(''); assert.equal(api.validPersonName('Meet Ben Example'),'Ben Example');
 for(const name of ['Business Hours','Email','Opening Hours','Contact Us']) assert.equal(api.validPersonName(name),null);
});
test('rejects placeholder and malformed encoded emails',()=>{
 const api=fixture(''); for(const email of ['you@yourbusiness.com.au','you@example.com','bad%ZZ@example.net']) assert.equal(api.validEmail(email),null);
});
test('phone-only leader receives sourced general email without fake person candidates',async()=>{
 const api=fixture('<h1>Meet Ben Example</h1><p>Founder</p><a href="tel:0400000000">Phone</a><h2>Business Hours</h2><a href="mailto:you@yourbusiness.com.au">Template</a><h2>Email</h2><a href="mailto:hello@synthetic.test">hello@synthetic.test</a>');
 const result=await api.researchProspectDecisionMaker('https://synthetic.test');
 assert.equal(result.candidates.length,1); const candidate=result.candidates[0];
 assert.equal(candidate.name,'Ben Example');assert.equal(candidate.email,null);assert.equal(candidate.businessEmail,'hello@synthetic.test');assert.equal(candidate.businessEmailSourceUrl,'https://synthetic.test');
});
test('direct email takes precedence over business fallback',async()=>{
 const api=fixture('<article><h1>Ben Example</h1><p>Founder</p><a href="mailto:ben@synthetic.test">Email Ben</a><a href="tel:0400000000">Phone</a></article><footer><a href="mailto:hello@synthetic.test">Office</a></footer>');
 const {candidates}=await api.researchProspectDecisionMaker('https://synthetic.test');
 assert.equal(candidates[0].email,'ben@synthetic.test'); assert.equal(candidates[0].businessEmail,undefined);
});
test('foreign generic mailbox is not borrowed as business fallback',async()=>{
 const api=fixture('<h1>Ben Example</h1><p>Founder</p><a href="tel:0400000000">Phone</a><footer>hello@other.test</footer>');
 const {candidates}=await api.researchProspectDecisionMaker('https://synthetic.test');assert.equal(candidates[0].businessEmail,undefined);
});

test('named leader can use business contact route even without direct phone or email',async()=>{
 const api=fixture('<h1>Meet Ben Example</h1><p>Founder</p><a href="mailto:hello@synthetic.test">Contact our business</a>');
 const {candidates}=await api.researchProspectDecisionMaker('https://synthetic.test');
 assert.equal(candidates.length,1);assert.equal(candidates[0].name,'Ben Example');assert.equal(candidates[0].email,null);assert.equal(candidates[0].businessEmail,'hello@synthetic.test');
});

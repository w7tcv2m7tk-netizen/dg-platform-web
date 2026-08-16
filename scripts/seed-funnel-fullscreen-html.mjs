#!/usr/bin/env node
/**
 * Premium fullscreen HTML shells for product funnels (live while Vercel lags).
 *   node --env-file=.env.local scripts/seed-funnel-fullscreen-html.mjs
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
const prisma = new PrismaClient();

const RR_HERO =
  "https://roerealty.com.au/wp-content/uploads/2026/05/IMG_9317-scaled.jpeg";

const RR_HTML = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,560;9..144,700&family=Manrope:wght@500;600;700;800&display=swap" />
<style>
html,body{margin:0!important;padding:0!important;background:#0b1413!important}
.wb-root,.wb-root.wb-surface-light{background:transparent!important;padding:0!important}
.wb-section.wb-html-block{max-width:none!important;padding:0!important;margin:0!important}
@keyframes dgRrIn{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
.dg-funnel-rr{--gold:#C9A46C;position:relative;width:100%;min-height:100dvh;overflow:clip;color:#f7f4ef;font-family:Manrope,system-ui,sans-serif;background:#0b1413}
.dg-funnel-rr__bg{position:absolute;inset:0;background:url('${RR_HERO}') center 40%/cover no-repeat;transform:scale(1.04)}
.dg-funnel-rr__veil{position:absolute;inset:0;background:linear-gradient(105deg,rgba(12,22,21,.92) 0%,rgba(12,22,21,.72) 42%,rgba(12,22,21,.38) 100%),linear-gradient(0deg,rgba(8,14,13,.55),transparent 38%)}
.dg-funnel-rr__shell{position:relative;z-index:2;width:100%;max-width:1180px;margin:0 auto;min-height:100dvh;padding:clamp(1.5rem,4vw,3rem);display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(1.5rem,4vw,3.5rem);align-items:center;box-sizing:border-box}
.dg-funnel-rr a.brand{display:inline-flex;align-items:center;gap:.55rem;color:var(--gold);text-decoration:none;font-size:.82rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase}
.dg-funnel-rr .mark{width:1.55rem;height:1.55rem;border-radius:.35rem;display:inline-grid;place-items:center;background:linear-gradient(145deg,#C9A46C,#8a6a3a);color:#1C2B2A;font-weight:800;font-size:.75rem}
.dg-funnel-rr .copy{animation:dgRrIn .55s ease both}
.dg-funnel-rr .eyebrow{margin:1.35rem 0 .85rem;font-size:.72rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.dg-funnel-rr h1{margin:0 0 1rem;font-family:Fraunces,Georgia,serif;font-size:clamp(2.15rem,4.8vw,3.35rem);line-height:1.12;font-weight:700;letter-spacing:-.02em;color:#fff}
.dg-funnel-rr .lede{margin:0 0 1.5rem;max-width:34rem;font-size:clamp(1.02rem,1.6vw,1.18rem);line-height:1.55;color:rgba(247,244,239,.88)}
.dg-funnel-rr .trust{display:grid;gap:.65rem;margin:0;padding:0;list-style:none}
.dg-funnel-rr .trust li{display:flex;align-items:center;gap:.65rem;font-size:.95rem;font-weight:600}
.dg-funnel-rr .trust i{width:1.45rem;height:1.45rem;border-radius:999px;display:inline-grid;place-items:center;background:rgba(201,164,108,.18);color:var(--gold);font-style:normal;font-size:.75rem;font-weight:800}
.dg-funnel-rr .panel{animation:dgRrIn .65s ease .08s both;background:rgba(15,26,24,.78);border:1px solid rgba(201,164,108,.28);border-radius:1.25rem;padding:clamp(1.35rem,3vw,1.85rem);box-shadow:0 28px 60px rgba(0,0,0,.35);backdrop-filter:blur(14px)}
.dg-funnel-rr .steps{display:flex;gap:.45rem;margin:0 0 1.25rem}
.dg-funnel-rr .step{flex:1;height:3px;border-radius:99px;background:rgba(255,255,255,.12)}
.dg-funnel-rr .step.on{background:var(--gold)}
.dg-funnel-rr .badge{display:inline-block;margin-bottom:.85rem;padding:.35rem .8rem;border-radius:.4rem;border:1px solid rgba(201,164,108,.35);background:rgba(201,164,108,.12);color:#f3e6cc;font-size:.72rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase}
.dg-funnel-rr h2{margin:0 0 .4rem;font-family:Fraunces,Georgia,serif;font-size:clamp(1.45rem,2.5vw,1.75rem);color:#fff}
.dg-funnel-rr .sub{margin:0 0 1.25rem;color:rgba(247,244,239,.72);font-size:.95rem}
.dg-funnel-rr label{display:block;margin:0 0 .4rem;font-size:.75rem;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:rgba(247,244,239,.78)}
.dg-funnel-rr input,.dg-funnel-rr select{width:100%;box-sizing:border-box;margin-bottom:.95rem;padding:.95rem 1rem;border-radius:.7rem;border:1.5px solid rgba(201,164,108,.55);background:rgba(12,22,21,.85);color:#fff;font:inherit;font-size:1rem;font-weight:600}
.dg-funnel-rr button{width:100%;padding:1rem 1.15rem;border:none;border-radius:.75rem;background:linear-gradient(135deg,#d4b57a,#C9A46C 50%,#a07d45);color:#1C2B2A;font:inherit;font-size:1rem;font-weight:800;cursor:pointer}
.dg-funnel-rr .note{margin:.85rem 0 0;text-align:center;font-size:.8rem;color:rgba(247,244,239,.62)}
.dg-funnel-rr .status{margin:.95rem 0 0;font-size:.9rem;min-height:1.25rem}
.dg-funnel-rr .addr{margin:0 0 1rem;padding:.75rem .9rem;border-radius:.65rem;background:rgba(201,164,108,.1);border:1px solid rgba(201,164,108,.25);color:#fff;font-size:.92rem}
.dg-funnel-rr .foot{grid-column:1/-1;margin:0;text-align:center;font-size:.78rem;color:rgba(247,244,239,.55)}
.dg-funnel-rr .hidden{display:none!important}
.dg-funnel-rr a.cta{display:inline-flex;width:100%;box-sizing:border-box;justify-content:center;padding:1rem 1.15rem;border-radius:.75rem;background:linear-gradient(135deg,#d4b57a,#C9A46C 50%,#a07d45);color:#1C2B2A;font-weight:800;text-decoration:none}
@media(max-width:860px){.dg-funnel-rr__shell{grid-template-columns:1fr;align-content:center}.dg-funnel-rr .trust{display:flex;flex-wrap:wrap;gap:.55rem 1rem}}
</style>
<section class="dg-funnel-rr">
  <div class="dg-funnel-rr__bg" aria-hidden="true"></div>
  <div class="dg-funnel-rr__veil" aria-hidden="true"></div>
  <div class="dg-funnel-rr__shell">
    <div class="copy">
      <a class="brand" href="https://roerealty.com.au"><span class="mark">R</span> Roe Realty</a>
      <p class="eyebrow">Free Instant Report</p>
      <h1>Find Out What Buyers Would Pay for Your Property Right Now</h1>
      <p class="lede">Receive a value range, recent comparable sales, and buyer demand insights in minutes — then decide your next move with clarity.</p>
      <ul class="trust">
        <li><i>✓</i> Buyer demand analytics</li>
        <li><i>✓</i> Instant valuation range</li>
        <li><i>✓</i> No obligation</li>
      </ul>
    </div>
    <div class="panel">
      <div class="steps" aria-hidden="true"><span class="step on" id="rr-s0"></span><span class="step" id="rr-s1"></span><span class="step" id="rr-s2"></span></div>
      <div id="rr-step-address">
        <div class="badge">⭐ Free Instant Report</div>
        <h2>Get Your Free Property Report</h2>
        <p class="sub">Value range · Buyer demand · Comparable sales</p>
        <form id="rr-address-form">
          <label for="rr-address">Property address</label>
          <input id="rr-address" required autocomplete="street-address" placeholder="e.g. 123 Main Street, Currumbin Valley QLD" />
          <button type="submit">Get My Free Report →</button>
          <p class="note">Takes under a minute. No obligation.</p>
        </form>
      </div>
      <div id="rr-step-contact" class="hidden">
        <h2>Almost There!</h2>
        <p class="sub">Where should we send your Property Value &amp; Buyer Demand Report?</p>
        <p class="addr" id="rr-formatted"></p>
        <form id="rr-contact-form">
          <label for="rr-name">Full name *</label>
          <input id="rr-name" required placeholder="Enter your full name" />
          <label for="rr-email">Email</label>
          <input id="rr-email" type="email" placeholder="Enter your email" />
          <label for="rr-phone">Mobile</label>
          <input id="rr-phone" type="tel" placeholder="Enter your mobile" />
          <label for="rr-type">Property type</label>
          <select id="rr-type"><option value="">Select type</option><option>House</option><option>Apartment</option><option>Townhouse</option><option>Unit</option><option>Land</option><option>Acreage</option><option>Other</option></select>
          <label for="rr-time">Timeframe to sell</label>
          <select id="rr-time"><option value="">Select timeframe</option><option>Ready now</option><option>1–3 months</option><option>3–6 months</option><option>6–12 months</option><option>Just researching</option></select>
          <p class="note" style="text-align:left;margin-bottom:.85rem">Name required — plus email or mobile (or both).</p>
          <button type="submit">Send My Report →</button>
        </form>
      </div>
      <div id="rr-step-done" class="hidden" style="text-align:center">
        <h2>You're all set</h2>
        <p class="sub" id="rr-done-msg"></p>
        <a class="cta" href="https://roerealty.com.au/property-appraisal">Book a free appraisal →</a>
      </div>
      <p id="rr-status" class="status" role="status"></p>
    </div>
    <p class="foot">A Roe Realty Property Report™ — powered by DigitalGate.</p>
  </div>
</section>
<script>
(function(){
  var siteSlug="roe-realty-report", formatted="";
  var statusEl=document.getElementById("rr-status");
  function setStatus(t,c){statusEl.textContent=t||"";statusEl.style.color=c||"rgba(247,244,239,.8)"}
  function setSteps(n){[0,1,2].forEach(function(i){document.getElementById("rr-s"+i).classList.toggle("on",i<=n)})}
  function show(id,n){["rr-step-address","rr-step-contact","rr-step-done"].forEach(function(x){document.getElementById(x).classList.toggle("hidden",x!==id)});setSteps(n)}
  document.getElementById("rr-address").focus();
  document.getElementById("rr-address-form").addEventListener("submit",async function(e){
    e.preventDefault();
    var raw=document.getElementById("rr-address").value.trim();
    if(!raw){setStatus("Enter your property address.","#fecaca");return}
    setStatus("Finding your property…","#f3e6cc");
    try{
      var res=await fetch("/api/public/property-report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"resolve",siteSlug:siteSlug,rawAddress:raw})});
      var json=await res.json().catch(function(){return null});
      if(!res.ok){setStatus((json&&json.error&&json.error.message)||"Could not look up that address.","#fecaca");return}
      formatted=(json&&json.data&&json.data.formatted)||raw;
      document.getElementById("rr-formatted").textContent=formatted;
      document.getElementById("rr-address").value=formatted;
      setStatus("");show("rr-step-contact",1);
    }catch(err){setStatus("Network error. Please try again.","#fecaca")}
  });
  document.getElementById("rr-contact-form").addEventListener("submit",async function(e){
    e.preventDefault();
    var name=document.getElementById("rr-name").value.trim();
    var email=document.getElementById("rr-email").value.trim();
    var phone=document.getElementById("rr-phone").value.trim();
    if(!name){setStatus("Please enter your full name.","#fecaca");return}
    if(!email&&!phone){setStatus("Please provide either an email or mobile number.","#fecaca");return}
    setStatus("Building your Cotality property report…","#f3e6cc");
    try{
      var res=await fetch("/api/public/property-report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",siteSlug:siteSlug,rawAddress:formatted||document.getElementById("rr-address").value.trim(),fullName:name,email:email,phone:phone,propertyType:document.getElementById("rr-type").value,timeframe:document.getElementById("rr-time").value})});
      var json=await res.json().catch(function(){return null});
      if(!res.ok){setStatus((json&&json.error&&json.error.message)||"Something went wrong.","#fecaca");return}
      document.getElementById("rr-done-msg").textContent=(json&&json.data&&json.data.message)||"Your report is on its way — check your inbox shortly.";
      setStatus("");show("rr-step-done",2);
    }catch(err){setStatus("Network error. Please try again.","#fecaca")}
  });
})();
</script>`;

const DG_HTML = `<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@500;600;700&family=Sora:wght@600;700;800&display=swap" />
<style>
html,body{margin:0!important;padding:0!important;background:#070b14!important}
.wb-root,.wb-root.wb-surface-light{background:transparent!important;padding:0!important}
.wb-section.wb-html-block{max-width:none!important;padding:0!important;margin:0!important}
@keyframes dgBaIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes dgBaScan{0%{background-position:200% 0}100%{background-position:-200% 0}}
.dg-funnel-dg{position:relative;width:100%;min-height:100dvh;overflow:clip;color:#e8eef8;font-family:"Instrument Sans",system-ui,sans-serif;background:#070b14}
.dg-funnel-dg__glow{position:absolute;inset:0;background:radial-gradient(ellipse 70% 55% at 12% 18%,rgba(59,130,246,.28),transparent 60%),radial-gradient(ellipse 55% 45% at 88% 78%,rgba(16,185,129,.14),transparent 55%),#070b14}
.dg-funnel-dg__grid{position:absolute;inset:0;opacity:.22;background-image:linear-gradient(rgba(148,163,184,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(148,163,184,.08) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse 70% 65% at 50% 40%,#000 20%,transparent 75%)}
.dg-funnel-dg__shell{position:relative;z-index:2;width:100%;max-width:1160px;min-height:100dvh;margin:0 auto;padding:clamp(1.5rem,4vw,3rem);display:grid;grid-template-columns:1.05fr .95fr;gap:clamp(1.5rem,4vw,3.25rem);align-items:center;box-sizing:border-box}
.dg-funnel-dg a.brand{display:inline-flex;align-items:center;gap:.55rem;color:#93c5fd;text-decoration:none;font-size:.84rem;font-weight:700;letter-spacing:.06em;text-transform:uppercase}
.dg-funnel-dg .mark{width:1.55rem;height:1.55rem;border-radius:.4rem;background:linear-gradient(145deg,#60A5FA,#2563EB)}
.dg-funnel-dg .copy{animation:dgBaIn .55s ease both}
.dg-funnel-dg .eyebrow{margin:1.35rem 0 .85rem;font-size:.72rem;font-weight:800;letter-spacing:.14em;text-transform:uppercase;color:#60A5FA}
.dg-funnel-dg h1{margin:0 0 1rem;font-family:Sora,system-ui,sans-serif;font-size:clamp(2rem,4.6vw,3.1rem);line-height:1.12;font-weight:700;letter-spacing:-.03em;color:#fff}
.dg-funnel-dg .lede{margin:0 0 1.5rem;max-width:34rem;font-size:clamp(1.02rem,1.5vw,1.12rem);line-height:1.55;color:#9fb0c7}
.dg-funnel-dg .pillars{display:grid;gap:.55rem;margin:0;padding:0;list-style:none;counter-reset:pillar}
.dg-funnel-dg .pillars li{counter-increment:pillar;display:flex;align-items:center;gap:.75rem;color:#d5deea;font-size:.92rem;font-weight:600}
.dg-funnel-dg .pillars li::before{content:counter(pillar,decimal-leading-zero);font-size:.72rem;font-weight:800;color:#60A5FA;width:1.6rem}
.dg-funnel-dg .panel{animation:dgBaIn .65s ease .08s both;background:rgba(10,16,28,.82);border:1px solid rgba(148,163,184,.22);border-radius:1.25rem;padding:clamp(1.35rem,3vw,1.85rem);box-shadow:0 28px 60px rgba(0,0,0,.4);backdrop-filter:blur(16px)}
.dg-funnel-dg .steps{display:flex;gap:.45rem;margin:0 0 1.25rem}
.dg-funnel-dg .step{flex:1;height:3px;border-radius:99px;background:rgba(255,255,255,.1)}
.dg-funnel-dg .step.on{background:#3B82F6}
.dg-funnel-dg h2{margin:0 0 .4rem;font-family:Sora,system-ui,sans-serif;font-size:clamp(1.35rem,2.4vw,1.6rem);color:#fff}
.dg-funnel-dg .sub{margin:0 0 1.2rem;color:#94a3b8;font-size:.95rem;line-height:1.5}
.dg-funnel-dg label{display:block;margin:0 0 .35rem;font-size:.78rem;font-weight:700;color:#94a3b8}
.dg-funnel-dg input,.dg-funnel-dg select{width:100%;box-sizing:border-box;margin-bottom:.9rem;padding:.9rem 1rem;border-radius:.65rem;border:1px solid #334155;background:#0b1220;color:#e2e8f0;font:inherit;font-size:1rem}
.dg-funnel-dg button,.dg-funnel-dg a.cta{width:100%;display:inline-flex;align-items:center;justify-content:center;padding:.95rem 1.1rem;border:none;border-radius:.75rem;background:linear-gradient(135deg,#60A5FA,#3B82F6 55%,#2563EB);color:#fff;font:inherit;font-size:.98rem;font-weight:700;cursor:pointer;text-decoration:none;box-sizing:border-box}
.dg-funnel-dg .note{margin:.85rem 0 0;text-align:center;font-size:.8rem;color:#64748b}
.dg-funnel-dg .status{margin:.9rem 0 0;font-size:.9rem;min-height:1.25rem;color:#94a3b8}
.dg-funnel-dg .scan{margin:.85rem 0 0;height:3px;border-radius:99px;background:linear-gradient(90deg,transparent,#60A5FA,transparent);background-size:200% 100%;animation:dgBaScan 1.1s linear infinite}
.dg-funnel-dg .score{font-family:Sora,system-ui,sans-serif;font-size:2.6rem;font-weight:800;text-align:center;margin:0 0 1rem}
.dg-funnel-dg .bars{display:grid;gap:.65rem;margin:0 0 1.25rem}
.dg-funnel-dg .bar-top{display:flex;justify-content:space-between;font-size:.88rem;color:#cbd5e1;margin-bottom:.3rem}
.dg-funnel-dg .track{height:7px;border-radius:99px;background:rgba(51,65,85,.85);overflow:hidden}
.dg-funnel-dg .fill{height:100%;border-radius:99px}
.dg-funnel-dg .meta{margin:0 0 1rem;padding:.7rem .85rem;border-radius:.65rem;background:rgba(59,130,246,.12);border:1px solid rgba(59,130,246,.25);color:#bfdbfe;font-size:.9rem}
.dg-funnel-dg .foot{grid-column:1/-1;margin:0;text-align:center;font-size:.78rem;color:#64748b}
.dg-funnel-dg .hidden{display:none!important}
@media(max-width:860px){.dg-funnel-dg__shell{grid-template-columns:1fr;align-content:center}}
</style>
<section class="dg-funnel-dg">
  <div class="dg-funnel-dg__glow" aria-hidden="true"></div>
  <div class="dg-funnel-dg__grid" aria-hidden="true"></div>
  <div class="dg-funnel-dg__shell">
    <div class="copy">
      <a class="brand" href="https://digitalgate.com.au"><span class="mark"></span> DigitalGate</a>
      <p class="eyebrow">Free Business Audit</p>
      <h1>See how your business performs across the digital world</h1>
      <p class="lede">Get an instant snapshot of your website, search presence, AI visibility and digital foundations — then discover where you may be losing visibility, enquiries and opportunities.</p>
      <ol class="pillars">
        <li>Website Health</li>
        <li>Search Visibility</li>
        <li>AI Visibility</li>
        <li>Reputation</li>
        <li>Conversion Readiness</li>
      </ol>
    </div>
    <div class="panel">
      <div class="steps" aria-hidden="true"><span class="step on" id="dg-s0"></span><span class="step" id="dg-s1"></span><span class="step" id="dg-s2"></span><span class="step" id="dg-s3"></span></div>
      <div id="dg-step-website">
        <h2>Enter your website to start</h2>
        <p class="sub">We'll scan your digital presence and show your DigitalGate Business Health Score™.</p>
        <form id="dg-website-form">
          <label for="dg-url">Website URL</label>
          <input id="dg-url" required autocomplete="url" placeholder="https://yourbusiness.com.au" />
          <button type="submit">Get My Free Business Audit →</button>
          <p class="note">No credit card required. Takes less than 60 seconds.</p>
        </form>
        <div id="dg-scan" class="scan hidden" aria-hidden="true"></div>
      </div>
      <div id="dg-step-preview" class="hidden">
        <p style="margin:0 0 .35rem;font-size:.72rem;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:#60A5FA;text-align:center">DigitalGate Business Health Score™</p>
        <p id="dg-score" class="score"></p>
        <p class="meta" id="dg-url-meta"></p>
        <div id="dg-pillars" class="bars"></div>
        <h3 style="margin:0 0 .55rem;font-size:1.05rem;color:#fff;font-family:Sora,system-ui,sans-serif">Here's what we'd fix first</h3>
        <ol id="dg-opps" style="margin:0 0 1.2rem;padding-left:1.15rem;color:#cbd5e1;font-size:.9rem;line-height:1.5"></ol>
        <button type="button" id="dg-to-contact">Get the full report →</button>
      </div>
      <div id="dg-step-contact" class="hidden">
        <h2>Get your full DigitalGate Business Audit™</h2>
        <p class="sub">We'll email the full breakdown and keep your DigitalGate Business Health Score™ on file.</p>
        <form id="dg-contact-form">
          <label for="dg-name">Full name</label>
          <input id="dg-name" required />
          <label for="dg-email">Email</label>
          <input id="dg-email" type="email" required />
          <label for="dg-biz">Business</label>
          <input id="dg-biz" required />
          <label for="dg-phone">Phone (optional)</label>
          <input id="dg-phone" type="tel" />
          <label for="dg-ind">Industry</label>
          <select id="dg-ind"><option value="">Select industry</option><option>Real estate</option><option>Professional services</option><option>Trades &amp; home services</option><option>Hospitality &amp; tourism</option><option>Health &amp; wellness</option><option>Retail &amp; e‑commerce</option><option>Construction &amp; development</option><option>Other</option></select>
          <button type="submit">Email My Full Report →</button>
        </form>
      </div>
      <div id="dg-step-done" class="hidden" style="text-align:center">
        <h2>You're all set</h2>
        <p class="sub" id="dg-done-msg"></p>
        <a class="cta" href="https://digitalgate.com.au/strategy-session">Show me how you'd fix this →</a>
      </div>
      <p id="dg-status" class="status" role="status"></p>
    </div>
    <p class="foot">DigitalGate Business Audit™ — a DigitalGate acquisition product.</p>
  </div>
</section>
<script>
(function(){
  var siteSlug="digitalgate-audit", websiteUrl="", score=null, pillars=null, opps=[];
  var stages=["Checking website foundations…","Reading search & indexing signals…","Scoring AI visibility…","Reviewing reputation & conversion…"];
  var statusEl=document.getElementById("dg-status"), scanEl=document.getElementById("dg-scan"), stageTimer=null;
  function scoreColor(n){return n>=75?"#34d399":n>=55?"#60A5FA":n>=40?"#fbbf24":"#f87171"}
  function setStatus(t,c){statusEl.textContent=t||"";statusEl.style.color=c||"#94a3b8"}
  function setSteps(n){[0,1,2,3].forEach(function(i){document.getElementById("dg-s"+i).classList.toggle("on",i<=n)})}
  function show(id,n){["dg-step-website","dg-step-preview","dg-step-contact","dg-step-done"].forEach(function(x){document.getElementById(x).classList.toggle("hidden",x!==id)});setSteps(n)}
  function startScan(){var i=0;scanEl.classList.remove("hidden");setStatus(stages[0],"#93c5fd");stageTimer=setInterval(function(){i=(i+1)%stages.length;setStatus(stages[i],"#93c5fd")},900)}
  function stopScan(){if(stageTimer)clearInterval(stageTimer);scanEl.classList.add("hidden")}
  document.getElementById("dg-url").focus();
  document.getElementById("dg-website-form").addEventListener("submit",async function(e){
    e.preventDefault();
    var raw=document.getElementById("dg-url").value.trim();
    if(!raw){setStatus("Enter your website URL.","#fca5a5");return}
    startScan();
    try{
      var res=await fetch("/api/public/business-audit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"probe",siteSlug:siteSlug,websiteUrl:raw})});
      var json=await res.json().catch(function(){return null});
      stopScan();
      if(!res.ok){setStatus((json&&json.error&&json.error.message)||"Something went wrong.","#fca5a5");return}
      websiteUrl=(json&&json.data&&json.data.websiteUrl)||raw;
      score=json&&json.data&&json.data.overallScore;
      pillars=json&&json.data&&json.data.pillars;
      opps=(json&&json.data&&json.data.opportunities)||[];
      var scoreEl=document.getElementById("dg-score");
      scoreEl.textContent=(score!=null?score:"—")+"/100";
      scoreEl.style.color=scoreColor(score||0);
      document.getElementById("dg-url-meta").textContent=websiteUrl;
      var labels={websiteHealth:"Website Health",searchVisibility:"Search Visibility",aiVisibility:"AI Visibility",reputation:"Reputation",conversionReadiness:"Conversion Readiness"};
      var html="";
      if(pillars){Object.keys(labels).forEach(function(k){var v=pillars[k]||0;html+='<div><div class="bar-top"><span>'+labels[k]+'</span><strong style="color:'+scoreColor(v)+'">'+v+'</strong></div><div class="track"><div class="fill" style="width:'+v+'%;background:'+scoreColor(v)+'"></div></div></div>'})}
      document.getElementById("dg-pillars").innerHTML=html;
      document.getElementById("dg-opps").innerHTML=(opps.length?opps:[{title:"Deepen your digital foundations",detail:"We'll expand this once we have your details."}]).map(function(o){return "<li><strong style='color:#e2e8f0'>"+o.title+"</strong>"+(o.detail?" — "+o.detail:"")+"</li>"}).join("");
      setStatus("");show("dg-step-preview",1);
    }catch(err){stopScan();setStatus("Network error. Please try again.","#fca5a5")}
  });
  document.getElementById("dg-to-contact").addEventListener("click",function(){setStatus("");show("dg-step-contact",2)});
  document.getElementById("dg-contact-form").addEventListener("submit",async function(e){
    e.preventDefault();
    setStatus("Preparing your DigitalGate Business Audit™…","#93c5fd");
    try{
      var res=await fetch("/api/public/business-audit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",siteSlug:siteSlug,websiteUrl:websiteUrl||document.getElementById("dg-url").value.trim(),fullName:document.getElementById("dg-name").value.trim(),email:document.getElementById("dg-email").value.trim(),businessName:document.getElementById("dg-biz").value.trim(),phone:document.getElementById("dg-phone").value.trim(),industry:document.getElementById("dg-ind").value})});
      var json=await res.json().catch(function(){return null});
      if(!res.ok){setStatus((json&&json.error&&json.error.message)||"Something went wrong.","#fca5a5");return}
      document.getElementById("dg-done-msg").textContent=(json&&json.data&&json.data.message)||"Your DigitalGate Business Audit™ is on its way — check your inbox shortly.";
      setStatus("");show("dg-step-done",3);
    }catch(err){setStatus("Network error. Please try again.","#fca5a5")}
  });
})();
</script>`;

async function upsertFunnel(slug, pageSlug, title, seo, html) {
  const site = await prisma.website.findUnique({ where: { slug } });
  if (!site) {
    console.log("! missing", slug);
    return;
  }
  const meta =
    site.metadata && typeof site.metadata === "object" ? { ...site.metadata } : {};
  const chrome =
    meta.chrome && typeof meta.chrome === "object" ? { ...meta.chrome } : {};
  chrome.headerHtml = "";
  chrome.footerHtml = "";
  chrome.stylesheets = [];
  meta.chrome = chrome;
  meta.kind = "funnel";
  await prisma.website.update({
    where: { id: site.id },
    data: { metadata: meta },
  });

  const page =
    (await prisma.websitePage.findFirst({
      where: { websiteId: site.id, OR: [{ slug: pageSlug }, { intent: "home" }] },
    })) || null;
  const components = [
    {
      id: `html-funnel-${slug}`,
      type: "html",
      props: { html, fullBleed: true },
    },
  ];
  if (page) {
    await prisma.websitePage.update({
      where: { id: page.id },
      data: { title, slug: pageSlug, intent: "home", status: "published", seo, components },
    });
  } else {
    await prisma.websitePage.create({
      data: {
        websiteId: site.id,
        title,
        slug: pageSlug,
        intent: "home",
        status: "published",
        sortOrder: 0,
        seo,
        components,
      },
    });
  }
  console.log("✓", slug, "premium funnel seeded on", pageSlug);
}

async function main() {
  await upsertFunnel(
    "roe-realty-report",
    "property-report",
    "Free Instant Property Report",
    {
      title: "Free Property Report | Roe Realty",
      description:
        "Get your free Roe Realty Property Report™ — value range, buyer demand and comparable sales.",
      showHeader: false,
      showFooter: false,
    },
    RR_HTML,
  );
  await upsertFunnel(
    "digitalgate-audit",
    "business-audit",
    "Free Digital Business Audit™",
    {
      title: "Free DigitalGate Business Audit™ | DigitalGate",
      description:
        "Free DigitalGate Business Audit™ — website health, search, AI visibility, reputation and conversion readiness.",
      showHeader: false,
      showFooter: false,
    },
    DG_HTML,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());

#!/usr/bin/env node
/**
 * Temporary fullscreen HTML shells for product funnels.
 * Used while Vercel production is behind git main — works with the
 * generic html WebsiteRenderer path (no PropertyReportCapture required).
 *
 *   node --env-file=.env.local scripts/seed-funnel-fullscreen-html.mjs
 */

import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: ".env.local" });
const prisma = new PrismaClient();

const RR_HTML = `<style>
html,body{margin:0;padding:0;background:#1C2B2A}
.dg-funnel-rr{min-height:100dvh;width:100%;box-sizing:border-box;margin:0;padding:clamp(1.5rem,4vw,3rem) clamp(1rem,4vw,2.5rem);display:flex;flex-direction:column;justify-content:center;background:linear-gradient(165deg,#1C2B2A 0%,#243836 48%,#F5F2EF 48%);color:#1C2B2A;font-family:system-ui,sans-serif}
.dg-funnel-rr .wrap{width:100%;max-width:42rem;margin:0 auto}
.dg-funnel-rr a.brand{color:#C9A46C;text-decoration:none;font-size:.85rem;font-weight:600;letter-spacing:.04em}
.dg-funnel-rr .eyebrow{margin:1.25rem 0 .75rem;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#C9A46C}
.dg-funnel-rr h1{margin:0 0 .85rem;font-family:Georgia,serif;font-size:clamp(1.85rem,5vw,2.6rem);line-height:1.15;color:#fff;font-weight:600}
.dg-funnel-rr .lede{margin:0 0 1.35rem;font-size:1.05rem;line-height:1.55;color:rgba(245,242,239,.88)}
.dg-funnel-rr .trust{margin:0 0 1.75rem;padding:0;list-style:none;display:flex;flex-wrap:wrap;gap:.65rem 1.25rem;font-size:.9rem;color:rgba(245,242,239,.9)}
.dg-funnel-rr .trust span{color:#C9A46C;margin-right:.35rem}
.dg-funnel-rr .card{background:#fff;border-radius:.75rem;padding:1.75rem 1.5rem;box-shadow:0 8px 28px rgba(28,43,42,.08);border:1px solid rgba(28,43,42,.08)}
.dg-funnel-rr label{display:block;font-size:.8rem;font-weight:600;margin:0 0 .35rem;color:#5a5a5a}
.dg-funnel-rr input,.dg-funnel-rr select{width:100%;box-sizing:border-box;padding:.75rem .85rem;border-radius:.5rem;border:1px solid #d6d3d1;margin-bottom:.85rem;font-size:1rem}
.dg-funnel-rr button{width:100%;padding:.85rem 1rem;border-radius:.5rem;border:none;background:#1C2B2A;color:#fff;font-weight:600;font-size:.95rem;cursor:pointer}
.dg-funnel-rr .status{margin:1rem 0 0;font-size:.9rem}
.dg-funnel-rr .foot{margin:1.5rem 0 0;text-align:center;font-size:.8rem;color:#5a5a5a}
.dg-funnel-rr .hidden{display:none}
</style>
<section class="dg-funnel-rr">
  <div class="wrap">
    <a class="brand" href="https://roerealty.com.au">Roe Realty</a>
    <p class="eyebrow">Free Instant Report</p>
    <h1>Find Out What Buyers Would Pay for Your Property Right Now</h1>
    <p class="lede">Receive a value range, recent comparable sales, and buyer demand insights in minutes.</p>
    <ul class="trust">
      <li><span>✓</span>Buyer demand analytics</li>
      <li><span>✓</span>Instant valuation</li>
      <li><span>✓</span>No obligation</li>
    </ul>
    <div class="card">
      <div id="rr-step-address">
        <p style="margin:0 0 1rem;font-size:.85rem;color:#5a5a5a">Value range · Buyer demand · Comparable sales</p>
        <form id="rr-address-form">
          <label for="rr-address">Property address</label>
          <input id="rr-address" name="address" required placeholder="e.g. 123 Main Street, Currumbin QLD" />
          <button type="submit">Get My Free Report</button>
        </form>
      </div>
      <div id="rr-step-contact" class="hidden">
        <h3 style="margin:0 0 .35rem;font-size:1.35rem;font-family:Georgia,serif">Almost there</h3>
        <p style="margin:0 0 .75rem;color:#5a5a5a;font-size:.95rem">Where should we send your Property Value &amp; Buyer Demand Report?</p>
        <p id="rr-formatted" style="margin:0 0 1.25rem;padding:.65rem .75rem;background:#F5F2EF;border-radius:.4rem;font-size:.9rem"></p>
        <form id="rr-contact-form">
          <label for="rr-name">Full name</label>
          <input id="rr-name" required />
          <label for="rr-email">Email</label>
          <input id="rr-email" type="email" />
          <label for="rr-phone">Mobile</label>
          <input id="rr-phone" type="tel" />
          <label for="rr-type">Property type</label>
          <select id="rr-type"><option value="">Select…</option><option>House</option><option>Apartment</option><option>Townhouse</option><option>Unit</option><option>Land</option><option>Acreage</option><option>Other</option></select>
          <label for="rr-time">Timeframe</label>
          <select id="rr-time"><option value="">Select…</option><option>Ready now</option><option>1–3 months</option><option>3–6 months</option><option>6–12 months</option><option>Just researching</option></select>
          <button type="submit">Send My Report</button>
        </form>
      </div>
      <div id="rr-step-done" class="hidden" style="text-align:center">
        <h3 style="margin:0 0 .75rem;font-family:Georgia,serif">You're all set</h3>
        <p id="rr-done-msg" style="margin:0 0 1.25rem;line-height:1.55"></p>
        <a href="https://roerealty.com.au/property-appraisal" style="display:inline-flex;padding:.75rem 1.15rem;border-radius:.5rem;background:#C9A46C;color:#1C2B2A;font-weight:600;text-decoration:none">Book a free appraisal →</a>
      </div>
      <p id="rr-status" class="status" role="status"></p>
    </div>
    <p class="foot">A Roe Realty Property Report™ — powered by DigitalGate.</p>
  </div>
</section>
<script>
(function(){
  var siteSlug="roe-realty-report";
  var formatted="";
  var statusEl=document.getElementById("rr-status");
  function setStatus(t,c){statusEl.textContent=t||"";statusEl.style.color=c||"#5a5a5a"}
  function show(id){["rr-step-address","rr-step-contact","rr-step-done"].forEach(function(x){document.getElementById(x).classList.toggle("hidden",x!==id)})}
  document.getElementById("rr-address-form").addEventListener("submit",async function(e){
    e.preventDefault();
    var raw=document.getElementById("rr-address").value.trim();
    if(!raw){setStatus("Enter your property address.","#9b1c1c");return}
    setStatus("Finding address…");
    try{
      var res=await fetch("/api/public/property-report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"resolve",siteSlug:siteSlug,rawAddress:raw})});
      var json=await res.json().catch(function(){return null});
      if(!res.ok){setStatus((json&&json.error&&json.error.message)||"Could not look up that address.","#9b1c1c");return}
      formatted=(json&&json.data&&json.data.formatted)||raw;
      document.getElementById("rr-formatted").textContent=formatted;
      document.getElementById("rr-address").value=formatted;
      setStatus("");show("rr-step-contact");
    }catch(err){setStatus("Network error. Please try again.","#9b1c1c")}
  });
  document.getElementById("rr-contact-form").addEventListener("submit",async function(e){
    e.preventDefault();
    var name=document.getElementById("rr-name").value.trim();
    var email=document.getElementById("rr-email").value.trim();
    var phone=document.getElementById("rr-phone").value.trim();
    if(!name){setStatus("Please enter your full name.","#9b1c1c");return}
    if(!email&&!phone){setStatus("Please provide either an email or mobile number.","#9b1c1c");return}
    setStatus("Generating your Cotality property report…");
    try{
      var res=await fetch("/api/public/property-report",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",siteSlug:siteSlug,rawAddress:formatted||document.getElementById("rr-address").value.trim(),fullName:name,email:email,phone:phone,propertyType:document.getElementById("rr-type").value,timeframe:document.getElementById("rr-time").value})});
      var json=await res.json().catch(function(){return null});
      if(!res.ok){setStatus((json&&json.error&&json.error.message)||"Something went wrong.","#9b1c1c");return}
      document.getElementById("rr-done-msg").textContent=(json&&json.data&&json.data.message)||"Your report is on its way — check your inbox shortly.";
      setStatus("");show("rr-step-done");
    }catch(err){setStatus("Network error. Please try again.","#9b1c1c")}
  });
})();
</script>`;

const DG_HTML = `<style>
html,body{margin:0;padding:0;background:#0A0E17}
.dg-funnel-dg{min-height:100dvh;width:100%;box-sizing:border-box;margin:0;padding:clamp(1.5rem,4vw,3rem) clamp(1rem,4vw,2.5rem);display:flex;flex-direction:column;justify-content:center;background:linear-gradient(180deg,#0A0E17 0%,#0b1220 55%,#111827 100%);color:#e2e8f0;font-family:system-ui,sans-serif}
.dg-funnel-dg .wrap{width:100%;max-width:42rem;margin:0 auto}
.dg-funnel-dg a.brand{color:#60A5FA;text-decoration:none;font-size:.85rem;font-weight:600;letter-spacing:.04em}
.dg-funnel-dg h1{margin:1rem 0 .65rem;font-size:clamp(1.75rem,4.5vw,2.45rem);line-height:1.15;color:#fff;font-weight:700}
.dg-funnel-dg .lede{margin:0 0 1.25rem;font-size:1.05rem;line-height:1.55;color:#94a3b8}
.dg-funnel-dg .card{background:rgba(15,23,42,.9);border-radius:1rem;padding:1.85rem 1.5rem;border:1px solid rgba(148,163,184,.2);box-shadow:0 20px 50px rgba(0,0,0,.35)}
.dg-funnel-dg label{display:block;font-size:.8rem;font-weight:600;margin:0 0 .35rem;color:#94a3b8}
.dg-funnel-dg input,.dg-funnel-dg select{width:100%;box-sizing:border-box;padding:.75rem .85rem;border-radius:.5rem;border:1px solid #334155;margin-bottom:.85rem;font-size:1rem;background:#0f172a;color:#e2e8f0}
.dg-funnel-dg button{width:100%;padding:.85rem 1rem;border-radius:999px;border:none;background:#3B82F6;color:#fff;font-weight:600;font-size:.95rem;cursor:pointer}
.dg-funnel-dg .status{margin:1rem 0 0;font-size:.9rem;color:#94a3b8}
.dg-funnel-dg .foot{margin:1.5rem 0 0;text-align:center;font-size:.8rem;color:#64748b}
.dg-funnel-dg .hidden{display:none}
.dg-funnel-dg .score{font-size:2.5rem;font-weight:700}
</style>
<section class="dg-funnel-dg">
  <div class="wrap">
    <a class="brand" href="https://digitalgate.com.au">DigitalGate</a>
    <h1>See how your business performs across the digital world</h1>
    <p class="lede">Instant snapshot of website health, search, AI visibility and conversion readiness — then we email your full DigitalGate Business Audit™.</p>
    <div class="card">
      <div id="dg-step-website">
        <p style="margin:0 0 1rem;font-size:.85rem;font-weight:600;color:#94a3b8">Enter your website to start</p>
        <form id="dg-website-form">
          <label for="dg-url">Website URL</label>
          <input id="dg-url" required placeholder="https://yourbusiness.com.au" />
          <button type="submit">Get My Free Business Audit →</button>
        </form>
      </div>
      <div id="dg-step-preview" class="hidden">
        <p style="margin:0 0 .5rem;font-size:.75rem;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#60A5FA">DigitalGate Business Health Score™</p>
        <p id="dg-score" class="score" style="margin:0 0 1rem"></p>
        <div id="dg-pillars" style="display:grid;gap:.55rem;margin-bottom:1.35rem"></div>
        <h4 style="margin:0 0 .65rem;color:#fff">Here's what we'd fix first</h4>
        <ol id="dg-opps" style="margin:0 0 1.35rem;padding-left:1.15rem;color:#cbd5e1;font-size:.9rem;line-height:1.5"></ol>
        <button type="button" id="dg-to-contact">Get the full report →</button>
      </div>
      <div id="dg-step-contact" class="hidden">
        <h3 style="margin:0 0 1rem;color:#fff">Get your full DigitalGate Business Audit™</h3>
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
          <select id="dg-ind"><option value="">Select…</option><option>Real estate</option><option>Professional services</option><option>Trades &amp; home services</option><option>Hospitality &amp; tourism</option><option>Health &amp; wellness</option><option>Retail &amp; e‑commerce</option><option>Construction &amp; development</option><option>Other</option></select>
          <button type="submit">Email My Full Report →</button>
        </form>
      </div>
      <div id="dg-step-done" class="hidden" style="text-align:center">
        <h3 style="margin:0 0 .75rem;color:#fff">You're all set</h3>
        <p id="dg-done-msg" style="margin:0 0 1.25rem;color:#cbd5e1;line-height:1.55"></p>
        <a href="https://digitalgate.com.au/strategy-session" style="display:inline-flex;padding:.75rem 1.25rem;border-radius:999px;background:#3B82F6;color:#fff;font-weight:600;text-decoration:none">Show me how you'd fix this →</a>
      </div>
      <p id="dg-status" class="status" role="status"></p>
    </div>
    <p class="foot">DigitalGate Business Audit™ — a DigitalGate acquisition product.</p>
  </div>
</section>
<script>
(function(){
  var siteSlug="digitalgate-audit";
  var websiteUrl=""; var score=null; var pillars=null; var opps=[];
  var statusEl=document.getElementById("dg-status");
  function setStatus(t,c){statusEl.textContent=t||"";statusEl.style.color=c||"#94a3b8"}
  function show(id){["dg-step-website","dg-step-preview","dg-step-contact","dg-step-done"].forEach(function(x){document.getElementById(x).classList.toggle("hidden",x!==id)})}
  function scoreColor(n){return n>=75?"#4ade80":n>=55?"#60A5FA":n>=40?"#fbbf24":"#f87171"}
  document.getElementById("dg-website-form").addEventListener("submit",async function(e){
    e.preventDefault();
    var raw=document.getElementById("dg-url").value.trim();
    if(!raw){setStatus("Enter your website URL.","#fca5a5");return}
    setStatus("DigitalGate is scanning your business…");
    try{
      var res=await fetch("/api/public/business-audit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"probe",siteSlug:siteSlug,websiteUrl:raw})});
      var json=await res.json().catch(function(){return null});
      if(!res.ok){setStatus((json&&json.error&&json.error.message)||"Something went wrong.","#fca5a5");return}
      websiteUrl=(json&&json.data&&json.data.websiteUrl)||raw;
      score=json&&json.data&&json.data.overallScore;
      pillars=json&&json.data&&json.data.pillars;
      opps=(json&&json.data&&json.data.opportunities)||[];
      var scoreEl=document.getElementById("dg-score");
      scoreEl.textContent=(score!=null?score:"—")+"/100";
      scoreEl.style.color=scoreColor(score||0);
      var labels={websiteHealth:"Website Health",searchVisibility:"Search Visibility",aiVisibility:"AI Visibility",reputation:"Reputation",conversionReadiness:"Conversion Readiness"};
      var html="";
      if(pillars){Object.keys(labels).forEach(function(k){html+='<div style="display:flex;justify-content:space-between;gap:.75rem;padding:.55rem .7rem;border-radius:.5rem;background:rgba(15,23,42,.75);border:1px solid rgba(51,65,85,.8)"><span style="color:#cbd5e1">'+labels[k]+'</span><strong style="color:'+scoreColor(pillars[k]||0)+'">'+(pillars[k]!=null?pillars[k]:"—")+'</strong></div>'})}
      document.getElementById("dg-pillars").innerHTML=html;
      document.getElementById("dg-opps").innerHTML=(opps.length?opps:[{title:"Deepen your digital foundations",detail:"We'll expand this once we have your details."}]).map(function(o){return "<li><strong style='color:#e2e8f0'>"+o.title+"</strong>"+(o.detail?" — "+o.detail:"")+"</li>"}).join("");
      document.getElementById("dg-biz").value="";
      setStatus("");show("dg-step-preview");
    }catch(err){setStatus("Network error. Please try again.","#fca5a5")}
  });
  document.getElementById("dg-to-contact").addEventListener("click",function(){setStatus("");show("dg-step-contact")});
  document.getElementById("dg-contact-form").addEventListener("submit",async function(e){
    e.preventDefault();
    setStatus("Sending your report…");
    try{
      var res=await fetch("/api/public/business-audit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"submit",siteSlug:siteSlug,websiteUrl:websiteUrl||document.getElementById("dg-url").value.trim(),fullName:document.getElementById("dg-name").value.trim(),email:document.getElementById("dg-email").value.trim(),businessName:document.getElementById("dg-biz").value.trim(),phone:document.getElementById("dg-phone").value.trim(),industry:document.getElementById("dg-ind").value})});
      var json=await res.json().catch(function(){return null});
      if(!res.ok){setStatus((json&&json.error&&json.error.message)||"Something went wrong.","#fca5a5");return}
      document.getElementById("dg-done-msg").textContent=(json&&json.data&&json.data.message)||"Your DigitalGate Business Audit™ is on its way — check your inbox shortly.";
      setStatus("");show("dg-step-done");
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
      data: {
        title,
        slug: pageSlug,
        intent: "home",
        status: "published",
        seo,
        components,
      },
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
  console.log("✓", slug, "fullscreen HTML seeded on", pageSlug);
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

#!/usr/bin/env node
/**
 * Print / apply Resend auth DNS for digitalgate.com.au and trigger verify.
 * Usage: node --env-file=.env.local scripts/prepare-resend-digitalgate-dns.mjs
 *
 * DNS goes at Dreamscape (or your DNS host) — NOT as a Vercel project domain.
 */
import { config } from "dotenv";

config({ path: ".env.local" });

const APEX = "digitalgate.com.au";

async function resend(path, init) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) throw new Error("RESEND_API_KEY not set");
  const res = await fetch(`https://api.resend.com${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  const json = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, json };
}

async function main() {
  const list = await resend("/domains");
  if (!list.ok) {
    console.error("list domains failed", list.status, list.json);
    process.exit(1);
  }
  let domain = (list.json.data || []).find(
    (d) => String(d.name || "").toLowerCase() === APEX,
  );
  if (!domain) {
    console.log("Creating Resend domain", APEX);
    const created = await resend("/domains", {
      method: "POST",
      body: JSON.stringify({ name: APEX }),
    });
    if (!created.ok) {
      console.error("create failed", created.status, created.json);
      process.exit(1);
    }
    domain = created.json;
  }

  const full = await resend(`/domains/${domain.id}`);
  const d = full.json;
  console.log(`\nResend domain: ${d.name}  status=${d.status}  id=${d.id}\n`);
  console.log(
    "Add these at Dreamscape DNS for digitalgate.com.au (do NOT add to Vercel Domains):\n",
  );
  for (const r of d.records || []) {
    const host =
      r.name === "@" || !r.name
        ? APEX
        : r.name.includes(APEX)
          ? r.name
          : `${r.name}.${APEX}`;
    console.log(
      `  ${String(r.type).padEnd(4)}  ${host.padEnd(45)}  ${r.priority != null ? `prio=${r.priority} ` : ""}${r.value}`,
    );
    console.log(`       purpose=${r.record || "—"}  status=${r.status || "—"}\n`);
  }

  console.log("Triggering Resend verify…");
  const verify = await resend(`/domains/${domain.id}/verify`, { method: "POST" });
  console.log("verify HTTP", verify.status, "status=", verify.json?.status || verify.json?.message);

  await new Promise((r) => setTimeout(r, 2500));
  const again = await resend(`/domains/${domain.id}`);
  console.log("\nAfter verify poll:", again.json?.status);
  for (const r of again.json?.records || []) {
    console.log(`  ${(r.record || r.type).padEnd(6)} ${r.name} → ${r.status}`);
  }

  if (!/^(verified|valid)$/i.test(String(again.json?.status || ""))) {
    console.log(`
NEXT (you):
1. In Dreamscape DNS for ${APEX}, create the records printed above
   (send MX + send TXT SPF + resend._domainkey TXT).
2. Do NOT add mail./send. as Vercel website domains.
3. Re-run: node --env-file=.env.local scripts/prepare-resend-digitalgate-dns.mjs
4. Push the Vercel build fix so production picks up email reply-to fallback.
`);
    process.exit(2);
  }

  console.log("\nDomain verified — funnel From hello@digitalgate.com.au can send.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

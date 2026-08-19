"use client";

import { useEffect, useRef, useState } from "react";

import { shouldCaptureHtmlForm } from "@/lib/legacy-wp-form-post";

/** Ben's standing Zoom room (same host as Roe consultations). */
const DG_CONSULT_ZOOM_URL =
  "https://us05web.zoom.us/j/9537192432?pwd=lqAE7buBTaal4XeBoAqVa7X9FboTcN.1";

const SPECIAL_FORM_IDS = new Set([
  "dgcontactform",
  "dgfoundingform",
  "dgbookingform",
  "dgdiscoveryform",
]);

export type PublicHtmlFormContext = {
  siteSlug: string;
  pageSlug?: string;
};

/**
 * Intercepts leftover public-site HTML forms and posts them to Gen 2
 * instead of WordPress / PHP. Rendered markup is unchanged.
 */
export function hydratePublicHtmlForms(
  root: HTMLElement,
  ctx: PublicHtmlFormContext,
  onStatus?: () => void,
): () => void {
  const cleanups: (() => void)[] = [];
  const siteSlug = ctx.siteSlug || "digitalgate";
  const pageSlug = ctx.pageSlug || "";
  const ping = () => onStatus?.();

    // ----- Contact form -----
    const contactForm = root.querySelector<HTMLFormElement>("#dgContactForm");
    if (contactForm) {
      disarmLegacyAction(contactForm);
      const status =
        (root.querySelector<HTMLElement>("#dgFormMessage") ||
          getOrCreateStatus(contactForm, "dgContactStatusMsg"));
      const handler = async (e: Event) => {
        e.preventDefault();
        const btn = contactForm.querySelector<HTMLButtonElement>("[type='submit']");
        const prevLabel = btn?.textContent ?? "Submit Enquiry →";
        setSubmitting(btn, status, "Sending…");

        const interested = checked(contactForm, "[name='interested_in']:checked");
        const achieve = checked(contactForm, "[name='achieve']:checked");

        const result = await postEnquiry(siteSlug, "contact", {
          type: "contact",
          name: val(contactForm, "#full_name"),
          email: val(contactForm, "#email"),
          phone: val(contactForm, "#phone"),
          business_name: val(contactForm, "#business_name"),
          industry: val(contactForm, "#industry"),
          team_size: val(contactForm, "#team_size"),
          current_software: val(contactForm, "#current_software"),
          interested_in: interested,
          achieve,
          heard_about: val(contactForm, "#heard_about"),
          message: val(contactForm, "#message"),
        });

        if (result.ok) {
          setSuccess(
            status,
            "Thanks! We'll review your enquiry and be in touch within one business day.",
          );
          contactForm.reset();
          if (btn) btn.textContent = prevLabel;
        } else {
          setError(status, result.message || "Something went wrong — please try again.");
          if (btn) { btn.disabled = false; btn.textContent = prevLabel; }
        }
        ping();
      };
      contactForm.addEventListener("submit", handler);
      cleanups.push(() => contactForm.removeEventListener("submit", handler));
    }

    // ----- Founding 10 form -----
    const foundingForm = root.querySelector<HTMLFormElement>("#dgFoundingForm");
    if (foundingForm) {
      disarmLegacyAction(foundingForm);
      relaxWebsiteFields(foundingForm);
      const status = getOrCreateStatus(foundingForm, "dgFoundingStatusMsg");
      const handler = async (e: Event) => {
        e.preventDefault();
        const btn = foundingForm.querySelector<HTMLButtonElement>("[type='submit']");
        const prevLabel = btn?.textContent ?? "Submit Founding 10 Application →";
        setSubmitting(btn, status, "Submitting…");

        const apps = checked(foundingForm, "[name='apps_interest']:checked");
        const termsEl = foundingForm.querySelector<HTMLInputElement>("[name='agree_founding_terms']");
        const hp = val(foundingForm, "[name='website_hp']");
        if (hp) {
          // Honeypot — silently succeed
          setSuccess(status, "Application received! We'll be in touch shortly.");
          if (btn) btn.textContent = prevLabel;
          ping();
          return;
        }

        const result = await postEnquiry(siteSlug, "founding-customers", {
          type: "founding_10",
          form_type: "founding_customer_application",
          page_slug: "founding-customers",
          name: val(foundingForm, "#fc_full_name"),
          email: val(foundingForm, "#fc_email"),
          phone: val(foundingForm, "#fc_phone"),
          business_name: val(foundingForm, "#fc_business_name"),
          business_website: val(foundingForm, "#fc_website"),
          industry: val(foundingForm, "#fc_industry"),
          team_size: val(foundingForm, "#fc_team_size"),
          current_software: val(foundingForm, "#fc_current_systems"),
          want_to_solve: val(foundingForm, "#fc_solve"),
          apps_interest: apps,
          message: val(foundingForm, "#fc_challenges"),
          agree_founding_terms: termsEl?.checked ? "yes" : "",
        });

        if (result.ok) {
          setSuccess(
            status,
            "Application received! We'll review your details and be in touch to arrange a platform consultation.",
          );
          foundingForm.reset();
          if (btn) btn.textContent = prevLabel;
        } else {
          setError(status, result.message || "Something went wrong — please try again.");
          if (btn) { btn.disabled = false; btn.textContent = prevLabel; }
        }
        ping();
      };
      foundingForm.addEventListener("submit", handler);
      cleanups.push(() => foundingForm.removeEventListener("submit", handler));
    }

    // ----- Platform Consultation booking form -----
    const bookingForm = root.querySelector<HTMLFormElement>("#dgBookingForm");
    if (bookingForm) {
      disarmLegacyAction(bookingForm);
      ensureZoomNote(bookingForm);
      const unbindSlots = bindConsultationSlots(bookingForm);
      cleanups.push(unbindSlots);
      const existingStatus =
        bookingForm.querySelector<HTMLElement>("#formStatus") ||
        getOrCreateStatus(bookingForm, "dgBookingStatusMsg");
      const handler = async (e: Event) => {
        e.preventDefault();
        const hp = val(bookingForm, "[name='website']");
        if (hp) return;

        const btn = bookingForm.querySelector<HTMLButtonElement>("#bookingSubmitBtn");
        const prevLabel = btn?.textContent ?? "Book Your Free Platform Consultation →";
        const nameVal = val(bookingForm, "[name='name']");
        const emailVal = val(bookingForm, "[name='email']");
        const dateVal = val(bookingForm, "[name='date']");
        const timeVal = val(bookingForm, "[name='time']");
        const notesVal = val(bookingForm, "[name='notes']");

        if (!nameVal.trim() || !emailVal.trim()) {
          setError(existingStatus, "Please fill in your name and email.");
          ping();
          return;
        }
        if (!dateVal || !timeVal) {
          setError(existingStatus, "Please select a date and time.");
          ping();
          return;
        }

        setSubmitting(btn, existingStatus, "Booking…");

        const message = [
          `Requested slot: ${dateVal} ${formatSlot(timeVal)} AEST`,
          `Zoom: ${DG_CONSULT_ZOOM_URL}`,
          notesVal.trim() ? `Notes: ${notesVal.trim()}` : "",
        ]
          .filter(Boolean)
          .join("\n");

        const result = await postEnquiry(siteSlug, "strategy-session", {
          type: "consultation",
          name: nameVal,
          email: emailVal,
          phone: val(bookingForm, "[name='phone']"),
          date: dateVal,
          time: timeVal,
          notes: notesVal,
          message,
        });

        if (result.ok) {
          setSuccess(
            existingStatus,
            `Booked. Join on Zoom at the selected time: ${DG_CONSULT_ZOOM_URL}`,
          );
          bookingForm.reset();
          renderConsultationSlots(bookingForm, "");
          if (btn) btn.textContent = prevLabel;
        } else {
          setError(existingStatus, result.message || "Something went wrong — please try again.");
          if (btn) { btn.disabled = false; btn.textContent = prevLabel; }
        }
        ping();
      };
      bookingForm.addEventListener("submit", handler);
      cleanups.push(() => bookingForm.removeEventListener("submit", handler));
    }

    // ----- DigitalGate /discover (was WP admin-ajax / dg_submit_discovery) -----
    const discoveryForm = root.querySelector<HTMLFormElement>("#dgDiscoveryForm");
    if (discoveryForm) {
      disarmLegacyAction(discoveryForm);
      cleanups.push(bindDiscoveryWizard(discoveryForm));
      const status = getOrCreateStatus(discoveryForm, "dgDiscoveryStatusMsg");
      const handler = async (e: Event) => {
        e.preventDefault();
        const hp = val(discoveryForm, "[name='website']");
        if (hp) {
          setSuccess(status, "Thanks — we'll be in touch shortly.");
          ping();
          return;
        }
        const btn =
          discoveryForm.querySelector<HTMLButtonElement>("#discoverySubmit") ||
          discoveryForm.querySelector<HTMLButtonElement>("[type='submit']");
        const prevLabel = btn?.textContent ?? "Get My Recommendations →";
        setSubmitting(btn, status, "Sending…");

        const result = await postEnquiry(siteSlug, pageSlug || "discover", {
          type: "contact",
          form_type: "platform_discovery",
          page_slug: pageSlug || "discover",
          siteSlug,
          name: val(discoveryForm, "[name='full_name']") || val(discoveryForm, "#full_name"),
          email: val(discoveryForm, "[name='email']") || val(discoveryForm, "#email"),
          phone: val(discoveryForm, "[name='phone']") || val(discoveryForm, "#phone"),
          business_name:
            val(discoveryForm, "[name='business_name']") ||
            val(discoveryForm, "#business_name"),
          industry: val(discoveryForm, "[name='industry']") || val(discoveryForm, "#industry"),
          team_size:
            val(discoveryForm, "[name='team_size']") || val(discoveryForm, "#team_size"),
          message: [
            val(discoveryForm, "[name='goals_message']"),
            val(discoveryForm, "[name='business_type']")
              ? `Business type: ${val(discoveryForm, "[name='business_type']")}`
              : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        });

        if (result.ok) {
          setSuccess(
            status,
            "Thanks — we'll review your details and send recommendations shortly.",
          );
          discoveryForm.reset();
          if (btn) btn.textContent = prevLabel;
        } else {
          setError(status, result.message || "Something went wrong — please try again.");
          if (btn) {
            btn.disabled = false;
            btn.textContent = prevLabel;
          }
        }
        ping();
      };
      discoveryForm.addEventListener("submit", handler);
      cleanups.push(() => discoveryForm.removeEventListener("submit", handler));
    }

    // ----- Any remaining HTML forms (CVH, Aëtherra, generic WP leftovers) -----
    for (const form of Array.from(root.querySelectorAll("form"))) {
      const id = (form.id || "").toLowerCase();
      if (SPECIAL_FORM_IDS.has(id)) continue;
      if (
        !shouldCaptureHtmlForm({
          method: form.getAttribute("method"),
          action: form.getAttribute("action"),
          formId: form.id,
        })
      ) {
        continue;
      }
      disarmLegacyAction(form);
      const status = getOrCreateStatus(form, `${form.id || "wb"}StatusMsg`);
      const handler = async (e: Event) => {
        e.preventDefault();
        if (honeypotValue(form)) {
          setSuccess(status, "Thanks! We'll be in touch shortly.");
          ping();
          return;
        }
        const btn = form.querySelector<HTMLButtonElement>("[type='submit']");
        const prevLabel = btn?.textContent ?? "Send";
        setSubmitting(btn, status, "Sending…");
        const fields = collectFormFields(form);
        const result = await post(
          `/api/v1/websites/public/${encodeURIComponent(siteSlug)}/form`,
          {
            ...fields,
            pageSlug: pageSlug || undefined,
          },
        );
        if (result.ok) {
          setSuccess(status, "Thanks! We'll be in touch shortly.");
          form.reset();
          if (btn) btn.textContent = prevLabel;
        } else {
          setError(status, result.message || "Something went wrong — please try again.");
          if (btn) {
            btn.disabled = false;
            btn.textContent = prevLabel;
          }
        }
        ping();
      };
      form.addEventListener("submit", handler);
      cleanups.push(() => form.removeEventListener("submit", handler));
    }

    return () => cleanups.forEach((fn) => fn());
}

/**
 * Intercepts leftover public HTML forms (Contact, Founding 10, Consultation,
 * Discovery, plus generic WP/PHP forms) and posts them to Gen 2.
 */
export function HtmlWithDgForms({
  html,
  siteSlug = "digitalgate",
  pageSlug,
}: {
  html: string;
  siteSlug?: string;
  pageSlug?: string;
}) {
  const rootRef = useRef<HTMLElement | null>(null);
  const [_tick, setTick] = useState(0);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    return hydratePublicHtmlForms(root, { siteSlug, pageSlug }, () =>
      setTick((t) => t + 1),
    );
  }, [html, siteSlug, pageSlug]);

  return (
    <section
      ref={rootRef}
      className="wb-section wb-html-block"
      dangerouslySetInnerHTML={{ __html: relaxWebsiteFieldHtml(html) }}
    />
  );
}

// -------- helpers --------

function disarmLegacyAction(form: HTMLFormElement) {
  form.removeAttribute("action");
  form.removeAttribute("onsubmit");
  form.action = "";
  form.onsubmit = null;
}

/** Accept domain-only websites — browsers reject type=url without http://. */
function isHoneypotWebsiteField(tagOrName: string, id = ""): boolean {
  return /website_hp/i.test(tagOrName) || /\bhp\b/i.test(id);
}

function relaxWebsiteFieldHtml(html: string): string {
  return html.replace(/<input\b[^>]*>/gi, (tag) => {
    if (isHoneypotWebsiteField(tag)) return tag;
    if (!/\btype=["']url["']/i.test(tag)) return tag;
    let next = tag.replace(/\btype=["']url["']/i, 'type="text"');
    next = next.replace(/\bpattern=["'][^"']*["']/i, "");
    if (/\bplaceholder=["']https?:\/\//i.test(next)) {
      next = next.replace(
        /\bplaceholder=["'][^"']*["']/i,
        'placeholder="yourwebsite.com.au"',
      );
    }
    return next;
  });
}

function relaxWebsiteFields(form: HTMLFormElement) {
  const fields = form.querySelectorAll<HTMLInputElement>(
    "#fc_website, input[name='business_website'], input[type='url']",
  );
  for (const field of fields) {
    if (isHoneypotWebsiteField(field.name, field.id)) continue;
    field.type = "text";
    field.removeAttribute("pattern");
    if (/^https?:\/\//i.test(field.placeholder)) {
      field.placeholder = "yourwebsite.com.au";
    }
  }
}

function brisbaneTodayIso(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Australia/Brisbane",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function formatSlot(t: string) {
  const [hh, mm] = t.split(":").map(Number);
  const ampm = hh >= 12 ? "PM" : "AM";
  const h12 = ((hh + 11) % 12) + 1;
  return `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

async function loadConsultationSlots(
  dateIso: string,
  signal?: AbortSignal,
): Promise<{ slots: string[]; closed: boolean; ok: boolean }> {
  try {
    const res = await fetch(
      `/api/public/consultation-slots?date=${encodeURIComponent(dateIso)}&site=digitalgate`,
      { signal },
    );
    const json = (await res.json().catch(() => ({}))) as {
      data?: { slots?: string[]; closed?: boolean };
    };
    if (!res.ok) return { slots: [], closed: false, ok: false };
    return {
      slots: Array.isArray(json.data?.slots) ? json.data.slots : [],
      closed: Boolean(json.data?.closed),
      ok: true,
    };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      return { slots: [], closed: false, ok: true };
    }
    return { slots: [], closed: false, ok: false };
  }
}

function renderConsultationSlots(form: HTMLFormElement, dateIso: string, signal?: AbortSignal) {
  const container = form.querySelector<HTMLElement>("#timeSlotsContainer");
  const hidden = form.querySelector<HTMLInputElement>("#booking_time");
  if (!container || !hidden) return;
  hidden.value = "";
  if (!dateIso) {
    container.innerHTML =
      '<div class="slot-placeholder">Select a date to see available times</div>';
    return;
  }
  container.innerHTML = '<div class="slot-placeholder">Loading times…</div>';
  void loadConsultationSlots(dateIso, signal).then((result) => {
    if (signal?.aborted) return;
    if (!result.ok) {
      container.innerHTML =
        '<div class="slot-placeholder">Couldn’t load times — pick the date again.</div>';
      return;
    }
    if (result.closed) {
      container.innerHTML =
        '<div class="slot-placeholder">Consultations aren’t available on Sundays — try a weekday.</div>';
      return;
    }
    if (!result.slots.length) {
      container.innerHTML =
        '<div class="slot-placeholder">No times left that day — try another weekday.</div>';
      return;
    }
    container.innerHTML = "";
    for (const slot of result.slots) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "time-slot";
      btn.textContent = formatSlot(slot);
      btn.dataset.time = slot;
      btn.addEventListener("click", () => {
        hidden.value = slot;
        container.querySelectorAll(".time-slot").forEach((el) => el.classList.remove("selected"));
        btn.classList.add("selected");
      });
      container.appendChild(btn);
    }
  });
}

function bindConsultationSlots(form: HTMLFormElement) {
  const dateInput = form.querySelector<HTMLInputElement>("#booking_date, [name='date']");
  if (!dateInput) return () => undefined;
  dateInput.removeAttribute("onchange");
  dateInput.onchange = null;
  dateInput.min = brisbaneTodayIso();
  let abort: AbortController | null = null;
  const onChange = () => {
    abort?.abort();
    abort = new AbortController();
    renderConsultationSlots(form, dateInput.value, abort.signal);
  };
  dateInput.addEventListener("change", onChange);
  onChange();
  return () => {
    abort?.abort();
    dateInput.removeEventListener("change", onChange);
  };
}

function ensureZoomNote(form: HTMLFormElement) {
  if (form.querySelector("#dgConsultZoomNote")) return;
  const note = document.createElement("p");
  note.id = "dgConsultZoomNote";
  note.style.cssText = "margin:0 0 1rem;font-size:0.85rem;color:#94A3B8;line-height:1.5;";
  note.innerHTML = `Meetings are on Zoom (AEST). After you book, use this link:<br/><a href="${DG_CONSULT_ZOOM_URL}" target="_blank" rel="noreferrer" style="color:#93C5FD;word-break:break-all;">${DG_CONSULT_ZOOM_URL}</a>`;
  form.insertBefore(note, form.firstChild);
}

function val(root: Element, selector: string): string {
  return (
    (root.querySelector<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(selector)
      ?.value) ?? ""
  );
}

function checked(root: Element, selector: string): string[] {
  return Array.from(root.querySelectorAll<HTMLInputElement>(selector)).map(
    (el) => el.value,
  );
}

function getOrCreateStatus(form: HTMLFormElement, id: string): HTMLElement {
  const existing = form.querySelector<HTMLElement>(`#${id}`);
  if (existing) return existing;
  const div = document.createElement("div");
  div.id = id;
  div.style.cssText =
    "display:none;margin-top:1rem;padding:0.85rem 1rem;border-radius:8px;font-size:0.9rem;";
  form.appendChild(div);
  return div;
}

function setSubmitting(
  btn: HTMLButtonElement | null | undefined,
  status: HTMLElement,
  label: string,
) {
  if (btn) { btn.disabled = true; btn.textContent = label; }
  status.style.display = "none";
}

function setSuccess(status: HTMLElement, msg: string) {
  status.style.cssText =
    "display:block;margin-top:1rem;padding:0.85rem 1rem;border-radius:8px;font-size:0.9rem;" +
    "background:rgba(52,211,153,0.1);border:1px solid rgba(52,211,153,0.2);color:#34D399;";
  status.textContent = msg;
}

function setError(status: HTMLElement, msg: string) {
  status.style.cssText =
    "display:block;margin-top:1rem;padding:0.85rem 1rem;border-radius:8px;font-size:0.9rem;" +
    "background:rgba(248,113,113,0.1);border:1px solid rgba(248,113,113,0.15);color:#F87171;";
  status.textContent = msg;
}

async function postEnquiry(
  siteSlug: string,
  pageSlug: string,
  body: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const rich = await post("/api/public/dg-enquiry", { ...body, siteSlug });
  if (rich.ok) return rich;
  if (rich.status && rich.status >= 400 && rich.status < 500 && rich.status !== 404) {
    return rich;
  }
  // Founding 10 / consultation must not fall back to the generic website form —
  // that path stores them as a contact enquiry and sends the wrong ack.
  if (body.type === "founding_10" || body.type === "consultation") {
    return rich;
  }
  const fallback = await post(
    `/api/v1/websites/public/${encodeURIComponent(siteSlug || "digitalgate")}/form`,
    {
      name: String(body.name || ""),
      email: String(body.email || ""),
      phone: String(body.phone || ""),
      message: String(body.message || body.notes || ""),
      pageSlug,
    },
  );
  return fallback.ok ? fallback : rich;
}

function honeypotValue(form: HTMLFormElement): string {
  return (
    val(form, "[name='website_hp']") ||
    val(form, "[name='honeypot']") ||
    val(form, "input[name='website'][tabindex='-1']")
  );
}

function collectFormFields(form: HTMLFormElement): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const controls = form.querySelectorAll<
    HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
  >("input, select, textarea");
  for (const el of Array.from(controls)) {
    const type = "type" in el ? String(el.type || "").toLowerCase() : "";
    if (type === "submit" || type === "button" || type === "file" || type === "reset") {
      continue;
    }
    const key = (el.getAttribute("name") || el.id || "").trim();
    if (!key) continue;
    if (type === "checkbox" || type === "radio") {
      const input = el as HTMLInputElement;
      if (!input.checked) continue;
      const existing = out[key];
      if (existing == null) out[key] = input.value || "on";
      else if (Array.isArray(existing)) existing.push(input.value || "on");
      else out[key] = [String(existing), input.value || "on"];
      continue;
    }
    const value = el.value?.trim() || "";
    if (!value) continue;
    out[key] = value;
  }
  return out;
}

function bindDiscoveryWizard(form: HTMLFormElement): () => void {
  const steps = Array.from(form.querySelectorAll<HTMLElement>(".discovery-step"));
  if (steps.length < 2) return () => undefined;
  const nextBtn = form.querySelector<HTMLButtonElement>("#discoveryNext");
  const prevBtn = form.querySelector<HTMLButtonElement>("#discoveryPrev");
  const submitBtn = form.querySelector<HTMLButtonElement>("#discoverySubmit");
  let index = 0;

  const paint = () => {
    steps.forEach((step, i) => {
      const active = i === index;
      step.style.display = active ? "" : "none";
      step.classList.toggle("is-active", active);
    });
    if (prevBtn) prevBtn.style.display = index === 0 ? "none" : "";
    if (nextBtn) nextBtn.style.display = index >= steps.length - 1 ? "none" : "";
    if (submitBtn) {
      submitBtn.style.display = index >= steps.length - 1 ? "" : "none";
    }
  };

  const currentInvalid = () => {
    const step = steps[index];
    if (!step) return false;
    const required = Array.from(
      step.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "[required]",
      ),
    );
    for (const field of required) {
      if (!field.value?.trim()) {
        field.reportValidity?.();
        return true;
      }
    }
    return false;
  };

  const onNext = () => {
    if (currentInvalid()) return;
    index = Math.min(steps.length - 1, index + 1);
    paint();
  };
  const onPrev = () => {
    index = Math.max(0, index - 1);
    paint();
  };

  nextBtn?.addEventListener("click", onNext);
  prevBtn?.addEventListener("click", onPrev);
  paint();
  return () => {
    nextBtn?.removeEventListener("click", onNext);
    prevBtn?.removeEventListener("click", onPrev);
  };
}

async function post(
  url: string,
  body: Record<string, unknown>,
): Promise<{ ok: true } | { ok: false; message: string; status?: number }> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    if (!res.ok) {
      return {
        ok: false,
        status: res.status,
        message: json.error?.message || `Error ${res.status}`,
      };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: "Network error — please check your connection and try again." };
  }
}

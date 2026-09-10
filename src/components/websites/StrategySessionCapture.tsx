"use client";

import { useEffect, useState, type FormEvent } from "react";

import {
  DG_STRATEGY_SESSION_DESCRIPTION,
  DG_STRATEGY_SESSION_HERO,
  DG_STRATEGY_SESSION_TITLE,
} from "@/lib/dg-strategy-session";

const DG_CONSULT_ZOOM_URL =
  "https://us05web.zoom.us/j/9537192432?pwd=lqAE7buBTaal4XeBoAqVa7X9FboTcN.1";

type Props = {
  siteSlug: string;
};

type SlotsResult = {
  slots: string[];
  closed: boolean;
  ok: boolean;
};

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

function formatDateLabel(dateIso: string) {
  const noonUtc = new Date(`${dateIso}T02:00:00Z`);
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: "Australia/Brisbane",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(noonUtc);
}

async function loadSlots(dateIso: string, signal?: AbortSignal): Promise<SlotsResult> {
  try {
    const res = await fetch(
      `/api/public/consultation-slots?date=${encodeURIComponent(dateIso)}&site=digitalgate`,
      { signal },
    );
    const json = (await res.json().catch(() => ({}))) as {
      data?: { slots?: string[]; closed?: boolean };
      error?: { message?: string };
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

const CSS = `
.dg-ss {
  --dg-bg: #0A0E17;
  --dg-card: #111827;
  --dg-line: rgba(59, 130, 246, 0.18);
  --dg-ink: #F8FAFC;
  --dg-muted: #94A3B8;
  --dg-blue: #3B82F6;
  --dg-blue-soft: #93C5FD;
  color: var(--dg-ink);
  background: var(--dg-bg);
  font-family: Inter, "Plus Jakarta Sans", system-ui, sans-serif;
  padding: clamp(6.5rem, 12vw, 8rem) clamp(1rem, 4vw, 1.75rem) 4rem;
  box-sizing: border-box;
}
.dg-ss *, .dg-ss *::before, .dg-ss *::after { box-sizing: border-box; }
.dg-ss__inner { max-width: 1120px; margin: 0 auto; }
.dg-ss__grid {
  display: grid;
  grid-template-columns: minmax(0, 1.05fr) minmax(0, 0.95fr);
  gap: clamp(1.5rem, 4vw, 2.75rem);
  align-items: start;
}
.dg-ss__kicker {
  display: inline-block;
  margin: 0 0 0.85rem;
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--dg-blue-soft);
}
.dg-ss h1 {
  margin: 0 0 1rem;
  font-size: clamp(2rem, 5vw, 3.1rem);
  line-height: 1.12;
  letter-spacing: -0.03em;
}
.dg-ss__lede {
  margin: 0 0 1.25rem;
  color: var(--dg-muted);
  font-size: 1.05rem;
  line-height: 1.65;
  max-width: 38rem;
}
.dg-ss__list {
  margin: 0 0 1.5rem;
  padding: 0;
  list-style: none;
  display: grid;
  gap: 0.65rem;
  color: #CBD5E1;
  font-size: 0.95rem;
  line-height: 1.5;
}
.dg-ss__list li { padding-left: 1.2rem; position: relative; }
.dg-ss__list li::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.55rem;
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
  background: var(--dg-blue);
}
.dg-ss__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem 1rem;
  margin: 0 0 1.25rem;
  color: #CBD5E1;
  font-size: 0.88rem;
}
.dg-ss__hero {
  width: 100%;
  aspect-ratio: 16 / 10;
  object-fit: cover;
  border-radius: 18px;
  border: 1px solid var(--dg-line);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.35);
}
.dg-ss__card {
  background: linear-gradient(180deg, rgba(17, 24, 39, 0.96), #0F172A);
  border: 1px solid var(--dg-line);
  border-radius: 20px;
  padding: clamp(1.25rem, 3vw, 1.75rem);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.28);
}
.dg-ss__card h2 {
  margin: 0 0 0.35rem;
  font-size: 1.25rem;
}
.dg-ss__card p.dg-ss__hint {
  margin: 0 0 1.15rem;
  color: var(--dg-muted);
  font-size: 0.92rem;
  line-height: 1.5;
}
.dg-ss__form { display: grid; gap: 0.9rem; }
.dg-ss__field { display: grid; gap: 0.35rem; }
.dg-ss__field label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #E2E8F0;
}
.dg-ss__field input,
.dg-ss__field textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: #0B1220;
  color: #F8FAFC;
  padding: 0.7rem 0.8rem;
  font: inherit;
}
.dg-ss__field input:focus,
.dg-ss__field textarea:focus {
  outline: 2px solid rgba(59, 130, 246, 0.45);
  border-color: transparent;
}
.dg-ss__hp {
  position: absolute;
  left: -9999px;
  height: 0;
  overflow: hidden;
}
.dg-ss__slots {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(6.4rem, 1fr));
  gap: 0.45rem;
}
.dg-ss__slot {
  border: 1px solid rgba(148, 163, 184, 0.22);
  background: #0B1220;
  color: #E2E8F0;
  border-radius: 10px;
  padding: 0.55rem 0.4rem;
  font-size: 0.85rem;
  cursor: pointer;
}
.dg-ss__slot.is-selected {
  background: rgba(59, 130, 246, 0.18);
  border-color: var(--dg-blue);
  color: #DBEAFE;
}
.dg-ss__empty {
  color: var(--dg-muted);
  font-size: 0.88rem;
  padding: 0.4rem 0;
}
.dg-ss__error {
  margin: 0;
  color: #FCA5A5;
  font-size: 0.88rem;
}
.dg-ss__submit {
  margin-top: 0.25rem;
  border: 0;
  border-radius: 12px;
  background: linear-gradient(180deg, #60A5FA, #2563EB);
  color: white;
  font-weight: 700;
  padding: 0.85rem 1rem;
  cursor: pointer;
}
.dg-ss__submit:disabled { opacity: 0.65; cursor: wait; }
.dg-ss__confirm {
  display: grid;
  gap: 0.75rem;
}
.dg-ss__confirm h2 { margin: 0; font-size: 1.4rem; }
.dg-ss__confirm p { margin: 0; color: #CBD5E1; line-height: 1.6; }
.dg-ss__confirm a { color: var(--dg-blue-soft); word-break: break-all; }
@media (max-width: 860px) {
  .dg-ss { padding-top: 6.25rem; }
  .dg-ss__grid { grid-template-columns: 1fr; }
}
`;

export function StrategySessionCapture({ siteSlug }: Props) {
  const minDate = brisbaneTodayIso();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [closed, setClosed] = useState(false);
  const [slotsOk, setSlotsOk] = useState(true);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [honeypot, setHoneypot] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<{ date: string; time: string } | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sent = new URLSearchParams(window.location.search).get("sent");
    if (sent === "1") {
      setConfirmed({ date: "", time: "" });
    }
  }, []);

  useEffect(() => {
    if (!date) {
      setSlots([]);
      setClosed(false);
      setSlotsOk(true);
      return;
    }
    const abort = new AbortController();
    setLoadingSlots(true);
    setTime("");
    void loadSlots(date, abort.signal).then((result) => {
      if (abort.signal.aborted) return;
      setSlots(result.slots);
      setClosed(result.closed);
      setSlotsOk(result.ok);
      setLoadingSlots(false);
    });
    return () => abort.abort();
  }, [date]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (!name.trim() || !email.trim() || !phone.trim() || !businessName.trim()) {
      setError("Please complete your name, email, mobile and business name.");
      return;
    }
    if (!date || !time) {
      setError("Please select a date and time.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/public/dg-enquiry", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          type: "consultation",
          name: name.trim(),
          email: email.trim(),
          phone: phone.trim(),
          businessName: businessName.trim(),
          date,
          time,
          notes: notes.trim() || undefined,
          message: notes.trim() || undefined,
          honeypot,
          website_hp: honeypot,
          siteSlug: siteSlug || "digitalgate",
          pageSlug: "strategy-session",
        }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
      };
      if (!res.ok) {
        setError(json.error?.message || "That time isn’t available — please choose another slot.");
        setBusy(false);
        return;
      }
      setConfirmed({ date, time });
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  }

  const slotMessage = !date
    ? "Select a date to see available times."
    : loadingSlots
      ? "Loading times…"
      : !slotsOk
        ? "Couldn’t load times — pick the date again."
        : closed
          ? "Sessions aren’t available on Sundays — try a weekday."
          : slots.length === 0
            ? "No times left that day — try another weekday."
            : "";

  return (
    <section className="dg-ss">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <div className="dg-ss__inner">
        <div className="dg-ss__grid">
          <div>
            <p className="dg-ss__kicker">DigitalGate Strategy Session</p>
            <h1>{DG_STRATEGY_SESSION_TITLE}</h1>
            <p className="dg-ss__lede">{DG_STRATEGY_SESSION_DESCRIPTION}</p>
            <ul className="dg-ss__list">
              <li>Understand how the business currently runs — systems, data and day-to-day work.</li>
              <li>Identify opportunities for CRM, websites, marketing, automation, AI and operations.</li>
              <li>Decide whether DigitalGate is a good fit, and what a sensible next step would be.</li>
            </ul>
            <p className="dg-ss__meta">
              <span>30–45 minutes</span>
              <span>Zoom · Queensland time (AEST)</span>
              <span>No obligation</span>
            </p>
            <img
              className="dg-ss__hero"
              src={DG_STRATEGY_SESSION_HERO}
              alt="DigitalGate Strategy Session"
            />
          </div>

          <div className="dg-ss__card">
            {confirmed ? (
              <div className="dg-ss__confirm" data-testid="strategy-session-confirmation">
                <h2>You’re booked</h2>
                {confirmed.date && confirmed.time ? (
                  <p>
                    {formatDateLabel(confirmed.date)} at {formatSlot(confirmed.time)} AEST.
                  </p>
                ) : (
                  <p>Your Strategy Session is confirmed.</p>
                )}
                <p>
                  A confirmation email is on its way, including a calendar invite. Join on Zoom at
                  the booked time:
                </p>
                <p>
                  <a href={DG_CONSULT_ZOOM_URL} target="_blank" rel="noreferrer">
                    {DG_CONSULT_ZOOM_URL}
                  </a>
                </p>
              </div>
            ) : (
              <>
                <h2>Choose a time</h2>
                <p className="dg-ss__hint">
                  Pick an available slot, then leave your details. We’ll confirm immediately.
                </p>
                <form className="dg-ss__form" onSubmit={onSubmit} noValidate>
                  <div className="dg-ss__hp" aria-hidden>
                    <label>
                      Website
                      <input
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        tabIndex={-1}
                        autoComplete="off"
                      />
                    </label>
                  </div>
                  <div className="dg-ss__field">
                    <label htmlFor="dg-ss-date">Date</label>
                    <input
                      id="dg-ss-date"
                      type="date"
                      min={minDate}
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="dg-ss__field">
                    <label>Available times</label>
                    {slotMessage ? <div className="dg-ss__empty">{slotMessage}</div> : null}
                    {date && !loadingSlots && slots.length > 0 ? (
                      <div className="dg-ss__slots" role="listbox" aria-label="Available times">
                        {slots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            role="option"
                            aria-selected={time === slot}
                            className={`dg-ss__slot${time === slot ? " is-selected" : ""}`}
                            onClick={() => setTime(slot)}
                          >
                            {formatSlot(slot)}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div className="dg-ss__field">
                    <label htmlFor="dg-ss-name">Name</label>
                    <input
                      id="dg-ss-name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      autoComplete="name"
                      required
                    />
                  </div>
                  <div className="dg-ss__field">
                    <label htmlFor="dg-ss-email">Email</label>
                    <input
                      id="dg-ss-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                      required
                    />
                  </div>
                  <div className="dg-ss__field">
                    <label htmlFor="dg-ss-phone">Mobile</label>
                    <input
                      id="dg-ss-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      autoComplete="tel"
                      required
                    />
                  </div>
                  <div className="dg-ss__field">
                    <label htmlFor="dg-ss-business">Business name</label>
                    <input
                      id="dg-ss-business"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      autoComplete="organization"
                      required
                    />
                  </div>
                  <div className="dg-ss__field">
                    <label htmlFor="dg-ss-notes">What would you like help with? (optional)</label>
                    <textarea
                      id="dg-ss-notes"
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                  {error ? <p className="dg-ss__error">{error}</p> : null}
                  <button className="dg-ss__submit" type="submit" disabled={busy}>
                    {busy ? "Booking…" : "Confirm booking"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

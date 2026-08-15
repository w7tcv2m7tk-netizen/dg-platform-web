"use client";

import { useMemo, useState, type FormEvent } from "react";
import type { PublicStayUnitPayload } from "@dg/platform-core";

type Props = {
  siteSlug: string;
  unit: PublicStayUnitPayload;
  basePath?: string;
};

function money(n: number | null | undefined) {
  if (n == null || !Number.isFinite(n)) return null;
  return `$${Math.round(n)}`;
}

function fmtDisplay(dateStr: string) {
  if (!dateStr) return "";
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function parseLocal(dateStr: string) {
  return new Date(`${dateStr}T12:00:00`);
}

function isSaturday(dateStr: string) {
  return parseLocal(dateStr).getDay() === 6;
}

function eachNight(checkin: string, checkout: string) {
  const nights: string[] = [];
  const start = parseLocal(checkin);
  const end = parseLocal(checkout);
  for (let d = new Date(start); d < end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    nights.push(`${y}-${m}-${day}`);
  }
  return nights;
}

function calcTotal(
  unit: PublicStayUnitPayload,
  checkin: string,
  checkout: string,
) {
  const nights = eachNight(checkin, checkout);
  let subtotal = 0;
  for (const night of nights) {
    const dow = parseLocal(night).getDay();
    const weekend = dow === 5 || dow === 6 || dow === 0;
    const rate = weekend
      ? (unit.weekendRate ?? unit.weekdayRate ?? 0)
      : (unit.weekdayRate ?? 0);
    subtotal += rate;
  }
  const cleaning = unit.cleaningFee ?? 0;
  return {
    nights: nights.length,
    subtotal,
    total: subtotal + cleaning,
  };
}

function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const startPad = first.getDay(); // Sun=0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: Array<{ date: string | null; day: number | null }> = [];
  for (let i = 0; i < startPad; i++) cells.push({ date: null, day: null });
  for (let d = 1; d <= daysInMonth; d++) {
    const date = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date, day: d });
  }
  while (cells.length % 7 !== 0) cells.push({ date: null, day: null });
  return cells;
}

function unitHref(basePath: string, slug: string) {
  const base = basePath && basePath !== "/" ? basePath.replace(/\/$/, "") : "";
  return `${base}/${slug}`;
}

export function CvhStayUnitBooking({ siteSlug, unit, basePath = "" }: Props) {
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }, []);

  const blocked = useMemo(() => new Set(unit.blockedDates), [unit.blockedDates]);
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [checkin, setCheckin] = useState("");
  const [checkout, setCheckout] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [guests, setGuests] = useState(2);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const priceLabel =
    money(unit.weekdayRate) != null
      ? `${money(unit.weekdayRate)}/night`
      : "Enquire";

  const summary =
    checkin && checkout ? calcTotal(unit, checkin, checkout) : null;

  const cells = monthMatrix(cursor.y, cursor.m);
  const monthLabel = new Date(cursor.y, cursor.m, 1).toLocaleDateString(
    "en-AU",
    { month: "long", year: "numeric" },
  );

  function dayState(date: string | null) {
    if (!date) return "empty";
    if (date < today) return "past";
    if (blocked.has(date)) return "blocked";
    if (isSaturday(date)) return "saturday";
    if (checkin && date === checkin) return "selected";
    if (checkout && date === checkout) return "selected";
    if (checkin && checkout && date > checkin && date < checkout) return "in-range";
    return "open";
  }

  function onPick(date: string) {
    const state = dayState(date);
    if (state === "past" || state === "blocked" || state === "empty") return;
    if (state === "saturday") return;

    if (!checkin || (checkin && checkout)) {
      setCheckin(date);
      setCheckout("");
      return;
    }
    if (date <= checkin) {
      setCheckin(date);
      setCheckout("");
      return;
    }
    const nights = eachNight(checkin, date);
    if (nights.some((n) => blocked.has(n))) {
      setError("Those dates include unavailable nights — please choose again.");
      setCheckin(date);
      setCheckout("");
      return;
    }
    if (unit.minNights && nights.length < unit.minNights) {
      setError(`Minimum stay is ${unit.minNights} night${unit.minNights > 1 ? "s" : ""}.`);
      return;
    }
    setError(null);
    setCheckout(date);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/public/accommodation/stay/${unit.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug,
          firstName,
          lastName,
          email,
          phone,
          checkin: checkin || undefined,
          checkout: checkout || undefined,
          guests,
          message,
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(json?.error?.message || "Could not send enquiry");
      }
      setSuccess("Thanks — we’ll reply with availability shortly.");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="cvh-stay-unit">
      <div className="cvh-stay-hero">
        {unit.heroImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={unit.heroImageUrl} alt={unit.title} />
        ) : (
          <div className="cvh-stay-hero-fallback" />
        )}
        <div className="cvh-stay-hero-overlay" />
        <div className="cvh-stay-hero-content">
          <p className="cvh-stay-badge">🌿 Reserve your stay</p>
          <h1>{unit.title}</h1>
          <p className="cvh-stay-price">{priceLabel}</p>
          <div className="cvh-stay-meta">
            {unit.sleeps != null ? <span>🛏️ Sleeps {unit.sleeps}</span> : null}
            {unit.bedrooms != null ? (
              <span>
                🚪 {unit.bedrooms} Bedroom{unit.bedrooms > 1 ? "s" : ""}
              </span>
            ) : null}
            {unit.bathrooms != null ? (
              <span>
                🛁 {unit.bathrooms} Bathroom{unit.bathrooms > 1 ? "s" : ""}
              </span>
            ) : null}
            {unit.maxGuests != null ? (
              <span>👥 Max {unit.maxGuests} Guests</span>
            ) : null}
            {unit.minNights != null ? (
              <span>📅 Min {unit.minNights} Nights</span>
            ) : null}
          </div>
        </div>
      </div>

      {unit.bookableSiblingSlugs.length > 1 ? (
        <div className="cvh-stay-tabs">
          {unit.bookableSiblingSlugs.map((slug) => (
            <a
              key={slug}
              href={unitHref(basePath, slug)}
              className={
                slug === unit.slug
                  ? "cvh-stay-tab is-active"
                  : "cvh-stay-tab"
              }
            >
              {slug === "private-studio" ? "Garden Studio" : "Tiny Home"}
            </a>
          ))}
        </div>
      ) : null}

      <div className="cvh-stay-layout">
        <div className="cvh-stay-main">
          <section className="cvh-stay-section">
            <h2>About this accommodation</h2>
            {unit.description ? (
              <div className="cvh-stay-copy">
                {unit.description.split(/\n+/).map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            ) : null}
          </section>

          <section className="cvh-stay-section">
            <h3>📅 Check availability</h3>
            <p className="cvh-stay-hint">
              Select your check-in date, then your check-out date. Saturdays are
              overnight-only — no Saturday check-in or check-out.
            </p>
            <div className="cvh-cal">
              <div className="cvh-cal-nav">
                <button
                  type="button"
                  onClick={() =>
                    setCursor((c) => {
                      const d = new Date(c.y, c.m - 1, 1);
                      return { y: d.getFullYear(), m: d.getMonth() };
                    })
                  }
                >
                  ‹
                </button>
                <strong>{monthLabel}</strong>
                <button
                  type="button"
                  onClick={() =>
                    setCursor((c) => {
                      const d = new Date(c.y, c.m + 1, 1);
                      return { y: d.getFullYear(), m: d.getMonth() };
                    })
                  }
                >
                  ›
                </button>
              </div>
              <div className="cvh-cal-grid cvh-cal-head">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <span key={d}>{d}</span>
                ))}
              </div>
              <div className="cvh-cal-grid">
                {cells.map((cell, idx) => {
                  const state = dayState(cell.date);
                  return (
                    <button
                      key={idx}
                      type="button"
                      disabled={
                        !cell.date ||
                        state === "past" ||
                        state === "blocked" ||
                        state === "saturday"
                      }
                      className={`cvh-cal-day is-${state}`}
                      onClick={() => cell.date && onPick(cell.date)}
                    >
                      {cell.day ?? ""}
                    </button>
                  );
                })}
              </div>
              <div className="cvh-cal-legend">
                <span>
                  <i className="is-open" /> Available
                </span>
                <span>
                  <i className="is-blocked" /> Unavailable
                </span>
                <span>
                  <i className="is-saturday" /> No Sat check-in/out
                </span>
                <span>
                  <i className="is-selected" /> Selected
                </span>
              </div>
            </div>
          </section>
        </div>

        <aside className="cvh-stay-side">
          <div className="cvh-stay-card">
            <h3>Rates</h3>
            <ul>
              {unit.weekdayRate != null ? (
                <li>
                  <span>Weekday</span>
                  <strong>{money(unit.weekdayRate)}/night</strong>
                </li>
              ) : null}
              {unit.weekendRate != null ? (
                <li>
                  <span>Weekend</span>
                  <strong>{money(unit.weekendRate)}/night</strong>
                </li>
              ) : null}
              {unit.cleaningFee != null ? (
                <li>
                  <span>Cleaning fee</span>
                  <strong>{money(unit.cleaningFee)}</strong>
                </li>
              ) : null}
            </ul>
          </div>

          {unit.features.length > 0 ? (
            <div className="cvh-stay-card">
              <h3>Features</h3>
              <ul className="cvh-stay-features">
                {unit.features.map((f) => (
                  <li key={f.key}>{f.label}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="cvh-stay-card" id="dg-booking-summary-panel">
            <h3>Your stay</h3>
            {summary && summary.nights > 0 ? (
              <ul>
                <li>
                  <span>Check-in</span>
                  <strong>{fmtDisplay(checkin)}</strong>
                </li>
                <li>
                  <span>Check-out</span>
                  <strong>{fmtDisplay(checkout)}</strong>
                </li>
                <li>
                  <span>Nights</span>
                  <strong>{summary.nights}</strong>
                </li>
                <li>
                  <span>Subtotal</span>
                  <strong>${summary.subtotal.toFixed(2)}</strong>
                </li>
                <li>
                  <span>Estimated total</span>
                  <strong>${summary.total.toFixed(2)}</strong>
                </li>
              </ul>
            ) : (
              <p className="cvh-stay-hint">Select dates on the calendar.</p>
            )}
          </div>

          <div className="cvh-stay-card cvh-stay-form-card">
            <h3>Enquire to book</h3>
            <form onSubmit={onSubmit} className="cvh-stay-form">
              <div className="cvh-stay-form-row">
                <label>
                  First name
                  <input
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </label>
                <label>
                  Last name
                  <input
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </label>
              </div>
              <label>
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label>
                Phone
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </label>
              <label>
                Guests
                <input
                  type="number"
                  min={1}
                  max={unit.maxGuests ?? 8}
                  value={guests}
                  onChange={(e) => setGuests(Number(e.target.value) || 1)}
                />
              </label>
              <label>
                Message
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Anything we should know?"
                />
              </label>
              {error ? <p className="cvh-stay-error">{error}</p> : null}
              {success ? <p className="cvh-stay-success">{success}</p> : null}
              <button type="submit" disabled={busy}>
                {busy ? "Sending…" : "Send booking enquiry"}
              </button>
            </form>
          </div>

          <div className="cvh-stay-rules">
            <strong>Booking rules</strong>
            <ul>
              <li>Saturdays are available for overnight stays</li>
              <li>
                <strong>No check-ins</strong> on Saturdays
              </li>
              <li>
                <strong>No check-outs</strong> on Saturdays
              </li>
              {unit.checkinTime ? (
                <li>Check-in from {unit.checkinTime}</li>
              ) : null}
              {unit.checkoutTime ? (
                <li>Check-out by {unit.checkoutTime}</li>
              ) : null}
            </ul>
          </div>

          <p className="cvh-stay-links">
            <a href={unitHref(basePath, "stay")}>All stays</a>
            <a href={unitHref(basePath, "gallery")}>Gallery</a>
            <a href={unitHref(basePath, "contact")}>Contact</a>
          </p>
        </aside>
      </div>
    </div>
  );
}

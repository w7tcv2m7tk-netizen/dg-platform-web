"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
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

/** Match Gen 2 quotePublicStay — best of Last Minute / Early Bird / Hideaway Circle. */
function calcTotal(
  unit: PublicStayUnitPayload,
  checkin: string,
  checkout: string,
  today: string,
  circleRewardPercent = 0,
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
  const daysUntil = Math.floor(
    (parseLocal(checkin).getTime() - parseLocal(today).getTime()) / 86_400_000,
  );
  const candidates: Array<{ percent: number; type: string }> = [];
  if (daysUntil >= 0 && daysUntil <= 3 && unit.lastMinuteDiscount > 0) {
    candidates.push({ percent: unit.lastMinuteDiscount, type: "Last Minute" });
  }
  if (daysUntil > 3 && daysUntil <= 14 && unit.earlyBirdDiscount > 0) {
    candidates.push({ percent: unit.earlyBirdDiscount, type: "Early Bird" });
  }
  if (circleRewardPercent > 0) {
    candidates.push({ percent: circleRewardPercent, type: "Hideaway Circle" });
  }
  let discountPercent = 0;
  let discountType = "";
  for (const c of candidates) {
    if (c.percent > discountPercent) {
      discountPercent = c.percent;
      discountType = c.type;
    }
  }
  const discountAmount =
    discountPercent > 0
      ? Math.round(subtotal * (discountPercent / 100) * 100) / 100
      : 0;
  return {
    nights: nights.length,
    subtotal,
    cleaningFee: cleaning,
    discountAmount,
    discountPercent,
    discountType,
    total: Math.max(0, subtotal - discountAmount + cleaning),
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
  const gallery = unit.galleryImageUrls?.length
    ? unit.galleryImageUrls
    : unit.heroImageUrl
      ? [unit.heroImageUrl]
      : [];

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
  const [showCircleCta, setShowCircleCta] = useState(false);
  const [circleRewardPercent, setCircleRewardPercent] = useState(0);
  const [payidInfo, setPayidInfo] = useState<{
    ref: string;
    payidEmail: string;
    total: number;
  } | null>(null);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("booking") === "success") {
      setSuccess(
        `Payment received${params.get("ref") ? ` — ref ${params.get("ref")}` : ""}. We’ll email confirmation shortly.`,
      );
      setShowCircleCta(true);
    }
  }, []);

  useEffect(() => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes("@")) {
      setCircleRewardPercent(0);
      return;
    }
    const handle = window.setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch("/api/public/hideaway-circle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "lookup",
              siteSlug,
              email: trimmed,
            }),
          });
          const json = (await res.json().catch(() => null)) as {
            data?: { member?: boolean; rewardPercent?: number };
          };
          if (json?.data?.member && json.data.rewardPercent) {
            setCircleRewardPercent(json.data.rewardPercent);
          } else {
            setCircleRewardPercent(0);
          }
        } catch {
          setCircleRewardPercent(0);
        }
      })();
    }, 400);
    return () => window.clearTimeout(handle);
  }, [email, siteSlug]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
      if (e.key === "ArrowRight" && gallery.length) {
        setLightboxIndex((i) => (i + 1) % gallery.length);
      }
      if (e.key === "ArrowLeft" && gallery.length) {
        setLightboxIndex((i) => (i - 1 + gallery.length) % gallery.length);
      }
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightboxOpen, gallery.length]);

  const priceLabel =
    money(unit.weekdayRate) != null
      ? `${money(unit.weekdayRate)}/night`
      : "Enquire";

  const summary =
    checkin && checkout
      ? calcTotal(unit, checkin, checkout, today, circleRewardPercent)
      : null;

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

  async function postStay(body: Record<string, unknown>) {
    const res = await fetch(`/api/public/accommodation/stay/${unit.slug}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(json?.error?.message || "Request failed");
    }
    return json?.data;
  }

  async function onEnquire(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setSuccess(null);
    setPayidInfo(null);
    try {
      await postStay({
        siteSlug,
        action: "enquire",
        firstName,
        lastName,
        email,
        phone,
        checkin: checkin || undefined,
        checkout: checkout || undefined,
        guests,
        message,
      });
      setSuccess("Thanks — we’ll reply with availability shortly.");
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function onPay(method: "stripe" | "payid") {
    if (!checkin || !checkout) {
      setError("Select check-in and check-out dates first.");
      return;
    }
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError("Please enter your name and email before paying.");
      return;
    }
    setBusy(true);
    setError(null);
    setSuccess(null);
    setPayidInfo(null);
    try {
      const data = await postStay({
        siteSlug,
        action: "checkout",
        method,
        firstName,
        lastName,
        email,
        phone,
        checkin,
        checkout,
        guests,
        message,
        returnBaseUrl:
          typeof window !== "undefined"
            ? window.location.href.split("?")[0]
            : undefined,
      });
      if (method === "stripe" && data?.checkoutUrl) {
        window.location.href = data.checkoutUrl as string;
        return;
      }
      if (method === "payid") {
        setPayidInfo({
          ref: String(data.ref),
          payidEmail: String(data.payidEmail || unit.payidEmail),
          total: Number(data.total ?? summary?.total ?? 0),
        });
        setSuccess(null);
        setShowCircleCta(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment could not start");
    } finally {
      setBusy(false);
    }
  }

  const lightboxSrc = gallery[lightboxIndex];

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

          {gallery.length > 0 ? (
            <section className="cvh-stay-section">
              <h3>Gallery</h3>
              <div className="cvh-stay-gallery gallery-grid" role="list">
                {gallery.map((src, i) => (
                  <button
                    key={`${src}-${i}`}
                    type="button"
                    className="gallery-item cvh-stay-gallery-item"
                    role="listitem"
                    aria-label={`Photo ${i + 1}`}
                    onClick={() => {
                      setLightboxIndex(i);
                      setLightboxOpen(true);
                    }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={src}
                      alt={`${unit.title} — photo ${i + 1}`}
                      loading={i < 2 ? "eager" : "lazy"}
                    />
                  </button>
                ))}
              </div>
            </section>
          ) : null}

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
              {unit.lastMinuteDiscount > 0 ? (
                <li>
                  <span>⚡ Last minute (0–3 days)</span>
                  <strong>{unit.lastMinuteDiscount}% off</strong>
                </li>
              ) : null}
              {unit.earlyBirdDiscount > 0 ? (
                <li>
                  <span>🐦 Early bird (3–14 days)</span>
                  <strong>{unit.earlyBirdDiscount}% off</strong>
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
                {summary.discountAmount > 0 ? (
                  <li className="cvh-stay-discount">
                    <span>
                      {summary.discountType} (−{summary.discountPercent}%)
                    </span>
                    <strong>−${summary.discountAmount.toFixed(2)}</strong>
                  </li>
                ) : null}
                {summary.cleaningFee > 0 ? (
                  <li>
                    <span>Cleaning</span>
                    <strong>${summary.cleaningFee.toFixed(2)}</strong>
                  </li>
                ) : null}
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
            <h3>Book your stay</h3>
            <form onSubmit={onEnquire} className="cvh-stay-form">
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
              {payidInfo ? (
                <div className="cvh-stay-payid">
                  <p>
                    <strong>Pay with PayID</strong>
                  </p>
                  <p>
                    Send <strong>${payidInfo.total.toFixed(2)}</strong> to{" "}
                    <strong>{payidInfo.payidEmail}</strong>
                  </p>
                  <p>
                    Use reference <strong>{payidInfo.ref}</strong> so we can
                    match your payment.
                  </p>
                </div>
              ) : null}
              {showCircleCta ? (
                <div className="cvh-stay-circle-cta">
                  <p>
                    <strong>Join The Hideaway Circle</strong>
                  </p>
                  <p>
                    Claim 10% off your next direct stay — private offers, first
                    access, and return-stay rewards.
                  </p>
                  <a
                    className="cvh-btn-enquire"
                    href={`${basePath && basePath !== "/" ? basePath.replace(/\/$/, "") : ""}/hideaway-circle?src=post_booking&email=${encodeURIComponent(email)}&firstName=${encodeURIComponent(firstName)}`}
                  >
                    Claim my 10% return-stay reward →
                  </a>
                </div>
              ) : null}
              <div className="cvh-stay-pay-actions">
                <button
                  type="button"
                  className="cvh-btn-payid"
                  disabled={busy || !checkin || !checkout}
                  onClick={() => onPay("payid")}
                >
                  {busy ? "Working…" : "📱 Pay with PayID"}
                </button>
                {unit.stripeEnabled ? (
                  <button
                    type="button"
                    className="cvh-btn-card"
                    disabled={busy || !checkin || !checkout}
                    onClick={() => onPay("stripe")}
                  >
                    {busy ? "Working…" : "💳 Pay with Card"}
                  </button>
                ) : null}
              </div>
              <button type="submit" className="cvh-btn-enquire" disabled={busy}>
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

      {lightboxOpen && lightboxSrc ? (
        <div
          className="wb-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Image gallery"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            type="button"
            className="wb-lightbox-close"
            aria-label="Close"
            onClick={() => setLightboxOpen(false)}
          >
            ×
          </button>
          {gallery.length > 1 ? (
            <>
              <button
                type="button"
                className="wb-lightbox-nav wb-lightbox-prev"
                aria-label="Previous image"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex(
                    (i) => (i - 1 + gallery.length) % gallery.length,
                  );
                }}
              >
                ‹
              </button>
              <button
                type="button"
                className="wb-lightbox-nav wb-lightbox-next"
                aria-label="Next image"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIndex((i) => (i + 1) % gallery.length);
                }}
              >
                ›
              </button>
            </>
          ) : null}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            className="wb-lightbox-image"
            src={lightboxSrc}
            alt={`${unit.title} — photo ${lightboxIndex + 1}`}
            onClick={(e) => e.stopPropagation()}
          />
          <p className="wb-lightbox-meta">
            {lightboxIndex + 1} / {gallery.length}
          </p>
        </div>
      ) : null}
    </div>
  );
}

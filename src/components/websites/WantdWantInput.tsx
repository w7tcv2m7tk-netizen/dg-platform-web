"use client";

import { useEffect, useState } from "react";

import { WANTD_PLACEHOLDERS } from "@dg/platform-core";

export function WantdWantInput({
  actionHref,
  hint = "Property is live. More categories next.",
}: {
  actionHref: string;
  hint?: string;
}) {
  const [value, setValue] = useState("");
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    if (value.trim()) return;
    const id = window.setInterval(() => {
      setPlaceholderIndex((i) => (i + 1) % WANTD_PLACEHOLDERS.length);
    }, 3200);
    return () => window.clearInterval(id);
  }, [value]);

  return (
    <form className="wb-wantd-want" method="get" action={actionHref}>
      <div className="wb-wantd-want-shell">
        <label className="sr-only" htmlFor="wantd-want">
          Tell us what you want
        </label>
        <textarea
          id="wantd-want"
          name="q"
          rows={3}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder={WANTD_PLACEHOLDERS[placeholderIndex]}
          autoComplete="off"
        />
        <div className="wb-wantd-want-actions">
          <span className="wb-wantd-want-hint">{hint}</span>
          <button type="submit">Find it</button>
        </div>
      </div>
    </form>
  );
}

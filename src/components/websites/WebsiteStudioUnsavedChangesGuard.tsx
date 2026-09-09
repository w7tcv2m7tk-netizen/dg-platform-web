"use client";

import { useEffect, useRef, type ReactNode } from "react";

type EditableControl = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

const LEAVE_MESSAGE = "You have unsaved Website Studio changes. Leave without saving them?";
const NETWORK_ERROR_MESSAGE = "Network request failed. Check your connection and try again.";

function isTrackedControl(node: EventTarget | null): node is EditableControl {
  if (node instanceof HTMLTextAreaElement || node instanceof HTMLSelectElement) return true;
  if (!(node instanceof HTMLInputElement)) return false;
  return !["button", "submit", "reset", "checkbox", "radio", "file", "hidden"].includes(node.type);
}

function controlValue(control: EditableControl): string {
  return control.value;
}

function collectRequestValues(value: unknown, output: Set<string>) {
  if (value == null) return;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    output.add(String(value));
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) collectRequestValues(item, output);
    return;
  }
  if (typeof value === "object") {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectRequestValues(nested, output);
    }
  }
}

function requestValues(body: BodyInit | null | undefined): Set<string> {
  const values = new Set<string>();
  if (typeof body !== "string") return values;
  try {
    collectRequestValues(JSON.parse(body) as unknown, values);
  } catch {
    values.add(body);
  }
  return values;
}

function networkFailureResponse(): Response {
  return new Response(JSON.stringify({ error: { message: NETWORK_ERROR_MESSAGE } }), {
    status: 503,
    headers: { "Content-Type": "application/json" },
  });
}

export function WebsiteStudioUnsavedChangesGuard({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    const baselines = new Map<EditableControl, string>();
    let dirty = false;

    const registerControls = () => {
      for (const control of root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select")) {
        if (isTrackedControl(control) && !baselines.has(control)) baselines.set(control, controlValue(control));
      }
    };

    const recomputeDirty = () => {
      registerControls();
      dirty = Array.from(baselines).some(([control, baseline]) => control.isConnected && controlValue(control) !== baseline);
      root.dataset.unsavedChanges = dirty ? "true" : "false";
      return dirty;
    };

    const acceptCurrentValues = () => {
      registerControls();
      for (const control of baselines.keys()) {
        if (control.isConnected) baselines.set(control, controlValue(control));
      }
      recomputeDirty();
    };

    const onInput = (event: Event) => {
      if (!isTrackedControl(event.target) || !root.contains(event.target)) return;
      if (!baselines.has(event.target)) baselines.set(event.target, controlValue(event.target));
      queueMicrotask(recomputeDirty);
    };

    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!recomputeDirty()) return;
      event.preventDefault();
      event.returnValue = "";
    };

    const onClickCapture = (event: MouseEvent) => {
      if (!recomputeDirty()) return;
      const target = event.target instanceof Element ? event.target.closest("a, button") : null;
      if (!target || !root.contains(target)) return;
      if (target instanceof HTMLAnchorElement && target.target === "_blank") return;

      const label = (target.textContent ?? "").trim().toLowerCase();
      const safeWithoutDiscard =
        label.startsWith("save") ||
        label === "use ai" ||
        label === "thinking…" ||
        label === "publish" ||
        label === "unpublish" ||
        label === "show checklist" ||
        label === "hide checklist";
      if (safeWithoutDiscard) return;

      if (!window.confirm(LEAVE_MESSAGE)) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        return;
      }
      acceptCurrentValues();
    };

    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      let response: Response;
      try {
        response = await originalFetch(input, init);
      } catch {
        return networkFailureResponse();
      }
      if (response.ok && init?.method && init.method.toUpperCase() !== "GET") {
        const savedValues = requestValues(init.body);
        if (savedValues.size) {
          registerControls();
          for (const [control, baseline] of baselines) {
            if (!control.isConnected || controlValue(control) === baseline) continue;
            if (savedValues.has(controlValue(control))) baselines.set(control, controlValue(control));
          }
        }
        queueMicrotask(recomputeDirty);
        window.setTimeout(recomputeDirty, 0);
      }
      return response;
    };

    registerControls();
    recomputeDirty();

    const observer = new MutationObserver(() => {
      registerControls();
      recomputeDirty();
    });
    observer.observe(root, { childList: true, subtree: true });

    root.addEventListener("input", onInput, true);
    root.addEventListener("change", onInput, true);
    root.addEventListener("click", onClickCapture, true);
    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      observer.disconnect();
      root.removeEventListener("input", onInput, true);
      root.removeEventListener("change", onInput, true);
      root.removeEventListener("click", onClickCapture, true);
      window.removeEventListener("beforeunload", onBeforeUnload);
      window.fetch = originalFetch;
    };
  }, []);

  return <div ref={rootRef}>{children}</div>;
}

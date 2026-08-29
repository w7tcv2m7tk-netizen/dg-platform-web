/**
 * IndexNow — proactive URL submission for Bing, Yandex and participating engines.
 * @see https://www.indexnow.org/documentation
 */

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

export async function submitIndexNowUrls(
  urls: string[],
  options?: { host?: string; key?: string },
): Promise<{ ok: boolean; status: number; detail: string }> {
  const key = options?.key?.trim() || process.env.INDEXNOW_KEY?.trim();
  if (!key) {
    return { ok: false, status: 0, detail: "INDEXNOW_KEY not configured" };
  }

  const host =
    options?.host?.replace(/^https?:\/\//, "").replace(/\/.*$/, "") ||
    process.env.INDEXNOW_HOST?.trim() ||
    "digitalgate.com.au";

  const unique = [...new Set(urls.map((u) => u.trim()).filter(Boolean))];
  if (!unique.length) {
    return { ok: false, status: 0, detail: "No URLs to submit" };
  }

  const keyLocation = `https://${host}/${key}.txt`;

  const res = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host,
      key,
      keyLocation,
      urlList: unique,
    }),
  });

  const detail = res.status === 202 || res.status === 200
    ? `Submitted ${unique.length} URL(s)`
    : await res.text().catch(() => res.statusText);

  return { ok: res.status === 202 || res.status === 200, status: res.status, detail };
}

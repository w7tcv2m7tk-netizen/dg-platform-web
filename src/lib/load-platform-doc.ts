import { access, readFile } from "node:fs/promises";
import path from "node:path";
import {
  PLATFORM_DOCS_CATALOG,
  getPlatformDocBySlug,
  isAllowlistedPlatformDocPath,
  type PlatformDocEntry,
} from "@dg/platform-core";

export type PlatformDocLoadResult =
  | { ok: true; entry: PlatformDocEntry; content: string; absolutePath: string }
  | {
      ok: false;
      reason: "not_allowlisted" | "missing" | "unreadable";
      entry?: PlatformDocEntry;
      message: string;
    };

function docsRoot(): string {
  return path.resolve(process.cwd(), "docs");
}

/**
 * Resolve an allowlisted relative docs path to an absolute file under `docs/`.
 * Rejects path traversal and anything outside the docs root.
 */
export function resolveAllowlistedDocsPath(relativePath: string): string | null {
  if (!isAllowlistedPlatformDocPath(relativePath)) return null;

  const root = docsRoot();
  const absolute = path.resolve(root, ...relativePath.split("/"));
  const relativeToRoot = path.relative(root, absolute);

  if (
    relativeToRoot.startsWith("..") ||
    path.isAbsolute(relativeToRoot) ||
    relativeToRoot.includes(`..${path.sep}`)
  ) {
    return null;
  }

  if (!absolute.startsWith(root + path.sep) && absolute !== root) {
    return null;
  }

  return absolute;
}

export async function platformDocExists(relativePath: string): Promise<boolean> {
  const absolute = resolveAllowlistedDocsPath(relativePath);
  if (!absolute) return false;
  try {
    await access(absolute);
    return true;
  } catch {
    return false;
  }
}

export async function loadPlatformDocBySlug(slug: string): Promise<PlatformDocLoadResult> {
  const entry = getPlatformDocBySlug(slug);
  if (!entry) {
    return {
      ok: false,
      reason: "not_allowlisted",
      message: "That document is not in the staff docs library.",
    };
  }

  const absolute = resolveAllowlistedDocsPath(entry.relativePath);
  if (!absolute) {
    return {
      ok: false,
      reason: "not_allowlisted",
      entry,
      message: "Document path is not allowlisted.",
    };
  }

  try {
    const content = await readFile(absolute, "utf8");
    return { ok: true, entry, content, absolutePath: absolute };
  } catch (err) {
    const code = err && typeof err === "object" && "code" in err ? String(err.code) : "";
    if (code === "ENOENT") {
      return {
        ok: false,
        reason: "missing",
        entry,
        message: `File not found in the repository: docs/${entry.relativePath}`,
      };
    }
    return {
      ok: false,
      reason: "unreadable",
      entry,
      message: `Could not read docs/${entry.relativePath}.`,
    };
  }
}

export async function listPlatformDocAvailability(): Promise<
  Array<{ entry: PlatformDocEntry; available: boolean }>
> {
  return Promise.all(
    PLATFORM_DOCS_CATALOG.map(async (entry) => ({
      entry,
      available: await platformDocExists(entry.relativePath),
    })),
  );
}

/**
 * Load all allowlisted platform docs that exist on disk (RAG corpus).
 * Skips missing files; never reads outside the catalog allowlist.
 */
export async function loadPlatformDocCorpus(): Promise<
  Array<{
    slug: string;
    title: string;
    relativePath: string;
    content: string;
  }>
> {
  const results = await Promise.all(
    PLATFORM_DOCS_CATALOG.map(async (entry) => {
      const absolute = resolveAllowlistedDocsPath(entry.relativePath);
      if (!absolute) return null;
      try {
        const content = await readFile(absolute, "utf8");
        return {
          slug: entry.slug,
          title: entry.title,
          relativePath: entry.relativePath,
          content,
        };
      } catch {
        return null;
      }
    }),
  );
  return results.filter((r): r is NonNullable<typeof r> => r != null);
}

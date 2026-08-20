function isMissingRelationError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const code = "code" in err ? String((err as { code?: unknown }).code ?? "") : "";
  const message =
    "message" in err ? String((err as { message?: unknown }).message ?? "") : "";
  return (
    code === "P2021" ||
    code === "P2022" ||
    code === "42P01" ||
    /relation ["'].*["'] does not exist/i.test(message) ||
    /does not exist in the current database/i.test(message)
  );
}

export async function emptyIfUnmigrated<T>(run: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await run();
  } catch (err) {
    if (isMissingRelationError(err)) return fallback;
    throw err;
  }
}

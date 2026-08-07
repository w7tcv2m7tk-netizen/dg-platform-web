"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export type TeamMemberCard = {
  id: string;
  displayName: string | null;
  /** Clerk login email cache */
  email: string | null;
  /** Per-org public contact email (optional override) */
  publicEmail?: string | null;
  role: string;
  bio: string | null;
  jobTitle: string | null;
  phone: string | null;
  avatarUrl?: string | null;
  clerkImageUrl?: string | null;
  isMe: boolean;
  wpAgentPermalink?: string;
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ""}${parts[1]![0] ?? ""}`.toUpperCase();
  }
  return (name.charAt(0) || "?").toUpperCase();
}

function splitName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0]!, lastName: "" };
  return { firstName: parts[0]!, lastName: parts.slice(1).join(" ") };
}

/** Custom team photo (Blob) vs Clerk-hosted Account image. */
function isCustomTeamPhoto(url: string | null | undefined) {
  if (!url?.trim()) return false;
  return !/clerk\.com|img\.clerk/i.test(url);
}

export function TeamProfileEditor({
  member,
  canEdit,
}: {
  member: TeamMemberCard;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { user } = useUser();
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState(member.displayName ?? "");
  const [jobTitle, setJobTitle] = useState(member.jobTitle ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [bio, setBio] = useState(member.bio ?? "");
  const [publicEmail, setPublicEmail] = useState(
    member.publicEmail?.trim() || member.email?.trim() || "",
  );
  const [avatarUrl, setAvatarUrl] = useState(
    member.avatarUrl || member.clerkImageUrl || "",
  );
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const preview = avatarUrl || member.clerkImageUrl || null;
  const shownName =
    (editing ? displayName : member.displayName)?.trim() ||
    member.publicEmail?.trim() ||
    member.email ||
    "Team member";
  const shownTitle = editing ? jobTitle : member.jobTitle;
  const shownPhone = editing ? phone : member.phone;
  const shownBio = editing ? bio : member.bio;
  const shownEmail =
    (editing ? publicEmail : member.publicEmail)?.trim() ||
    member.email?.trim() ||
    null;

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/v1/org/brand-asset?maxKb=2048", {
      method: "POST",
      body: form,
    });
    const json = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not upload photo");
      return;
    }
    const url = json.data?.url as string | undefined;
    if (url) setAvatarUrl(url);
  }

  async function syncOwnClerkAccount(name: string, photoUrl: string | null) {
    if (!member.isMe || !user) return { ok: true as const };

    try {
      const { firstName, lastName } = splitName(name);
      await user.update({
        firstName: firstName || "",
        lastName: lastName || "",
      });

      if (photoUrl && isCustomTeamPhoto(photoUrl)) {
        const imageRes = await fetch(photoUrl);
        if (!imageRes.ok) {
          return {
            ok: false as const,
            message: `Could not read photo for Account sync (HTTP ${imageRes.status})`,
          };
        }
        const blob = await imageRes.blob();
        const file = new File([blob], "profile-photo", {
          type: blob.type || "image/png",
        });
        await user.setProfileImage({ file });
      }

      await user.reload();
      return { ok: true as const };
    } catch (err) {
      return {
        ok: false as const,
        message: err instanceof Error ? err.message : "Account sync failed",
      };
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setPending(true);
    setError(null);
    setMessage(null);

    const nextAvatar = avatarUrl.trim() || null;
    const storedAvatar = isCustomTeamPhoto(nextAvatar) ? nextAvatar : null;
    const nextPublicEmail = publicEmail.trim().toLowerCase() || null;
    // Empty / same as login → clear override so card falls back to Clerk email.
    const storedPublicEmail =
      nextPublicEmail && nextPublicEmail !== member.email?.trim().toLowerCase()
        ? nextPublicEmail
        : null;

    const res = await fetch("/api/v1/org/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        membershipId: member.id,
        displayName,
        jobTitle,
        phone,
        bio,
        publicEmail: storedPublicEmail,
        avatarUrl: storedAvatar,
        syncToWebsite: true,
        // Prefer Clerk client API so UserButton updates immediately.
        syncToAccount: false,
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      setPending(false);
      setError(json.error?.message ?? "Could not save profile");
      return;
    }

    const account = await syncOwnClerkAccount(displayName, storedAvatar);
    setPending(false);

    const sync = json.data?.websiteSync;
    if (!account.ok) {
      setMessage(`Profile saved — Account sync failed: ${account.message}`);
    } else if (sync?.ok) {
      setMessage("Saved — Account photo/name + website updated");
    } else if (sync?.reason === "skipped" || sync?.reason === "missing_key") {
      setMessage("Saved — Account updated (website sync skipped)");
    } else if (sync && !sync.ok) {
      setMessage(`Saved to Account — website sync failed: ${sync.message}`);
    } else {
      setMessage("Saved — Account updated");
    }
    setEditing(false);
    router.refresh();
  }

  function cancelEdit() {
    setDisplayName(member.displayName ?? "");
    setJobTitle(member.jobTitle ?? "");
    setPhone(member.phone ?? "");
    setBio(member.bio ?? "");
    setPublicEmail(member.publicEmail?.trim() || member.email?.trim() || "");
    setAvatarUrl(member.avatarUrl || member.clerkImageUrl || "");
    setError(null);
    setEditing(false);
  }

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-900/80 shadow-[0_12px_40px_rgba(0,0,0,0.35)]">
      <div
        className="relative h-28 bg-gradient-to-br from-blue-600/40 via-slate-800 to-slate-950"
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(59,130,246,0.35),transparent_55%)]" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-slate-900/90 to-transparent" />
        <div className="absolute right-3 top-3 flex gap-2">
          {member.isMe ? (
            <span className="rounded-full bg-blue-500/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-300 ring-1 ring-blue-400/30">
              You
            </span>
          ) : null}
          <span className="rounded-full bg-slate-950/50 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-300 ring-1 ring-white/10">
            {member.role}
          </span>
        </div>
      </div>

      <div className="relative px-5 pb-5 pt-0">
        <div className="-mt-12 flex items-end justify-between gap-3">
          <div className="relative">
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview}
                alt=""
                className="h-24 w-24 rounded-2xl object-cover shadow-lg ring-4 ring-slate-900"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 to-slate-800 text-2xl font-semibold text-white shadow-lg ring-4 ring-slate-900">
                {initials(shownName)}
              </div>
            )}
          </div>
          <div className="mb-1 flex flex-wrap justify-end gap-2">
            {member.wpAgentPermalink ? (
              <a
                href={member.wpAgentPermalink}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-300 hover:border-blue-500 hover:text-white"
              >
                Website →
              </a>
            ) : null}
            {canEdit && !editing ? (
              <button
                type="button"
                onClick={() => {
                  setMessage(null);
                  setEditing(true);
                }}
                className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
              >
                Edit profile
              </button>
            ) : null}
          </div>
        </div>

        {!editing ? (
          <div className="mt-4">
            <h3 className="text-xl font-semibold tracking-tight text-white">{shownName}</h3>
            {shownTitle?.trim() ? (
              <p className="mt-1 text-sm font-medium text-blue-300/90">{shownTitle}</p>
            ) : (
              <p className="mt-1 text-sm text-slate-500">No title yet</p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {shownEmail ? (
                <a
                  href={`mailto:${shownEmail}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 hover:border-blue-500 hover:text-white"
                >
                  <span aria-hidden>✉</span>
                  {shownEmail}
                </a>
              ) : null}
              {shownPhone?.trim() ? (
                <a
                  href={`tel:${shownPhone.replace(/\s+/g, "")}`}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-700 bg-slate-950/60 px-3 py-1.5 text-xs text-slate-300 hover:border-blue-500 hover:text-white"
                >
                  <span aria-hidden>☎</span>
                  {shownPhone}
                </a>
              ) : null}
            </div>

            {shownBio?.trim() ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
                {shownBio}
              </p>
            ) : (
              <p className="mt-4 text-sm italic text-slate-500">
                {canEdit
                  ? "Add a short about section so clients know who you are."
                  : "No description yet."}
              </p>
            )}

            {message ? <p className="mt-4 text-sm text-emerald-400">{message}</p> : null}
          </div>
        ) : (
          <form onSubmit={save} className="mt-5 space-y-3">
            <div className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Profile photo
              </p>
              <p className="mt-1 text-[11px] text-slate-500">
                Upload updates your team card and sidebar Account photo together.
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={uploading}
                  onClick={() => fileRef.current?.click()}
                  className="rounded-full bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
                >
                  {uploading ? "Uploading…" : "Upload photo"}
                </button>
                {member.clerkImageUrl ? (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl(member.clerkImageUrl || "")}
                    className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-300"
                  >
                    Use account photo
                  </button>
                ) : null}
                {avatarUrl ? (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400"
                  >
                    Clear
                  </button>
                ) : null}
              </div>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadPhoto(file);
                  e.target.value = "";
                }}
              />
            </div>

            <label className="block text-sm">
              <span className="text-slate-400">Display name</span>
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Public email</span>
              <input
                type="email"
                value={publicEmail}
                onChange={(e) => setPublicEmail(e.target.value)}
                placeholder={member.email || "you@business.com.au"}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
              <span className="mt-1 block text-[11px] text-slate-500">
                Shown on this business card and website agent profile. Leave as your login
                email, or set a different address per organisation. Does not change how you
                sign in.
              </span>
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Job title</span>
              <input
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="e.g. Principal, Sales Consultant"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">Phone</span>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>
            <label className="block text-sm">
              <span className="text-slate-400">About / description</span>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={5}
                placeholder="A short bio for your team page and website agent profile…"
                className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-white"
              />
            </label>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                type="submit"
                disabled={pending}
                className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save profile card"}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="rounded-full border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:border-slate-400"
              >
                Cancel
              </button>
            </div>
            {error ? <p className="text-sm text-amber-400">{error}</p> : null}
          </form>
        )}
      </div>
    </article>
  );
}

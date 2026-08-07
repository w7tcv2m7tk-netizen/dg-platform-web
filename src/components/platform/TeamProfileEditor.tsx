"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";

export type TeamMemberCard = {
  id: string;
  displayName: string | null;
  email: string | null;
  role: string;
  bio: string | null;
  jobTitle: string | null;
  phone: string | null;
  avatarUrl?: string | null;
  clerkImageUrl?: string | null;
  isMe: boolean;
  wpAgentPermalink?: string;
};

export function TeamProfileEditor({
  member,
  canEdit,
}: {
  member: TeamMemberCard;
  canEdit: boolean;
}) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [displayName, setDisplayName] = useState(member.displayName ?? "");
  const [jobTitle, setJobTitle] = useState(member.jobTitle ?? "");
  const [phone, setPhone] = useState(member.phone ?? "");
  const [bio, setBio] = useState(member.bio ?? "");
  const [avatarUrl, setAvatarUrl] = useState(
    member.avatarUrl || member.clerkImageUrl || "",
  );
  const [pending, setPending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadPhoto(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/v1/org/brand-asset", {
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

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!canEdit) return;
    setPending(true);
    setError(null);
    setMessage(null);
    const res = await fetch("/api/v1/org/team", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        membershipId: member.id,
        displayName,
        jobTitle,
        phone,
        bio,
        avatarUrl: avatarUrl.trim() || null,
        syncToWebsite: true,
      }),
    });
    const json = await res.json().catch(() => ({}));
    setPending(false);
    if (!res.ok) {
      setError(json.error?.message ?? "Could not save profile");
      return;
    }

    const sync = json.data?.websiteSync;
    if (sync?.ok) {
      setMessage(
        sync.created
          ? "Saved and published profile to website"
          : "Saved and updated website profile",
      );
    } else if (sync?.reason === "skipped" || sync?.reason === "missing_key") {
      setMessage("Saved locally — website sync skipped (connector not ready or unsupported).");
    } else if (sync && !sync.ok) {
      setMessage(`Saved locally — website sync failed: ${sync.message}`);
    } else {
      setMessage("Profile saved");
    }
    router.refresh();
  }

  const preview = avatarUrl || member.clerkImageUrl || null;

  return (
    <div className="dg-card">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-slate-700"
            />
          ) : (
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-800 text-lg text-slate-400">
              {(member.displayName || member.email || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold text-white">
              {member.displayName || member.email || "Team member"}
              {member.isMe ? (
                <span className="ml-2 text-xs font-normal text-blue-400">You</span>
              ) : null}
            </h3>
            <p className="mt-1 text-xs uppercase tracking-wide text-slate-500">{member.role}</p>
            {member.email ? <p className="mt-1 text-sm text-slate-400">{member.email}</p> : null}
          </div>
        </div>
        {member.wpAgentPermalink ? (
          <a
            href={member.wpAgentPermalink}
            target="_blank"
            rel="noreferrer"
            className="text-sm text-blue-400 hover:underline"
          >
            View on website →
          </a>
        ) : null}
      </div>

      {canEdit ? (
        <form onSubmit={save} className="mt-4 space-y-3">
          <div>
            <p className="text-sm text-slate-400">Profile photo</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={uploading}
                onClick={() => fileRef.current?.click()}
                className="rounded-full border border-slate-600 px-3 py-1.5 text-xs text-slate-200 hover:border-blue-500 disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload photo"}
              </button>
              {member.clerkImageUrl && avatarUrl !== member.clerkImageUrl ? (
                <button
                  type="button"
                  onClick={() => setAvatarUrl(member.clerkImageUrl || "")}
                  className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200"
                >
                  Use account photo
                </button>
              ) : null}
              {avatarUrl ? (
                <button
                  type="button"
                  onClick={() => setAvatarUrl("")}
                  className="rounded-full border border-slate-700 px-3 py-1.5 text-xs text-slate-400 hover:text-amber-300"
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
            <p className="mt-1 text-xs text-slate-500">
              Defaults from your Clerk account photo. Upload to override for this business.
            </p>
          </div>

          <label className="block text-sm">
            <span className="text-slate-400">Display name</span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Job title / role</span>
            <input
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Principal, Sales Consultant"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">Phone</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>
          <label className="block text-sm">
            <span className="text-slate-400">About / description</span>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={5}
              placeholder="A short bio for your team page and website agent profile…"
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-white"
            />
          </label>
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save profile"}
          </button>
          {message ? <p className="text-sm text-emerald-400">{message}</p> : null}
          {error ? <p className="text-sm text-amber-400">{error}</p> : null}
        </form>
      ) : (
        <div className="mt-4 space-y-2 text-sm text-slate-300">
          {member.jobTitle ? <p>{member.jobTitle}</p> : null}
          {member.phone ? <p>{member.phone}</p> : null}
          {member.bio ? (
            <p className="whitespace-pre-wrap text-slate-400">{member.bio}</p>
          ) : (
            <p className="text-slate-500">No bio yet.</p>
          )}
        </div>
      )}
    </div>
  );
}

export type PublishPropertyInput = {
  organisationId: string;
  propertyId: string;
  actorId?: string;
  /** Legacy compatibility only. Gen 2 no longer publishes properties to WordPress. */
  force?: boolean;
};

export type PublishPropertyResult =
  | {
      ok: true;
      created: boolean;
      wpPropertyId: number;
      permalink?: string;
      postStatus?: string;
    }
  | {
      ok: false;
      reason: "missing_key" | "not_found" | "skipped_status" | "upstream_error" | "network_error";
      message: string;
    };

const WORDPRESS_PUBLISH_DISABLED: PublishPropertyResult = {
  ok: false,
  reason: "skipped_status",
  message:
    "WordPress publishing is disabled. Gen 2 / Platform Core is authoritative; WordPress is supported only as an inbound migration source.",
};

/**
 * Legacy compatibility shim.
 *
 * DigitalGate Gen 2 never publishes properties to WordPress. WordPress may be
 * used only as an explicit inbound migration source for onboarding legacy
 * clients. This function intentionally performs no database read, connector
 * resolution, network request, mirrored write, or WordPress mutation.
 */
export async function publishPropertyToWordPress(
  _input: PublishPropertyInput,
): Promise<PublishPropertyResult> {
  return WORDPRESS_PUBLISH_DISABLED;
}

/**
 * Legacy compatibility shim for historical call sites.
 * Automatic Gen 2 -> WordPress publication is permanently disabled.
 */
export async function maybeAutoPublishPropertyToWordPress(_input: {
  organisationId: string;
  propertyId: string;
  status: string;
  actorId?: string;
}): Promise<PublishPropertyResult | null> {
  return null;
}

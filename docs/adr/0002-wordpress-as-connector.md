# ADR 0002 — WordPress as Connector

**Status:** Accepted  
**Date:** August 2026  

## Context

Gen 1 WordPress plugin contains years of domain logic (CRM, RE, SEO, AI Visibility). Replacing it overnight would lose IP and break production sites.

## Decision

WordPress is **not the platform**. It becomes the **WordPress Connector** — syncing forms, leads, SEO data, and site health into Platform Core via API. Same pattern applies to Shopify, Webflow, etc.

## Consequences

**Positive:** Roe/CVH keep running; incremental migration; connector model scales to any CMS.  
**Negative:** Temporary bridge (`GET /portal/me`) until sync is bidirectional.  
**Neutral:** No major new WP modules — connector endpoints and bug fixes only.

# Deploy WordPress plugin (Gen 1)

**Current version:** check `dg-platform/dg-platform.php` (e.g. **10.67.0**)  
**Build zip:** `/Users/aetherra/Documents/dg-platform-build.zip`

## 1. Build the zip (local)

```bash
cd ~/Documents/dg-platform
bash scripts/build-zip.sh
```

Output: `~/Documents/dg-platform-build.zip` with folder `dg-platform/` inside (WordPress expects this structure).

## 2. Deploy to each site

Repeat for **roerealty.com.au**, **digitalgate.com.au**, and **currumbinvalleyhideaway.com.au** (or any client site).

### Option A — WP Admin (simplest)

1. **Plugins → Add New → Upload Plugin**
2. Choose `dg-platform-build.zip`
3. **Replace current** when prompted (or deactivate old, delete, upload new)
4. Activate if needed

### Option B — SFTP / hosting panel

1. Upload zip to server
2. Extract over `wp-content/plugins/dg-platform/` (backup first)
3. Confirm `dg-platform.php` shows new version in WP Admin → Plugins

## 3. Post-deploy checks

| Site | Check |
|------|--------|
| **roerealty.com.au** | Plugins shows v10.47.0 · Vendor Leads works · REST `/wp-json/digitalgate/v1/leads/vendor` returns data |
| **digitalgate.com.au** | Live support routes · Onboarding sync · API Settings shows Dev API key |
| **CVH** | Accommodation REST endpoints if hospitality module active |

### Gen 2 connectivity (app.digitalgate.com.au)

After Roe deploy, verify from Vercel logs or local:

```bash
cd dg-platform-web
dotenv -e .env.local -- node scripts/verify-env.mjs
```

Dashboard **Connected systems → WordPress** should show connected after first vendor lead sync.

### Live support chat (v10.47+)

Requires on **digitalgate.com.au**:

- Plugin v10.47.0+ with `/support/platform/conversation` and `/support/platform/messages`
- Vercel `DG_API_KEY` = Dev API key from digitalgate.com.au → API Settings

## 4. Version bump rule

When changing the plugin:

1. Bump version in `dg-platform.php` and `DG_PLATFORM_VERSION`
2. Run `bash scripts/build-zip.sh`
3. Deploy zip to all production WordPress sites

See `dg-platform/.cursor/rules/release-versioning.mdc`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Gen 2 shows 0 vendor leads | Deploy Roe plugin · set `DG_WP_CONNECTOR_API_KEY` on Vercel |
| Site health 401 | Use Roe Dev API key, not digitalgate.com.au key |
| Support chat "not linked" | Complete onboarding on digitalgate.com.au with same email as Clerk |
| CVH accommodation empty | Set `DG_WP_ACCOMMODATION_SITES` with real CVH REST URL |

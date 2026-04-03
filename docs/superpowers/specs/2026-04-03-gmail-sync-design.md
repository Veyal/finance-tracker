# Gmail Sync — Design Spec

## Goal

Add a "Sync from Gmail" feature to the Settings page. The user picks a start date, clicks Sync, and the app fetches bank notification emails directly from Gmail in the browser, parses them into transactions, auto-fills payment method / category / group using the user's existing data, then drops the results into the existing bulk insert review modal.

## Architecture

All Gmail interaction is client-side only. The browser holds the OAuth tokens in `localStorage`, calls the Gmail REST API directly, and parses emails in JavaScript. Only the final parsed transaction array reaches the backend — through the existing `POST /api/transactions/bulk?dryRun=true` endpoint. No new backend code is needed.

```
Browser
  ├── gmailAuth.js       — PKCE OAuth flow, token storage, token refresh
  ├── gmailParser.js     — HTML email parsing for 5 banks + auto-matching
  ├── gmailSync.js       — orchestrates fetch → parse → match → return array
  └── GmailSyncButton    — UI: connect / date picker / sync / disconnect

          ↓ parsed transactions array
  Existing bulk insert review modal (SettingsPage)
          ↓ user reviews / edits
  POST /api/transactions/bulk  (unchanged)
```

## One-Time Manual Setup

Before deploying, the user must:
1. Go to Google Cloud Console → APIs & Services → Credentials
2. Create a new **Web application** OAuth 2.0 Client ID
3. Add Authorized JavaScript origin: `https://tracker.veyal.org`
4. Add Authorized redirect URI: `https://tracker.veyal.org/settings`
5. Copy the **Client ID** (no client secret needed — public PKCE client)
6. Store it in `client/.env` as `VITE_GMAIL_CLIENT_ID=<id>` (also add to `.env.example`)

The existing `credentials.json` (installed/desktop type) is not used for this feature.

## Files

| Action | Path |
|--------|------|
| Create | `client/src/services/gmailAuth.js` |
| Create | `client/src/services/gmailParser.js` |
| Create | `client/src/services/gmailSync.js` |
| Create | `client/src/components/GmailSyncButton.jsx` |
| Create | `client/src/components/GmailSyncButton.css` |
| Modify | `client/src/pages/SettingsPage.jsx` — add GmailSyncButton in data section |
| Modify | `client/.env.example` — add VITE_GMAIL_CLIENT_ID |

## Service: gmailAuth.js

Handles the full PKCE OAuth lifecycle.

### Storage keys (localStorage)
```
gmail_access_token
gmail_refresh_token
gmail_token_expiry   (unix ms timestamp)
gmail_pkce_verifier  (temporary, cleared after exchange)
```

### Functions

**`isConnected()`** → `boolean`
Returns true if a refresh_token exists in localStorage.

**`getValidToken()`** → `Promise<string>`
Returns a valid access_token. If the stored one is expired (compare `gmail_token_expiry` to `Date.now()`), calls `refreshAccessToken()` first. Throws if not connected.

**`startOAuthFlow()`** → `void`
1. Generate 43-byte random `code_verifier`, store in `localStorage.gmail_pkce_verifier`
2. SHA-256 hash it → base64url encode → `code_challenge`
3. Build Google OAuth URL:
   ```
   https://accounts.google.com/o/oauth2/v2/auth
     ?client_id=VITE_GMAIL_CLIENT_ID
     &redirect_uri=https://tracker.veyal.org/settings
     &response_type=code
     &scope=https://www.googleapis.com/auth/gmail.readonly
     &code_challenge=<challenge>
     &code_challenge_method=S256
     &access_type=offline
     &prompt=consent
   ```
4. `window.location.href = url`

**`handleOAuthCallback(code: string)`** → `Promise<void>`
Called when Settings page detects `?code=` in the URL.
1. Retrieve `code_verifier` from localStorage
2. POST to `https://oauth2.googleapis.com/token`:
   ```json
   { "code": "...", "client_id": "...", "code_verifier": "...",
     "redirect_uri": "https://tracker.veyal.org/settings",
     "grant_type": "authorization_code" }
   ```
3. Store `access_token`, `refresh_token`, `expires_in → expiry timestamp`
4. Clear `gmail_pkce_verifier`
5. Remove `?code=` from URL (`history.replaceState`)

**`refreshAccessToken()`** → `Promise<void>`
POST to `https://oauth2.googleapis.com/token`:
```json
{ "refresh_token": "...", "client_id": "...", "grant_type": "refresh_token" }
```
Updates `gmail_access_token` and `gmail_token_expiry`.

**`disconnect()`** → `void`
Removes all four localStorage keys.

## Service: gmailParser.js

Parses raw Gmail message payloads into the app's transaction format.

### `parseMessage(message, userOptions)`

`userOptions`: `{ categories, groups, paymentMethods }` — arrays from the app's API.

Returns:
```js
{
  type: 'expense' | 'income',
  amount: number,
  date: 'YYYY-MM-DDTHH:MM:SSZ',
  merchant: string,
  note: string,                 // e.g. "Imported from MAYBANK email"
  category_id: string | null,   // auto-matched
  group_id: string | null,       // auto-matched
  payment_method_id: string | null, // auto-matched
}
```

### Email body extraction

Recursively walk `message.payload.parts` to find `text/html` or `text/plain` part. Base64url-decode the `body.data`. Parse HTML using browser's `DOMParser` → extract text with newline separators (equivalent to BeautifulSoup's `get_text(separator='|')`).

### Bank detection

Detect bank from the `From` header:
- `maybank.co.id` → `parseMaybank(text)`
- `cimbniaga.co.id` → `parseCimb(text)`
- `bankmega.com` → `parseMega(text)`
- `bca.co.id` → `parseBca(text)`
- `seabank.co.id` → `parseSeabank(text)`

Each parser returns `{ bank, card, merchant, time, currency, amount, type }` — direct port of the Python extractors using the same `|`-split logic.

### Helper: `cleanAmount(str)` → `number`
Direct port of Python `clean_amount`. Handles dot/comma ambiguity for Indonesian number formats.

### Helper: `normalizeDate(str, bank)` → `string`
Direct port of Python `normalize_date`. Returns ISO 8601 string.

### Helper: `applyMerchantRenames(merchant)` → `string`
Port of the manual rename block from the Python script:
```js
const renames = {
  'PAPER.ID': 'member hotel tentrem',
  '9441 ESB Restaurant OM On Us QRD 081666': 'tai ho jiak',
  '9441 VENUE STADION  OM On Us QRS 969715': 'tiket kolam',
  '9441 A Chai - Kweti OM On Us QRS 655203': 'kwetiau achai',
};
```

### Auto-matching

**Category:** Compare lowercased merchant against lowercased category names. If any category name appears as a substring of the merchant (or vice versa), use that category_id. Fall back to a keyword map ported from Python's `get_category()` matched against the user's actual category names (case-insensitive).

**Payment method:** For each payment method in the user's list, check if the bank name appears in the payment method name AND the card's last 4 digits appear in the payment method name. Use the first match.

**Group:** Same substring matching against group names.

All three default to `null` if no match found — user fills them in the review modal.

## Service: gmailSync.js

Orchestrates the full sync.

### `syncFromGmail({ since, categories, groups, paymentMethods })`

`since`: `Date` object — fetch emails on or after this date.

1. Call `getValidToken()` from gmailAuth
2. Build Gmail search query:
   ```
   (from:Maybank_Notification_Trx@maybank.co.id OR
    from:CREDITCARD.NOTIFICATION@cimbniaga.co.id OR
    from:notifikasi.kartukredit@bankmega.com OR
    from:bca@bca.co.id OR
    from:alerts@seabank.co.id)
   after:YYYY/MM/DD
   ```
3. `GET https://gmail.googleapis.com/gmail/v1/users/me/messages?q=<query>`
4. For each message id: `GET https://gmail.googleapis.com/gmail/v1/users/me/messages/{id}?format=full`
5. Pass each message to `parseMessage(message, userOptions)`
6. Filter out null results (unrecognised sender or parse failure)
7. Return array sorted by date descending

### Error handling
- 401 → attempt token refresh once, retry; if still 401 → throw `GmailAuthError`
- Network failure → throw with message shown in UI
- Individual message parse failure → skip silently, count in `parseErrors`

Returns: `{ transactions: [], parseErrors: number }`

## Component: GmailSyncButton

Self-contained component dropped into SettingsPage's data management section.

### Props
None — reads auth state from localStorage directly, calls the app's existing API for categories/groups/paymentMethods.

### States

**Not connected:**
```
[Gmail icon]  Gmail Sync
              Connect your Gmail to sync bank transactions
              [Connect Gmail →]
```

**Connected, idle:**
```
[Gmail icon]  Gmail Sync  ● Connected
              Sync since: [date input — default: 30 days ago]
              [Sync from Gmail]  [Disconnect]
```

**Syncing:**
- Sync button shows spinner + "Fetching emails…"

**Done / error:**
- On success: calls parent's `setBulkResults()` → review modal opens
- On error: inline error message with retry button

### Parent integration

`GmailSyncButton` receives `onSyncComplete(bulkDryRunResult)` prop from SettingsPage. When sync finishes:
1. Calls `POST /api/transactions/bulk?dryRun=true` with the parsed array
2. Passes the response to `onSyncComplete`
3. SettingsPage sets `setBulkResults(result)` → existing review modal opens

## SettingsPage changes

1. Import `GmailSyncButton`
2. On mount (and after OAuth callback): check `?code=` in URL → call `handleOAuthCallback(code)`
3. Add Gmail Sync item in the data management section, between Bulk Insert and Restore Data:
```jsx
<GmailSyncButton onSyncComplete={(result) => {
    setBulkResults(result);
    setPendingBulkData(null);
}} />
```

## Error States

| Situation | UI |
|-----------|-----|
| Not connected | "Connect Gmail" button |
| Token expired, refresh fails | "Session expired — reconnect Gmail" with Connect button |
| Gmail API error (not auth) | Inline error + Retry button |
| Zero emails found | "No new bank emails found since {date}" |
| Some messages failed to parse | "Synced X transactions (Y emails skipped)" |

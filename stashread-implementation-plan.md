# StashRead - Implementation Plan

## Project Overview

**StashRead** is a Firefox browser extension for saving web articles to read later, with the ability to generate EPUB "reading packs" for Kindle consumption.

**Repository:** `github.com/[owner]/stashread` (public, MIT license)

**Core principles:**
- Local-only storage (browser.storage.local) - zero backend, zero infrastructure cost
- Minimal, focused feature set - save, manage, export, generate EPUB
- Firefox-first (WebExtension API, Manifest V3)
- Open source from day one

---

## Architecture

### Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Framework | WXT (wxt.dev) | Vite-powered, TypeScript, HMR, builds MV2+MV3 from single codebase |
| Language | TypeScript | Type safety, better DX, WXT default |
| UI framework | Svelte | Lightweight (~3KB runtime), reactive, perfect for extension UIs |
| Storage | browser.storage.local | Simple KV store, works across Firefox privacy modes, unlimited with permission |
| Article extraction | @mozilla/readability | Same engine as Firefox Reader View, battle-tested, MIT license |
| EPUB generation | epub-gen-memory (or jszip + manual EPUB assembly) | Client-side EPUB creation, no server needed |
| Styling | Tailwind CSS (via WXT/Vite plugin) | Utility-first, scoped, dark mode built-in |
| Testing | Vitest | Vite-native, fast, TypeScript-first |

### Extension Components

```
stashread/
├── src/
│   ├── entrypoints/
│   │   ├── background.ts          # Service worker / event page
│   │   ├── popup/                  # Toolbar popup (quick save + recent items)
│   │   │   ├── App.svelte
│   │   │   ├── main.ts
│   │   │   └── index.html
│   │   ├── sidebar/                # Sidebar (full reading list + management)
│   │   │   ├── App.svelte
│   │   │   ├── main.ts
│   │   │   └── index.html
│   │   └── content.ts              # Content script (metadata + article extraction)
│   ├── lib/
│   │   ├── storage.ts              # CRUD operations, search, filtering
│   │   ├── models.ts               # TypeScript interfaces / types
│   │   ├── epub.ts                 # EPUB generation logic
│   │   ├── readability.ts          # Article content extraction wrapper
│   │   ├── import-export.ts        # JSON/CSV/Pocket HTML import/export
│   │   └── utils.ts                # Shared helpers
│   ├── components/                 # Shared Svelte components
│   │   ├── ArticleCard.svelte
│   │   ├── FilterBar.svelte
│   │   ├── SearchBar.svelte
│   │   ├── SelectionToolbar.svelte # Multi-select actions (delete, EPUB, etc.)
│   │   ├── EpubDialog.svelte       # EPUB generation options
│   │   └── SettingsView.svelte
│   └── assets/
│       ├── icons/                  # Extension icons (16, 32, 48, 96, 128px)
│       └── styles/
├── public/
│   └── icons/
├── wxt.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── CLAUDE.md                       # Instructions for Claude Code sessions
├── LICENSE                         # MIT
└── README.md
```

### Data Model

```typescript
interface Article {
  id: string;              // UUID v4, generated at save time
  url: string;             // Original page URL
  title: string;           // Page title (auto-captured, user-editable)
  domain: string;          // Extracted from URL for display/grouping
  favicon: string;         // Favicon URL or data URI
  savedAt: number;         // Unix timestamp (ms)
  isRead: boolean;         // Default: false
  isFavorite: boolean;     // Default: false
  tags: string[];          // User-assigned tags (Phase 1)
  excerpt: string;         // First ~200 chars of article text (auto-extracted)
  // Content extraction (populated on-demand for EPUB, not at save time)
  content?: string;        // Cleaned HTML from Readability.js
  textContent?: string;    // Plain text from Readability.js
  byline?: string;         // Author if detected
  siteName?: string;       // Site name if detected
  estimatedReadTime?: number; // Minutes, calculated from word count
}

interface StashReadSettings {
  kindleEmail: string;              // user's @kindle.com address
  defaultView: 'all' | 'unread' | 'favorites';
  sortOrder: 'newest' | 'oldest' | 'title' | 'domain';
  theme: 'system' | 'light' | 'dark';
  badgeCount: 'unread' | 'total' | 'off';
  keyboardShortcut: string;         // default: Alt+S
}
```

**Storage keys:**
- `articles` - Array of Article objects (main data store)
- `settings` - StashReadSettings object
- `lastBackup` - Timestamp of last export (for reminder nudges)

**Storage estimation:** ~500 bytes per article without content, ~5-50 KB with extracted content. At 10,000 articles with content: ~100-500 MB. Well within browser.storage.local limits with `unlimitedStorage` permission.

---

## Feature Specification

### Module 1: Core Save & Manage (MVP)

#### 1.1 Save Article

**Trigger methods:**
- Click toolbar icon (browserAction) - saves current tab
- Right-click any link → context menu "Save to StashRead"
- Keyboard shortcut (configurable, default Alt+S)

**Save flow:**
1. User triggers save
2. Background script captures: URL, title, favicon from `browser.tabs` API
3. Content script extracts excerpt (first ~200 chars of visible text) via `document.body.innerText`
4. Article object created with `isRead: false`, `isFavorite: false`, timestamp
5. Duplicate check: if URL already saved, show notification "Already saved" instead of adding duplicate
6. Article stored via `browser.storage.local`
7. Badge count updated
8. Brief confirmation notification (browser notification or toolbar icon flash)

**Content extraction (Readability.js) is NOT run at save time.** It's expensive and not always needed. It runs on-demand when:
- User clicks "Extract content" on an article
- User includes an article in an EPUB reading pack
- This avoids performance issues and storage bloat for casual saves

#### 1.2 Popup UI

The popup opens when clicking the toolbar icon. It serves two purposes: quick-save confirmation and recent items access.

**Layout:**
- Top: "Save this page" button (primary action, full width)
  - If current page already saved: button changes to "Already saved ✓" (muted)
- Below: list of 5-10 most recently saved articles
  - Each shows: favicon, title (truncated), domain, time ago
  - Click opens article in new tab
  - Small icons for mark read/favorite inline
- Bottom: "Open full list" link → opens sidebar or full-tab view

**Dimensions:** ~350px wide, ~450px tall (standard popup size).

#### 1.3 Sidebar UI

The sidebar is the primary management interface. It persists while browsing (unlike the popup which closes on blur).

**Header section:**
- Search bar (searches title, URL, domain, tags)
- Filter row: All | Unread | Favorites | (tag filter dropdown in Phase 1)
- Sort dropdown: Newest first | Oldest first | By title | By domain
- Multi-select toggle: enters selection mode for batch actions

**Article list:**
- Each article card shows:
  - Favicon + domain label
  - Title (full, wrapping)
  - Excerpt (2 lines, truncated)
  - "Saved 3 days ago" relative timestamp
  - Read/unread indicator (subtle dot or opacity change)
  - Favorite star icon
  - "..." overflow menu: Mark read/unread, Toggle favorite, Copy URL, Extract content, Delete
- Infinite scroll or pagination (50 items per page)
- Empty states: "No saved articles yet" / "No matches found"

**Selection mode:**
- Checkboxes appear on each article card
- Quick-select buttons at top: "Select all visible", "Select unread", "Select this week", "Select favorites"
- Selection toolbar appears at bottom: "[N] selected" + actions: Mark read, Delete, Generate EPUB
- This is the entry point for EPUB generation (Module 3)

**Footer:**
- Total count: "47 articles (12 unread)"
- Settings gear icon → opens settings view
- Import/Export button → opens import/export view

#### 1.4 Badge Count

- Toolbar icon shows unread count by default
- Configurable: unread count, total count, or off
- Updates on every save, read/unread toggle, and delete
- Badge color: default Firefox blue

#### 1.5 Dark Mode

- Follow Firefox/system theme by default (`prefers-color-scheme`)
- Manual override in settings: System | Light | Dark
- All UI surfaces (popup, sidebar) respect the theme

#### 1.6 Keyboard Shortcut

- Default: `Alt+S` to save current page
- Configurable via Firefox's built-in extension shortcut management (`browser.commands` API)
- Shortcut works from any tab without opening the popup

---

### Module 2: Import / Export / Backup

#### 2.1 Export

**JSON export (full backup):**
- Exports all articles + settings as a single JSON file
- Filename: `stashread-backup-YYYY-MM-DD.json`
- Format: `{ version: 1, exportedAt: timestamp, articles: [...], settings: {...} }`
- Includes extracted content if available
- Triggered via sidebar Settings → Export → JSON

**CSV export (human-readable):**
- Exports article metadata only (no content) as CSV
- Columns: title, url, domain, savedAt, isRead, isFavorite, tags, excerpt
- Filename: `stashread-export-YYYY-MM-DD.csv`
- UTF-8 with BOM for Excel compatibility

#### 2.2 Import

**JSON import (restore backup):**
- Accepts StashRead JSON backup files
- Merge strategy: skip duplicates (by URL), add new articles
- Option: "Replace all" (destructive) vs "Merge" (additive)
- Shows preview: "Found 142 articles. 38 new, 104 already saved."

**Pocket HTML import:**
- Pocket's export format was an HTML file with `<ul><li><a>` structure
- Mozilla provided export before shutdown; many users have these files
- Parser extracts: URL, title, timestamp, tags, read/unread status
- Maps to StashRead Article objects

**Browser bookmarks import:**
- Let user select a Firefox bookmark folder
- Import all bookmarks from that folder as articles
- Uses `browser.bookmarks` API

#### 2.3 Backup Reminders

- Track `lastBackup` timestamp in settings
- If > 30 days since last export and user has > 20 articles, show a subtle reminder in sidebar footer: "It's been a while since your last backup"
- Non-intrusive, dismissible

---

### Module 3: EPUB Reading Pack (Send to Kindle)

This is the differentiating feature. The workflow: select articles → generate single EPUB → send to Kindle.

#### 3.1 Article Selection for EPUB

Entry point: sidebar selection mode (described in 1.3).

**Selection flow:**
1. User enters selection mode (toggle button or long-press)
2. Manually check individual articles, OR use quick filters:
   - "Select all unread"
   - "Select this week's saves"
   - "Select all favorites"
   - "Select all visible" (respects current search/filter)
3. Click "Generate EPUB" in selection toolbar
4. EPUB dialog opens (see 3.2)

#### 3.2 EPUB Generation Dialog

**Options shown:**
- Title: auto-generated as "StashRead - [date]" (editable)
- Article count: "8 articles selected"
- Estimated reading time: sum of all selected articles' `estimatedReadTime`
- Warning if any articles don't have extracted content yet: "3 articles need content extraction. Extract now?" with a button to trigger Readability.js on those articles
- "Generate" button

**Generation flow:**
1. For each selected article without `content`, run Readability.js extraction:
   - Open article URL in background tab (not visible to user)
   - Run content script with Readability.js
   - Capture cleaned HTML + metadata
   - Close background tab
   - Store extracted content on the Article object for future use
2. If extraction fails for any article (paywall, SPA, dead link):
   - Include it in EPUB as a "stub" chapter: title + URL + note "Full content could not be extracted. Visit the original article."
   - Don't block the entire EPUB on one failure
3. Assemble EPUB:
   - Cover page: "StashRead - Weekend Reads" + date + article count
   - Table of contents (auto-generated, NCX + HTML TOC)
   - One chapter per article: title, byline, source domain, original URL, cleaned article HTML
   - Basic CSS for readable typography on Kindle (serif font, comfortable margins, proper heading hierarchy)
4. Download EPUB file to user's computer
5. Post-download prompt:
   - "Send to Kindle?" → opens mailto: to the user's @kindle.com address (from settings) with subject line matching the EPUB title
   - Note: "Attach the downloaded EPUB file to this email before sending"
   - Alternative: "Or use Amazon's Send to Kindle app"
6. Optionally mark all included articles as read

#### 3.3 Content Extraction via Readability.js

**Implementation approach:**
- `@mozilla/readability` runs in a content script context (needs DOM access)
- When extraction is requested (either manually or for EPUB), the background script:
  1. Creates a hidden/background tab with the article URL
  2. Injects content script that runs Readability
  3. Content script sends extracted data back via `browser.runtime.sendMessage`
  4. Background script stores the content on the Article object
  5. Closes the background tab
- Timeout: 15 seconds per article. If no response, mark as extraction failed.
- Rate limiting: extract max 3 articles in parallel to avoid resource overload.

**Fallback for extraction failure:**
- Store `extractionStatus: 'failed' | 'success' | 'pending' | null` on Article
- Failed articles can be retried manually
- In EPUB, failed articles appear as stubs (title + link only)

#### 3.4 EPUB Structure

```
book.epub (ZIP)
├── mimetype
├── META-INF/
│   └── container.xml
├── OEBPS/
│   ├── content.opf        # Package document (metadata, manifest, spine)
│   ├── toc.ncx             # NCX table of contents (for older readers)
│   ├── toc.xhtml           # HTML table of contents
│   ├── styles.css           # Reading-optimized stylesheet
│   ├── cover.xhtml          # Cover page
│   ├── chapter-001.xhtml    # Article 1
│   ├── chapter-002.xhtml    # Article 2
│   └── ...
```

**Kindle-optimized CSS:**
```css
body { font-family: serif; line-height: 1.6; margin: 1em; }
h1 { font-size: 1.4em; margin-bottom: 0.3em; }
.article-meta { font-size: 0.85em; color: #666; margin-bottom: 1.5em; }
.article-meta a { color: #666; }
img { max-width: 100%; height: auto; }
blockquote { margin-left: 1em; padding-left: 0.5em; border-left: 2px solid #ccc; }
```

#### 3.5 Send to Kindle Settings

In extension settings:
- "Kindle email" field: user enters their @kindle.com address
- Help text: "Find this in your Amazon account under Manage Your Content and Devices → Preferences → Personal Document Settings"
- This address is used for the post-download mailto: link

---

## Implementation Phases

### Phase 0: Project Setup

**Prerequisites the developer must complete manually:**
1. Create GitHub repo `stashread` (public, MIT license)
2. Clone locally

**Then Claude Code builds:**
1. Scaffold WXT project: `npx wxt@latest init stashread --template svelte`
2. Configure `wxt.config.ts` for Firefox target
3. Set up Tailwind CSS
4. Create `manifest.json` permissions:
   ```json
   {
     "permissions": [
       "storage",
       "unlimitedStorage",
       "activeTab",
       "tabs",
       "contextMenus",
       "notifications",
       "bookmarks"
     ],
     "sidebar_action": {
       "default_title": "StashRead",
       "default_panel": "sidebar/index.html",
       "default_icon": "icons/icon-48.png"
     },
     "browser_action": {
       "default_title": "Save to StashRead",
       "default_popup": "popup/index.html",
       "default_icon": "icons/icon-48.png"
     },
     "commands": {
       "save-current-page": {
         "suggested_key": { "default": "Alt+S" },
         "description": "Save current page to StashRead"
       }
     }
   }
   ```
5. Create placeholder icons (simple bookmark/book icon)
6. Create CLAUDE.md with project conventions
7. Create README.md with project description, feature list, development setup
8. Verify: `npm run dev` launches Firefox with extension loaded

**Deliverable:** Empty but functional extension shell that loads in Firefox.

### Phase 1: Core Save & Manage (MVP)

**Step 1: Data layer**
- Implement `src/lib/models.ts` - TypeScript interfaces
- Implement `src/lib/storage.ts`:
  - `saveArticle(article: Partial<Article>): Promise<Article>`
  - `getArticles(filter?: FilterOptions): Promise<Article[]>`
  - `getArticle(id: string): Promise<Article | null>`
  - `updateArticle(id: string, updates: Partial<Article>): Promise<Article>`
  - `deleteArticle(id: string): Promise<void>`
  - `deleteArticles(ids: string[]): Promise<void>`
  - `searchArticles(query: string): Promise<Article[]>`
  - `getSettings(): Promise<StashReadSettings>`
  - `updateSettings(updates: Partial<StashReadSettings>): Promise<void>`
  - `getStats(): Promise<{ total: number; unread: number; favorites: number }>`
- Write unit tests for all storage operations

**Step 2: Background script**
- Implement `src/entrypoints/background.ts`:
  - Context menu registration: "Save link to StashRead" on all links
  - Context menu handler: extract URL + title from click target, save article
  - Keyboard shortcut handler: save current tab
  - Message listener for popup/sidebar communication
  - Badge count updater (listens to storage changes)
  - Duplicate detection logic

**Step 3: Popup UI**
- Implement `src/entrypoints/popup/`:
  - "Save this page" button with current-page detection
  - Already-saved state detection and UI
  - Recent 5 articles list
  - Click-to-open in new tab
  - Inline read/favorite toggles
  - "Open sidebar" link
  - Dark mode support

**Step 4: Sidebar UI**
- Implement `src/entrypoints/sidebar/`:
  - Search bar with debounced search
  - Filter tabs: All | Unread | Favorites
  - Sort dropdown
  - Article card component with all interactions
  - Overflow menu per article
  - Selection mode with checkboxes
  - Quick-select buttons
  - Selection toolbar with batch actions
  - Article count footer
  - Settings view (accessible from gear icon)
  - Empty states
  - Dark mode support
  - Responsive to sidebar width

**Step 5: Content script**
- Implement `src/entrypoints/content.ts`:
  - On message from background: extract page excerpt
  - `document.body.innerText.substring(0, 200)` for excerpt
  - Meta tag extraction for better titles/descriptions when available

**Step 6: Polish**
- Notification on save (brief, non-intrusive)
- Error handling for all storage operations
- Loading states in UI
- Favicon handling (use Google's favicon service as fallback: `https://www.google.com/s2/favicons?domain=example.com`)

**Deliverable:** Fully functional save-and-manage extension. Can save articles, browse them in sidebar, search, filter, mark read/favorite, delete.

### Phase 2: Import / Export / Backup

**Step 1: Export**
- Implement `src/lib/import-export.ts`:
  - `exportJSON(): Promise<Blob>` - full backup
  - `exportCSV(): Promise<Blob>` - metadata only
  - Trigger browser download dialog

**Step 2: Import**
- `importJSON(file: File): Promise<ImportResult>` - parse, validate, merge/replace
- `importPocketHTML(file: File): Promise<ImportResult>` - parse Pocket export format
- `importBookmarks(folderId: string): Promise<ImportResult>` - read Firefox bookmarks
- Import preview dialog showing counts before committing
- Error handling for malformed files

**Step 3: Backup reminders**
- Track lastBackup timestamp
- Show subtle reminder in sidebar if overdue

**Step 4: Settings UI additions**
- Import/Export section in settings view
- File picker for imports
- Bookmark folder selector for bookmark import

**Deliverable:** Complete data portability. Users can back up, restore, and migrate from Pocket.

### Phase 3: EPUB Reading Pack

**Step 1: Readability integration**
- Implement `src/lib/readability.ts`:
  - `extractContent(tabId: number): Promise<ExtractedContent>`
  - Background tab management (create, inject script, capture result, close)
  - Timeout handling (15s per article)
  - Parallel extraction with concurrency limit (3)
  - Error handling and fallback stubs
- Content script addition for Readability.js execution
- Store extracted content on Article objects
- Reading time estimation (words / 200 wpm)

**Step 2: EPUB generation**
- Implement `src/lib/epub.ts`:
  - `generateEPUB(articles: Article[], options: EPUBOptions): Promise<Blob>`
  - Cover page generation (XHTML)
  - Table of contents (NCX + HTML)
  - Chapter assembly from extracted content
  - CSS for Kindle readability
  - Image handling: inline images from articles converted to data URIs or stripped
  - EPUB validation (basic structural checks)
- Use JSZip for EPUB assembly (EPUB is a ZIP file with specific structure)

**Step 3: EPUB UI**
- EPUB generation dialog (Svelte component):
  - Title field (auto-generated, editable)
  - Selected article count + estimated reading time
  - Content extraction progress indicator
  - Warnings for failed extractions
  - "Generate" button
  - Download trigger
- Post-download prompt:
  - mailto: link to @kindle.com address
  - Instructions text

**Step 4: Settings additions**
- Kindle email field in settings
- Help text for finding @kindle.com address

**Step 5: Selection mode enhancements**
- "Generate EPUB" button in selection toolbar
- Quick filters specifically useful for EPUB: "This week's unread", "All favorites"

**Deliverable:** End-to-end Kindle workflow. Select articles, generate EPUB, download, send to Kindle.

---

## Manifest V3 Configuration

```json
{
  "manifest_version": 3,
  "name": "StashRead",
  "version": "0.1.0",
  "description": "Save articles to read later. Generate EPUB reading packs for Kindle.",
  "permissions": [
    "storage",
    "unlimitedStorage",
    "activeTab",
    "tabs",
    "contextMenus",
    "notifications",
    "bookmarks"
  ],
  "background": {
    "scripts": ["background.js"],
    "type": "module"
  },
  "action": {
    "default_title": "Save to StashRead",
    "default_popup": "popup/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "96": "icons/icon-96.png"
    }
  },
  "sidebar_action": {
    "default_title": "StashRead",
    "default_panel": "sidebar/index.html",
    "default_icon": {
      "16": "icons/icon-16.png",
      "32": "icons/icon-32.png",
      "48": "icons/icon-48.png",
      "96": "icons/icon-96.png"
    }
  },
  "commands": {
    "save-current-page": {
      "suggested_key": { "default": "Alt+S" },
      "description": "Save current page to StashRead"
    }
  },
  "icons": {
    "48": "icons/icon-48.png",
    "96": "icons/icon-96.png",
    "128": "icons/icon-128.png"
  },
  "browser_specific_settings": {
    "gecko": {
      "id": "stashread@stashread.dev",
      "strict_min_version": "109.0"
    }
  }
}
```

---

## Development Workflow

### Local development
```bash
git clone git@github.com:[owner]/stashread.git
cd stashread
npm install
npm run dev          # Launches Firefox with extension loaded + HMR
```

### Build & package
```bash
npm run build        # Production build
npm run zip          # Creates .zip for AMO submission
```

### Testing
```bash
npm run test         # Vitest unit tests
npm run test:watch   # Watch mode
npm run lint         # ESLint + Prettier
```

### Loading in Firefox (manual testing)
1. Open `about:debugging#/runtime/this-firefox`
2. Click "Load Temporary Add-on"
3. Select any file in `dist/` directory

---

## CLAUDE.md Template

This file goes in the repo root to guide Claude Code sessions:

```markdown
# StashRead - Claude Code Instructions

## Project
StashRead is a Firefox extension for saving articles to read later with EPUB generation for Kindle.

## Tech Stack
- WXT framework (wxt.dev) with Svelte
- TypeScript strict mode
- Tailwind CSS for styling
- browser.storage.local for all data persistence
- @mozilla/readability for article extraction
- JSZip for EPUB generation

## Key Conventions
- All storage operations go through src/lib/storage.ts (never call browser.storage directly from components)
- All types defined in src/lib/models.ts
- Components are Svelte files in src/components/ (shared) or within entrypoint directories (specific)
- Use `browser.*` API (not `chrome.*`) - WXT handles polyfilling
- Error handling: every async operation must have try/catch with user-visible error feedback
- No external network calls. Everything runs locally. The only network activity is loading article URLs for content extraction.

## File Organization
- src/entrypoints/ - Extension entry points (background, popup, sidebar, content scripts)
- src/lib/ - Business logic (storage, models, epub, readability, import-export)
- src/components/ - Shared Svelte components
- src/assets/ - Icons, static assets

## Testing
- Unit tests for all src/lib/ modules
- Test files co-located: storage.test.ts next to storage.ts
- Run: npm run test

## Commands
- npm run dev - Development with HMR (opens Firefox)
- npm run build - Production build
- npm run zip - Package for AMO
- npm run test - Run tests
- npm run lint - Lint and format check
```

---

## AMO (addons.mozilla.org) Submission Checklist

When ready for public release:

1. Extension ID set in manifest: `stashread@stashread.dev`
2. All permissions justified (AMO reviewers check this)
3. Privacy policy: "StashRead stores all data locally in your browser. No data is transmitted to any server."
4. Screenshots: popup, sidebar, EPUB generation dialog
5. Description: clear, concise, mentions Pocket migration
6. Source code: link to GitHub repo (AMO can require source for review)
7. Version: semver, starting at 1.0.0 for first public release

---

## Risk Register

| Risk | Impact | Mitigation |
|------|--------|------------|
| Readability.js fails on SPAs/paywalled content | EPUB chapters missing content | Graceful fallback to stub (title + URL). User can manually copy-paste content later. |
| browser.storage.local quota issues | Data loss at scale | `unlimitedStorage` permission. Monitor usage, warn at 500 MB. |
| Firefox sidebar API changes | UI breaks | WXT abstracts some of this. Pin to minimum Firefox version. |
| EPUB rendering issues on Kindle | Poor reading experience | Test with Kindle Previewer (Amazon's tool). Keep CSS minimal. |
| Background tab extraction detected as "automation" by sites | Extraction blocked | Respect robots.txt conceptually. Rate-limit. User can manually extract. |
| MV3 migration issues | Extension breaks on future Firefox | WXT builds for both MV2/MV3. Firefox committed to MV2 support with 12mo notice. |

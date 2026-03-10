# StashRead

A Firefox browser extension for saving web articles and generating EPUB reading packs for Kindle.

## Features

- **Save articles** — toolbar click, right-click any link, or Alt+S
- **Manage your reading list** — sidebar with search, filter (All/Unread/Favorites), and sort
- **Import from Pocket** — migrate your library via Pocket's HTML export
- **Export your data** — JSON backup or CSV export
- **Generate EPUB packs** — select articles, generate a single EPUB, send to Kindle

## Development

```bash
npm install
npm run dev        # Opens Firefox with extension loaded + HMR
npm run build      # Production build
npm run zip        # Package for AMO submission
npm run test       # Unit tests
```

## Tech Stack

- [WXT](https://wxt.dev) — Vite-powered WebExtension framework
- [Svelte 5](https://svelte.dev) — UI framework
- [Tailwind CSS v4](https://tailwindcss.com) — Styling
- [TypeScript](https://typescriptlang.org) — Strict mode
- [Vitest](https://vitest.dev) — Unit testing

## Privacy

StashRead stores all data locally in your browser via `browser.storage.local`. No data is ever transmitted to any server.

## License

MIT

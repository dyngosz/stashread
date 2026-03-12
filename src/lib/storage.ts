// All browser.storage.local operations go through this module.
// NEVER call browser.storage directly from components or other modules.

import type { Article, FilterOptions, StashReadSettings } from "./models";
import { extractDomain, generateId } from "./utils";

const ARTICLES_KEY = "articles";
const SETTINGS_KEY = "settings";

function faviconUrl(domain: string): string {
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
}

async function readArticles(): Promise<Article[]> {
  const result = await browser.storage.local.get(ARTICLES_KEY);
  return (result[ARTICLES_KEY] as Article[] | undefined) ?? [];
}

async function writeArticles(articles: Article[]): Promise<void> {
  await browser.storage.local.set({ [ARTICLES_KEY]: articles });
}

export async function saveArticle(partial: Partial<Article>): Promise<Article> {
  const articles = await readArticles();
  const url = partial.url ?? "";
  const existing = articles.find((a) => a.url === url);
  if (existing) return existing;

  const domain = extractDomain(url);
  const article: Article = {
    id: generateId(),
    url,
    title: partial.title ?? url,
    domain,
    favicon: partial.favicon ?? faviconUrl(domain),
    savedAt: partial.savedAt ?? Date.now(),
    isRead: partial.isRead ?? false,
    isFavorite: partial.isFavorite ?? false,
    tags: partial.tags ?? [],
    excerpt: partial.excerpt ?? "",
    content: partial.content,
    textContent: partial.textContent,
    byline: partial.byline,
    siteName: partial.siteName,
    estimatedReadTime: partial.estimatedReadTime,
    extractionStatus: partial.extractionStatus ?? null,
  };

  await writeArticles([...articles, article]);
  return article;
}

export async function getArticles(filter?: FilterOptions): Promise<Article[]> {
  let articles = await readArticles();

  if (filter?.view === "unread") {
    articles = articles.filter((a) => !a.isRead);
  } else if (filter?.view === "favorites") {
    articles = articles.filter((a) => a.isFavorite);
  }

  if (filter?.tag) {
    const tag = filter.tag;
    articles = articles.filter((a) => a.tags.includes(tag));
  }

  const sortOrder = filter?.sortOrder ?? "newest";
  if (sortOrder === "newest") {
    articles = [...articles].sort((a, b) => b.savedAt - a.savedAt);
  } else if (sortOrder === "oldest") {
    articles = [...articles].sort((a, b) => a.savedAt - b.savedAt);
  } else if (sortOrder === "title") {
    articles = [...articles].sort((a, b) => a.title.localeCompare(b.title));
  } else if (sortOrder === "domain") {
    articles = [...articles].sort((a, b) => a.domain.localeCompare(b.domain));
  }

  return articles;
}

export async function getArticle(id: string): Promise<Article | null> {
  const articles = await readArticles();
  return articles.find((a) => a.id === id) ?? null;
}

export async function updateArticle(id: string, updates: Partial<Article>): Promise<Article> {
  const articles = await readArticles();
  const idx = articles.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error(`Article not found: ${id}`);
  const updated = { ...articles[idx], ...updates };
  articles[idx] = updated;
  await writeArticles(articles);
  return updated;
}

export async function deleteArticle(id: string): Promise<void> {
  const articles = await readArticles();
  await writeArticles(articles.filter((a) => a.id !== id));
}

export async function deleteArticles(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const articles = await readArticles();
  await writeArticles(articles.filter((a) => !idSet.has(a.id)));
}

// Task 3 — search, settings, stats

const DEFAULT_SETTINGS: StashReadSettings = {
  kindleEmail: "",
  defaultView: "all",
  sortOrder: "newest",
  theme: "system",
  badgeCount: "unread",
  keyboardShortcut: "Alt+S",
  knownTags: [],
};

export async function searchArticles(query: string): Promise<Article[]> {
  if (!query.trim()) return [];
  const lower = query.toLowerCase();
  const articles = await readArticles();
  return articles.filter(
    (a) =>
      a.title.toLowerCase().includes(lower) ||
      a.url.toLowerCase().includes(lower) ||
      a.domain.toLowerCase().includes(lower) ||
      a.tags.some((t) => t.toLowerCase().includes(lower)) ||
      a.excerpt.toLowerCase().includes(lower)
  );
}

export async function getSettings(): Promise<StashReadSettings> {
  const result = await browser.storage.local.get(SETTINGS_KEY);
  const stored = (result[SETTINGS_KEY] as Partial<StashReadSettings> | undefined) ?? {};
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function updateSettings(updates: Partial<StashReadSettings>): Promise<void> {
  const current = await getSettings();
  const safe = { ...updates, ...(updates.knownTags ? { knownTags: [...updates.knownTags] } : {}) };
  await browser.storage.local.set({ [SETTINGS_KEY]: { ...current, ...safe } });
}

export async function getStats(): Promise<{ total: number; unread: number; favorites: number }> {
  const articles = await readArticles();
  return {
    total: articles.length,
    unread: articles.filter((a) => !a.isRead).length,
    favorites: articles.filter((a) => a.isFavorite).length,
  };
}

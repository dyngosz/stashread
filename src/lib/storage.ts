// All browser.storage.local operations go through this module.
// NEVER call browser.storage directly from components or other modules.

import type { Article, FilterOptions, StashReadSettings } from "./models";

export async function saveArticle(_article: Partial<Article>): Promise<Article> {
  throw new Error("Not implemented");
}

export async function getArticles(_filter?: FilterOptions): Promise<Article[]> {
  throw new Error("Not implemented");
}

export async function getArticle(_id: string): Promise<Article | null> {
  throw new Error("Not implemented");
}

export async function updateArticle(
  _id: string,
  _updates: Partial<Article>
): Promise<Article> {
  throw new Error("Not implemented");
}

export async function deleteArticle(_id: string): Promise<void> {
  throw new Error("Not implemented");
}

export async function deleteArticles(_ids: string[]): Promise<void> {
  throw new Error("Not implemented");
}

export async function searchArticles(_query: string): Promise<Article[]> {
  throw new Error("Not implemented");
}

export async function getSettings(): Promise<StashReadSettings> {
  throw new Error("Not implemented");
}

export async function updateSettings(
  _updates: Partial<StashReadSettings>
): Promise<void> {
  throw new Error("Not implemented");
}

export async function getStats(): Promise<{
  total: number;
  unread: number;
  favorites: number;
}> {
  throw new Error("Not implemented");
}

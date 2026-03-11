import type { Article, ImportResult } from "./models";
import { saveArticle, getArticles } from "./storage";

export async function exportJSON(): Promise<Blob> {
  const articles = await getArticles();
  const json = JSON.stringify(articles, null, 2);
  return new Blob([json], { type: "application/json" });
}

export async function importJSON(file: File): Promise<ImportResult> {
  const text = await file.text();

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Invalid JSON — file could not be parsed");
  }

  if (!Array.isArray(parsed)) {
    throw new Error("Invalid backup — expected an array of articles");
  }

  const result: ImportResult = { added: 0, skipped: 0, errors: [] };

  for (const item of parsed) {
    if (!item || typeof item !== "object" || !("url" in item) || typeof item.url !== "string") {
      result.errors.push(`Skipped entry: missing or invalid 'url' field`);
      continue;
    }

    const existing = (await getArticles()).find((a) => a.url === item.url);
    if (existing) {
      result.skipped++;
      continue;
    }

    await saveArticle(item as Partial<Article>);
    result.added++;
  }

  return result;
}

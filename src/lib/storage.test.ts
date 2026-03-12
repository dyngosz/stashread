import { describe, it, expect, beforeEach } from "vitest";
import {
  saveArticle,
  getArticles,
  getArticle,
  updateArticle,
  deleteArticle,
  deleteArticles,
  searchArticles,
  getSettings,
  updateSettings,
  getStats,
} from "./storage";

describe("saveArticle", () => {
  it("returns a fully formed Article with generated fields", async () => {
    const article = await saveArticle({ url: "https://example.com/post", title: "Hello" });
    expect(article.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(article.url).toBe("https://example.com/post");
    expect(article.title).toBe("Hello");
    expect(article.domain).toBe("example.com");
    expect(article.favicon).toBe("https://www.google.com/s2/favicons?domain=example.com&sz=32");
    expect(typeof article.savedAt).toBe("number");
    expect(article.isRead).toBe(false);
    expect(article.isFavorite).toBe(false);
    expect(article.tags).toEqual([]);
    expect(article.excerpt).toBe("");
  });

  it("persists so getArticles returns it", async () => {
    await saveArticle({ url: "https://example.com", title: "A" });
    const articles = await getArticles();
    expect(articles).toHaveLength(1);
  });

  it("deduplicates by URL — returns existing article, no duplicate", async () => {
    const first = await saveArticle({ url: "https://example.com", title: "Original" });
    const second = await saveArticle({ url: "https://example.com", title: "Duplicate" });
    expect(second.id).toBe(first.id);
    expect(await getArticles()).toHaveLength(1);
  });

  it("uses provided title, excerpt, tags when supplied", async () => {
    const article = await saveArticle({
      url: "https://example.com",
      title: "Custom",
      excerpt: "some excerpt",
      tags: ["science"],
    });
    expect(article.title).toBe("Custom");
    expect(article.excerpt).toBe("some excerpt");
    expect(article.tags).toEqual(["science"]);
  });

  it("falls back to URL as title when title is missing", async () => {
    const article = await saveArticle({ url: "https://example.com/no-title" });
    expect(article.title).toBe("https://example.com/no-title");
  });

  it("uses provided favicon when supplied", async () => {
    const article = await saveArticle({ url: "https://example.com", favicon: "https://custom.icon/fav.png" });
    expect(article.favicon).toBe("https://custom.icon/fav.png");
  });
});

describe("getArticles", () => {
  beforeEach(async () => {
    await saveArticle({ url: "https://a.com", title: "Banana" });
    await saveArticle({ url: "https://b.com", title: "Apple" });
    await saveArticle({ url: "https://c.com", title: "Cherry" });
    const all = await getArticles();
    const b = all.find((a) => a.url === "https://b.com")!;
    const c = all.find((a) => a.url === "https://c.com")!;
    await updateArticle(b.id, { isRead: true, isFavorite: true });
    await updateArticle(c.id, { isFavorite: true });
  });

  it("returns all articles with no filter", async () => {
    expect(await getArticles()).toHaveLength(3);
  });

  it("view=unread returns only unread articles", async () => {
    const articles = await getArticles({ view: "unread" });
    expect(articles.every((a) => !a.isRead)).toBe(true);
    expect(articles).toHaveLength(2);
  });

  it("view=favorites returns only favorites", async () => {
    const articles = await getArticles({ view: "favorites" });
    expect(articles.every((a) => a.isFavorite)).toBe(true);
    expect(articles).toHaveLength(2);
  });

  it("tag filter returns only articles with that tag", async () => {
    const all = await getArticles();
    await updateArticle(all[0].id, { tags: ["tech"] });
    const tagged = await getArticles({ tag: "tech" });
    expect(tagged).toHaveLength(1);
    expect(tagged[0].tags).toContain("tech");
  });

  it("sortOrder=newest returns descending by savedAt", async () => {
    const articles = await getArticles({ sortOrder: "newest" });
    expect(articles[0].savedAt).toBeGreaterThanOrEqual(articles[1].savedAt);
    expect(articles[1].savedAt).toBeGreaterThanOrEqual(articles[2].savedAt);
  });

  it("sortOrder=oldest returns ascending by savedAt", async () => {
    const articles = await getArticles({ sortOrder: "oldest" });
    expect(articles[0].savedAt).toBeLessThanOrEqual(articles[1].savedAt);
  });

  it("sortOrder=title returns alphabetical by title", async () => {
    const articles = await getArticles({ sortOrder: "title" });
    expect(articles.map((a) => a.title)).toEqual(["Apple", "Banana", "Cherry"]);
  });

  it("sortOrder=domain returns alphabetical by domain", async () => {
    const articles = await getArticles({ sortOrder: "domain" });
    expect(articles.map((a) => a.domain)).toEqual(["a.com", "b.com", "c.com"]);
  });
});

describe("getArticle", () => {
  it("returns the article by id", async () => {
    const saved = await saveArticle({ url: "https://example.com", title: "X" });
    const found = await getArticle(saved.id);
    expect(found?.id).toBe(saved.id);
  });

  it("returns null for unknown id", async () => {
    expect(await getArticle("nonexistent-id")).toBeNull();
  });
});

describe("updateArticle", () => {
  it("merges updates without replacing unrelated fields", async () => {
    const saved = await saveArticle({ url: "https://example.com", title: "Original", tags: ["a"] });
    const updated = await updateArticle(saved.id, { isRead: true });
    expect(updated.isRead).toBe(true);
    expect(updated.title).toBe("Original");
    expect(updated.tags).toEqual(["a"]);
  });

  it("persists the update", async () => {
    const saved = await saveArticle({ url: "https://example.com", title: "X" });
    await updateArticle(saved.id, { isRead: true });
    expect((await getArticle(saved.id))?.isRead).toBe(true);
  });

  it("throws when article id does not exist", async () => {
    await expect(updateArticle("bad-id", { isRead: true })).rejects.toThrow();
  });
});

describe("deleteArticle", () => {
  it("removes the article", async () => {
    const saved = await saveArticle({ url: "https://example.com", title: "X" });
    await deleteArticle(saved.id);
    expect(await getArticle(saved.id)).toBeNull();
  });

  it("is a no-op for non-existent id", async () => {
    await expect(deleteArticle("does-not-exist")).resolves.toBeUndefined();
  });
});

describe("deleteArticles", () => {
  it("removes multiple articles by id", async () => {
    const a = await saveArticle({ url: "https://a.com", title: "A" });
    const b = await saveArticle({ url: "https://b.com", title: "B" });
    await saveArticle({ url: "https://c.com", title: "C" });
    await deleteArticles([a.id, b.id]);
    const remaining = await getArticles();
    expect(remaining).toHaveLength(1);
    expect(remaining[0].url).toBe("https://c.com");
  });

  it("handles empty array without error", async () => {
    await expect(deleteArticles([])).resolves.toBeUndefined();
  });
});

describe("searchArticles", () => {
  beforeEach(async () => {
    await saveArticle({ url: "https://css-tricks.com/flexbox", title: "A Guide to Flexbox", excerpt: "Learn CSS layout" });
    await saveArticle({ url: "https://mdn.dev/js", title: "JavaScript Arrays", tags: ["programming"], excerpt: "Array methods" });
    await saveArticle({ url: "https://example.com/react", title: "React Hooks", excerpt: "useState and useEffect" });
  });

  it("matches on title (case-insensitive)", async () => {
    expect(await searchArticles("flexbox")).toHaveLength(1);
    expect(await searchArticles("FLEXBOX")).toHaveLength(1);
  });

  it("matches on url", async () => {
    expect(await searchArticles("css-tricks")).toHaveLength(1);
  });

  it("matches on domain", async () => {
    expect(await searchArticles("mdn")).toHaveLength(1);
  });

  it("matches on tags", async () => {
    const results = await searchArticles("programming");
    expect(results).toHaveLength(1);
    expect(results[0].tags).toContain("programming");
  });

  it("matches on excerpt", async () => {
    expect(await searchArticles("useState")).toHaveLength(1);
  });

  it("returns empty array when no match", async () => {
    expect(await searchArticles("nonexistent-xyz-987")).toHaveLength(0);
  });

  it("returns empty array for empty/whitespace query", async () => {
    expect(await searchArticles("")).toHaveLength(0);
    expect(await searchArticles("   ")).toHaveLength(0);
  });
});

describe("getSettings", () => {
  it("returns default settings when none stored", async () => {
    expect(await getSettings()).toEqual({
      kindleEmail: "",
      defaultView: "all",
      sortOrder: "newest",
      theme: "system",
      badgeCount: "unread",
      keyboardShortcut: "Alt+S",
      knownTags: [],
    });
  });

  it("returns previously saved settings", async () => {
    await updateSettings({ theme: "dark", kindleEmail: "me@kindle.com" });
    const settings = await getSettings();
    expect(settings.theme).toBe("dark");
    expect(settings.kindleEmail).toBe("me@kindle.com");
  });
});

describe("updateSettings", () => {
  it("merges without replacing unrelated fields", async () => {
    await updateSettings({ theme: "dark" });
    await updateSettings({ badgeCount: "total" });
    const settings = await getSettings();
    expect(settings.theme).toBe("dark");
    expect(settings.badgeCount).toBe("total");
    expect(settings.sortOrder).toBe("newest"); // unchanged default
  });
});

describe("getStats", () => {
  it("returns zeros when no articles", async () => {
    expect(await getStats()).toEqual({ total: 0, unread: 0, favorites: 0 });
  });

  it("counts total, unread, favorites correctly", async () => {
    const a = await saveArticle({ url: "https://a.com", title: "A" });
    const b = await saveArticle({ url: "https://b.com", title: "B" });
    await saveArticle({ url: "https://c.com", title: "C" });
    await updateArticle(a.id, { isRead: true, isFavorite: true });
    await updateArticle(b.id, { isFavorite: true });
    const stats = await getStats();
    expect(stats.total).toBe(3);
    expect(stats.unread).toBe(2);
    expect(stats.favorites).toBe(2);
  });
});

import { describe, it, expect } from "vitest";
import { exportJSON, importJSON } from "./import-export";
import { saveArticle, getArticles } from "./storage";

describe("exportJSON", () => {
  it("returns a Blob with correct MIME type", async () => {
    await saveArticle({ url: "https://a.com", title: "A" });
    const blob = await exportJSON();
    expect(blob.type).toBe("application/json");
  });

  it("blob content is valid JSON array of articles", async () => {
    await saveArticle({ url: "https://a.com", title: "A" });
    await saveArticle({ url: "https://b.com", title: "B" });
    const blob = await exportJSON();
    const text = await blob.text();
    const parsed = JSON.parse(text);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(2);
    expect(parsed[0].url).toBeDefined();
    expect(parsed[0].id).toBeDefined();
  });

  it("returns empty array when no articles", async () => {
    const blob = await exportJSON();
    const text = await blob.text();
    expect(JSON.parse(text)).toEqual([]);
  });
});

describe("importJSON", () => {
  it("imports articles and returns correct counts", async () => {
    const data = JSON.stringify([
      { url: "https://a.com", title: "A", domain: "a.com", favicon: "", savedAt: Date.now(), isRead: false, isFavorite: false, tags: [], excerpt: "" },
      { url: "https://b.com", title: "B", domain: "b.com", favicon: "", savedAt: Date.now(), isRead: false, isFavorite: false, tags: [], excerpt: "" },
    ]);
    const file = new File([data], "backup.json", { type: "application/json" });
    const result = await importJSON(file);
    expect(result.added).toBe(2);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
    expect(await getArticles()).toHaveLength(2);
  });

  it("skips duplicates (same URL already in storage)", async () => {
    await saveArticle({ url: "https://a.com", title: "Existing" });
    const data = JSON.stringify([
      { url: "https://a.com", title: "Duplicate", domain: "a.com", favicon: "", savedAt: Date.now(), isRead: false, isFavorite: false, tags: [], excerpt: "" },
      { url: "https://b.com", title: "New",       domain: "b.com", favicon: "", savedAt: Date.now(), isRead: false, isFavorite: false, tags: [], excerpt: "" },
    ]);
    const file = new File([data], "backup.json", { type: "application/json" });
    const result = await importJSON(file);
    expect(result.added).toBe(1);
    expect(result.skipped).toBe(1);
    expect(await getArticles()).toHaveLength(2);
  });

  it("rejects invalid JSON with an error", async () => {
    const file = new File(["not json"], "bad.json", { type: "application/json" });
    await expect(importJSON(file)).rejects.toThrow("Invalid JSON");
  });

  it("rejects non-array JSON", async () => {
    const file = new File([JSON.stringify({ articles: [] })], "bad.json", { type: "application/json" });
    await expect(importJSON(file)).rejects.toThrow("expected an array");
  });

  it("skips entries missing url field and records error", async () => {
    const data = JSON.stringify([
      { title: "No URL" },
      { url: "https://b.com", title: "Good" },
    ]);
    const file = new File([data], "backup.json", { type: "application/json" });
    const result = await importJSON(file);
    expect(result.added).toBe(1);
    expect(result.errors).toHaveLength(1);
  });

  it("handles empty array without error", async () => {
    const file = new File([JSON.stringify([])], "empty.json", { type: "application/json" });
    const result = await importJSON(file);
    expect(result.added).toBe(0);
    expect(result.skipped).toBe(0);
    expect(result.errors).toHaveLength(0);
  });

  it("preserves isRead and isFavorite flags from import", async () => {
    const data = JSON.stringify([
      { url: "https://a.com", title: "A", isRead: true, isFavorite: true, domain: "a.com", favicon: "", savedAt: Date.now(), tags: [], excerpt: "" },
    ]);
    const file = new File([data], "backup.json", { type: "application/json" });
    await importJSON(file);
    const articles = await getArticles();
    expect(articles[0].isRead).toBe(true);
    expect(articles[0].isFavorite).toBe(true);
  });
});

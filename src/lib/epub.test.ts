import { describe, it, expect } from "vitest";
import JSZip from "jszip";
import { generateEPUB } from "./epub";
import type { Article } from "./models";

function makeArticle(overrides: Partial<Article> = {}): Article {
  return {
    id: "test-id",
    url: "https://example.com/article",
    title: "Test Article",
    domain: "example.com",
    favicon: "",
    savedAt: Date.now(),
    isRead: false,
    isFavorite: false,
    tags: [],
    excerpt: "A short excerpt.",
    textContent: "This is the full article text.\n\nSecond paragraph here.",
    extractionStatus: "success",
    ...overrides,
  };
}

describe("generateEPUB", () => {
  it("returns a Blob", async () => {
    const blob = await generateEPUB([makeArticle()], { title: "Test Pack", markAsRead: false });
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.size).toBeGreaterThan(0);
  });

  it("blob is a valid zip (can be parsed by JSZip)", async () => {
    const blob = await generateEPUB([makeArticle()], { title: "Test Pack", markAsRead: false });
    const zip = await JSZip.loadAsync(blob);
    expect(zip.files["mimetype"]).toBeDefined();
    expect(zip.files["META-INF/container.xml"]).toBeDefined();
    expect(zip.files["OEBPS/content.opf"]).toBeDefined();
    expect(zip.files["OEBPS/toc.ncx"]).toBeDefined();
  });

  it("mimetype file has correct content", async () => {
    const blob = await generateEPUB([makeArticle()], { title: "Test Pack", markAsRead: false });
    const zip = await JSZip.loadAsync(blob);
    const mimetype = await zip.files["mimetype"].async("string");
    expect(mimetype).toBe("application/epub+zip");
  });

  it("generates one XHTML file per article", async () => {
    const articles = [
      makeArticle({ id: "a1", title: "First" }),
      makeArticle({ id: "a2", title: "Second", url: "https://example.com/2" }),
    ];
    const blob = await generateEPUB(articles, { title: "Test Pack", markAsRead: false });
    const zip = await JSZip.loadAsync(blob);
    expect(zip.files["OEBPS/article-0001.xhtml"]).toBeDefined();
    expect(zip.files["OEBPS/article-0002.xhtml"]).toBeDefined();
  });

  it("content.opf includes all articles in manifest and spine", async () => {
    const articles = [
      makeArticle({ id: "a1" }),
      makeArticle({ id: "a2", url: "https://example.com/2" }),
    ];
    const blob = await generateEPUB(articles, { title: "My Pack", markAsRead: false });
    const zip = await JSZip.loadAsync(blob);
    const opf = await zip.files["OEBPS/content.opf"].async("string");
    expect(opf).toContain("article-0001");
    expect(opf).toContain("article-0002");
    expect(opf).toContain("My Pack");
  });

  it("toc.ncx includes article titles", async () => {
    const blob = await generateEPUB([makeArticle({ title: "My Great Article" })], { title: "Pack", markAsRead: false });
    const zip = await JSZip.loadAsync(blob);
    const toc = await zip.files["OEBPS/toc.ncx"].async("string");
    expect(toc).toContain("My Great Article");
  });

  it("article XHTML contains title and text content", async () => {
    const blob = await generateEPUB([makeArticle()], { title: "Pack", markAsRead: false });
    const zip = await JSZip.loadAsync(blob);
    const xhtml = await zip.files["OEBPS/article-0001.xhtml"].async("string");
    expect(xhtml).toContain("Test Article");
    expect(xhtml).toContain("This is the full article text");
  });

  it("article XHTML falls back to excerpt when textContent is missing", async () => {
    const article = makeArticle({ textContent: undefined, excerpt: "Just an excerpt." });
    const blob = await generateEPUB([article], { title: "Pack", markAsRead: false });
    const zip = await JSZip.loadAsync(blob);
    const xhtml = await zip.files["OEBPS/article-0001.xhtml"].async("string");
    expect(xhtml).toContain("Just an excerpt.");
  });

  it("throws when articles array is empty", async () => {
    await expect(generateEPUB([], { title: "Empty", markAsRead: false })).rejects.toThrow("No articles");
  });

  it("escapes special XML characters in title and content", async () => {
    const article = makeArticle({ title: "A & B <test>", textContent: "Content with & and <tags>" });
    const blob = await generateEPUB([article], { title: "Pack", markAsRead: false });
    const zip = await JSZip.loadAsync(blob);
    const xhtml = await zip.files["OEBPS/article-0001.xhtml"].async("string");
    expect(xhtml).toContain("A &amp; B &lt;test&gt;");
    expect(xhtml).not.toContain("A & B");
  });
});

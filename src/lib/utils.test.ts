import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  extractDomain,
  formatRelativeTime,
  generateId,
  estimateReadTime,
} from "./utils";

describe("extractDomain", () => {
  it("extracts domain from a standard URL", () => {
    expect(extractDomain("https://example.com/path/to/page")).toBe("example.com");
  });

  it("strips www. prefix", () => {
    expect(extractDomain("https://www.example.com/article")).toBe("example.com");
  });

  it("handles http protocol", () => {
    expect(extractDomain("http://example.com")).toBe("example.com");
  });

  it("preserves subdomains other than www", () => {
    expect(extractDomain("https://blog.example.com/post")).toBe("blog.example.com");
  });

  it("handles URLs with query strings", () => {
    expect(extractDomain("https://example.com/search?q=test&page=2")).toBe("example.com");
  });

  it("handles URLs with ports", () => {
    expect(extractDomain("https://example.com:8080/path")).toBe("example.com");
  });

  it("returns the input as-is for invalid URLs", () => {
    expect(extractDomain("not a url")).toBe("not a url");
  });

  it("returns the input as-is for empty string", () => {
    expect(extractDomain("")).toBe("");
  });
});

describe("formatRelativeTime", () => {
  const NOW = 1_700_000_000_000; // fixed reference timestamp

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns 'just now' for timestamps less than 60 seconds ago", () => {
    expect(formatRelativeTime(NOW - 30_000)).toBe("just now");
  });

  it("returns 'just now' for timestamps 0ms ago", () => {
    expect(formatRelativeTime(NOW)).toBe("just now");
  });

  it("returns minutes for timestamps 1–59 minutes ago", () => {
    expect(formatRelativeTime(NOW - 5 * 60_000)).toBe("5m ago");
    expect(formatRelativeTime(NOW - 59 * 60_000)).toBe("59m ago");
  });

  it("returns hours for timestamps 1–23 hours ago", () => {
    expect(formatRelativeTime(NOW - 2 * 3_600_000)).toBe("2h ago");
    expect(formatRelativeTime(NOW - 23 * 3_600_000)).toBe("23h ago");
  });

  it("returns days for timestamps 1–29 days ago", () => {
    expect(formatRelativeTime(NOW - 3 * 86_400_000)).toBe("3d ago");
    expect(formatRelativeTime(NOW - 29 * 86_400_000)).toBe("29d ago");
  });

  it("returns months for timestamps 30+ days ago", () => {
    expect(formatRelativeTime(NOW - 30 * 86_400_000)).toBe("1mo ago");
    expect(formatRelativeTime(NOW - 90 * 86_400_000)).toBe("3mo ago");
  });
});

describe("generateId", () => {
  it("returns a string", () => {
    expect(typeof generateId()).toBe("string");
  });

  it("returns a valid UUID v4 format", () => {
    const uuid = generateId();
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );
  });

  it("returns a unique value each call", () => {
    const ids = new Set(Array.from({ length: 100 }, () => generateId()));
    expect(ids.size).toBe(100);
  });
});

describe("estimateReadTime", () => {
  it("returns 1 for short text under 200 words", () => {
    const text = "word ".repeat(100).trim();
    expect(estimateReadTime(text)).toBe(1);
  });

  it("returns 1 for exactly 200 words", () => {
    const text = "word ".repeat(200).trim();
    expect(estimateReadTime(text)).toBe(1);
  });

  it("returns 2 for 201 words", () => {
    const text = "word ".repeat(201).trim();
    expect(estimateReadTime(text)).toBe(2);
  });

  it("returns 5 for 1000 words", () => {
    const text = "word ".repeat(1000).trim();
    expect(estimateReadTime(text)).toBe(5);
  });

  it("handles extra whitespace between words", () => {
    const text = "one   two\tthree\nfour";
    expect(estimateReadTime(text)).toBe(1);
  });

  it("returns 1 for a single word", () => {
    expect(estimateReadTime("hello")).toBe(1);
  });
});

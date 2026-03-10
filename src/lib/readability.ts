// Article content extraction wrapper using @mozilla/readability. Phase 3 implementation.
import type { Article } from "./models";

export interface ExtractedContent {
  content: string;
  textContent: string;
  byline: string | null;
  siteName: string | null;
  estimatedReadTime: number;
}

export async function extractContent(_tabId: number): Promise<ExtractedContent> {
  throw new Error("Not implemented - Phase 3");
}

export async function extractContentForArticle(
  _article: Article
): Promise<ExtractedContent> {
  throw new Error("Not implemented - Phase 3");
}

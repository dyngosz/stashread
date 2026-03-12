export interface Article {
  id: string;
  url: string;
  title: string;
  domain: string;
  favicon: string;
  savedAt: number;
  isRead: boolean;
  isFavorite: boolean;
  tags: string[];
  excerpt: string;
  content?: string;
  textContent?: string;
  byline?: string;
  siteName?: string;
  estimatedReadTime?: number;
  extractionStatus?: "pending" | "success" | "failed" | null;
}

export interface StashReadSettings {
  kindleEmail: string;
  defaultView: "all" | "unread" | "favorites";
  sortOrder: "newest" | "oldest" | "title" | "domain";
  theme: "system" | "light" | "dark";
  badgeCount: "unread" | "total" | "off";
  keyboardShortcut: string;
  knownTags: string[];
}

export interface FilterOptions {
  view?: StashReadSettings["defaultView"];
  sortOrder?: StashReadSettings["sortOrder"];
  tag?: string;
}

export interface ImportResult {
  added: number;
  skipped: number;
  errors: string[];
}

export interface EPUBOptions {
  title: string;
  markAsRead: boolean;
}

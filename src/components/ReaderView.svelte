<script lang="ts">
  import type { Article } from "../lib/models";

  let {
    article,
    onclose,
  }: {
    article: Article;
    onclose: () => void;
  } = $props();

  function openOriginal() {
    browser.tabs.create({ url: article.url });
  }

  function formatDate(ts: number): string {
    return new Date(ts).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  }
</script>

<div class="flex flex-col h-full bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
  <!-- Sticky header -->
  <div class="flex-shrink-0 flex items-center gap-2 px-3 py-2 border-b border-gray-200 dark:border-gray-700">
    <button
      onclick={onclose}
      class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 flex-shrink-0"
      aria-label="Back"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/>
      </svg>
    </button>
    <p class="flex-1 text-sm font-medium text-gray-700 dark:text-gray-300 truncate min-w-0">{article.title}</p>
    <button
      onclick={openOriginal}
      class="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 flex-shrink-0"
      aria-label="Open original"
      title="Open original article"
    >
      <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
      </svg>
    </button>
  </div>

  <!-- Scrollable content -->
  <div class="flex-1 overflow-y-auto px-4 py-5">
    <!-- Article header -->
    <h1 class="text-lg font-bold text-gray-900 dark:text-gray-100 leading-snug mb-2">{article.title}</h1>

    <!-- Meta row -->
    <div class="text-xs text-gray-500 dark:text-gray-400 mb-1 flex flex-wrap gap-x-1.5">
      {#if article.byline}<span>{article.byline}</span><span>·</span>{/if}
      {#if article.siteName}<span>{article.siteName}</span><span>·</span>{/if}
      <span>{formatDate(article.savedAt)}</span>
    </div>

    <!-- Read time divider -->
    <div class="flex items-center gap-2 mb-5 text-xs text-gray-400 dark:text-gray-500">
      <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
      {#if article.estimatedReadTime}
        <span>{article.estimatedReadTime} min read</span>
      {:else}
        <span>{article.domain}</span>
      {/if}
      <div class="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
    </div>

    <!-- Content -->
    {#if article.content}
      <div class="article-body">{@html article.content}</div>
    {:else}
      <div class="text-center py-8">
        {#if article.excerpt}
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-3">{article.excerpt}</p>
        {/if}
        <p class="text-xs text-gray-400 dark:text-gray-500 mb-5">Full content not available — open the original to read.</p>
        <button onclick={openOriginal} class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-md transition-colors">
          Open original article
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  :global(.article-body) {
    font-size: 0.9rem;
    line-height: 1.7;
    color: #1f2937;
    word-break: break-word;
    overflow-wrap: break-word;
  }
  :global(.dark .article-body) { color: #e5e7eb; }

  :global(.article-body p) { margin-bottom: 1em; }

  :global(.article-body h1),
  :global(.article-body h2) {
    font-size: 1.1rem; font-weight: 700; line-height: 1.35;
    margin-top: 1.5em; margin-bottom: 0.5em; color: #111827;
  }
  :global(.dark .article-body h1),
  :global(.dark .article-body h2) { color: #f9fafb; }

  :global(.article-body h3),
  :global(.article-body h4) {
    font-size: 1rem; font-weight: 600; line-height: 1.4;
    margin-top: 1.25em; margin-bottom: 0.4em; color: #1f2937;
  }
  :global(.dark .article-body h3),
  :global(.dark .article-body h4) { color: #f3f4f6; }

  :global(.article-body blockquote) {
    border-left: 3px solid #d1d5db;
    margin: 1.25em 0; padding: 0.25em 0 0.25em 1em;
    color: #6b7280; font-style: italic;
  }
  :global(.dark .article-body blockquote) { border-left-color: #4b5563; color: #9ca3af; }

  :global(.article-body ul) { list-style-type: disc; margin: 0.75em 0; padding-left: 1.5em; }
  :global(.article-body ol) { list-style-type: decimal; margin: 0.75em 0; padding-left: 1.5em; }
  :global(.article-body li) { margin-bottom: 0.3em; }
  :global(.article-body li > ul),
  :global(.article-body li > ol) { margin-top: 0.25em; margin-bottom: 0; }

  :global(.article-body a) {
    color: #2563eb; text-decoration: underline; text-underline-offset: 2px;
  }
  :global(.article-body a:hover) { color: #1d4ed8; }
  :global(.dark .article-body a) { color: #60a5fa; }
  :global(.dark .article-body a:hover) { color: #93c5fd; }

  :global(.article-body img) {
    max-width: 100%; height: auto; border-radius: 4px;
    margin: 1em 0; display: block;
  }

  :global(.article-body figure) { margin: 1.25em 0; }
  :global(.article-body figcaption) {
    font-size: 0.75rem; color: #6b7280;
    text-align: center; margin-top: 0.4em; font-style: italic;
  }
  :global(.dark .article-body figcaption) { color: #9ca3af; }

  :global(.article-body code) {
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 0.8em; background-color: #f3f4f6;
    color: #dc2626; padding: 0.1em 0.35em; border-radius: 3px;
  }
  :global(.dark .article-body code) { background-color: #1f2937; color: #fca5a5; }

  :global(.article-body pre) {
    background-color: #f3f4f6; border: 1px solid #e5e7eb;
    border-radius: 6px; padding: 0.85em 1em;
    overflow-x: auto; margin: 1em 0;
    font-size: 0.8rem; line-height: 1.6;
  }
  :global(.dark .article-body pre) { background-color: #111827; border-color: #374151; }
  :global(.article-body pre code) { background: none; color: inherit; padding: 0; }

  :global(.article-body table) {
    width: 100%; border-collapse: collapse;
    font-size: 0.85rem; margin: 1em 0;
    overflow-x: auto; display: block;
  }
  :global(.article-body th) {
    background-color: #f9fafb; font-weight: 600;
    text-align: left; padding: 0.5em 0.75em;
    border-bottom: 2px solid #e5e7eb;
  }
  :global(.dark .article-body th) { background-color: #1f2937; border-bottom-color: #374151; color: #f3f4f6; }
  :global(.article-body td) { padding: 0.5em 0.75em; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  :global(.dark .article-body td) { border-bottom-color: #374151; }
  :global(.article-body tr:last-child td) { border-bottom: none; }

  :global(.article-body hr) { border: none; border-top: 1px solid #e5e7eb; margin: 1.5em 0; }
  :global(.dark .article-body hr) { border-top-color: #374151; }
</style>

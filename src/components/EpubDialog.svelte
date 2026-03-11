<script lang="ts">
  import type { Article } from "../lib/models";
  import { generateEPUB } from "../lib/epub";

  let {
    articles,
    onclose,
  }: {
    articles: Article[];
    onclose: (didMarkAsRead: boolean) => void;
  } = $props();

  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
  let title = $state(`StashRead ${today}`);
  let markAsRead = $state(true);
  let generating = $state(false);
  let error = $state("");

  async function generate() {
    if (articles.length === 0) {
      error = "No articles selected.";
      return;
    }
    generating = true;
    error = "";
    try {
      const blob = await generateEPUB(articles, { title, markAsRead });
      const filename = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() + ".epub";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onclose(markAsRead);
    } catch (e) {
      error = e instanceof Error ? e.message : "Failed to generate EPUB";
    } finally {
      generating = false;
    }
  }
</script>

<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50" role="dialog" aria-modal="true">
  <div class="bg-white dark:bg-gray-900 rounded-lg shadow-xl w-80 flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
      <h2 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Export EPUB</h2>
      <button
        onclick={() => onclose(false)}
        aria-label="Close"
        class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
        </svg>
      </button>
    </div>

    <!-- Body -->
    <div class="px-4 py-4 space-y-4">
      <div>
        <label class="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">EPUB title</label>
        <input
          type="text"
          bind:value={title}
          class="w-full px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 dark:text-gray-100"
        />
      </div>

      <p class="text-xs text-gray-500 dark:text-gray-400">
        {articles.length} article{articles.length === 1 ? "" : "s"} will be included.
      </p>

      <label class="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" bind:checked={markAsRead} class="rounded text-blue-600" />
        <span class="text-sm text-gray-700 dark:text-gray-300">Mark all as read after export</span>
      </label>

      {#if error}
        <p class="text-xs text-red-500 dark:text-red-400">{error}</p>
      {/if}
    </div>

    <!-- Footer -->
    <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      <button
        onclick={generate}
        disabled={generating || articles.length === 0}
        class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-md transition-colors"
      >
        {generating ? "Generating..." : "Download EPUB"}
      </button>
    </div>
  </div>
</div>

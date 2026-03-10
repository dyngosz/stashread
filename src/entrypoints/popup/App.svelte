<script lang="ts">
  import { getArticles, getSettings, updateArticle } from "../../lib/storage";
  import { formatRelativeTime } from "../../lib/utils";
  import type { Article, StashReadSettings } from "../../lib/models";

  type Status = "loading" | "saved" | "unsaved" | "saving" | "error";

  let status = $state<Status>("loading");
  let recentArticles = $state<Article[]>([]);
  let currentArticle = $state<Article | undefined>(undefined);
  let errorMessage = $state("");

  $effect(() => {
    init();
  });

  async function init() {
    try {
      const settings = await getSettings();
      applyTheme(settings.theme);

      const tabStatus = await browser.runtime.sendMessage({ type: "GET_CURRENT_TAB_STATUS" });
      status = tabStatus?.isSaved ? "saved" : "unsaved";
      currentArticle = tabStatus?.article;

      const all = await getArticles({ sortOrder: "newest" });
      recentArticles = all.slice(0, 5);
    } catch (e) {
      status = "error";
      errorMessage = e instanceof Error ? e.message : "Unknown error";
    }
  }

  async function saveCurrentPage() {
    status = "saving";
    try {
      const result = await browser.runtime.sendMessage({ type: "SAVE_CURRENT_TAB" });
      if (result?.success) {
        currentArticle = result.article;
        status = "saved";
        const all = await getArticles({ sortOrder: "newest" });
        recentArticles = all.slice(0, 5);
      } else {
        status = "error";
        errorMessage = "Failed to save page.";
      }
    } catch (e) {
      status = "error";
      errorMessage = e instanceof Error ? e.message : "Unknown error";
    }
  }

  function openArticle(url: string) {
    browser.tabs.create({ url });
  }

  function openSidebar() {
    browser.sidebarAction.open();
  }

  function applyTheme(theme: StashReadSettings["theme"]) {
    const html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else if (theme === "light") html.classList.remove("dark");
    else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      prefersDark ? html.classList.add("dark") : html.classList.remove("dark");
    }
  }
</script>

<div class="w-[350px] min-h-[200px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 flex flex-col">
  <!-- Header -->
  <div class="flex items-center px-4 py-3 border-b border-gray-200 dark:border-gray-700">
    <span class="font-semibold text-base">StashRead</span>
  </div>

  <!-- Save button -->
  <div class="px-4 py-3">
    {#if status === "loading" || status === "saving"}
      <button disabled class="w-full py-2 px-4 rounded-md bg-blue-300 dark:bg-blue-800 text-white text-sm cursor-not-allowed">
        {status === "saving" ? "Saving..." : "Loading..."}
      </button>
    {:else if status === "saved"}
      <button disabled class="w-full py-2 px-4 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed">
        Already saved ✓
      </button>
    {:else if status === "error"}
      <p class="text-red-500 dark:text-red-400 text-xs mb-2">{errorMessage}</p>
      <button onclick={saveCurrentPage} class="w-full py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors">
        Save this page
      </button>
    {:else}
      <button onclick={saveCurrentPage} class="w-full py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors">
        Save this page
      </button>
    {/if}
  </div>

  <!-- Recent articles -->
  {#if recentArticles.length > 0}
    <div class="border-t border-gray-200 dark:border-gray-700">
      <p class="px-4 pt-2 pb-1 text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wide font-medium">Recent</p>
      <ul>
        {#each recentArticles as article (article.id)}
          <li>
            <button
              onclick={() => openArticle(article.url)}
              class="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition-colors"
            >
              <img
                src={article.favicon}
                alt=""
                class="w-4 h-4 flex-shrink-0 rounded-sm"
                onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium truncate text-gray-900 dark:text-gray-100">{article.title}</p>
                <p class="text-xs text-gray-400 dark:text-gray-500">{article.domain} · {formatRelativeTime(article.savedAt)}</p>
              </div>
            </button>
          </li>
        {/each}
      </ul>
    </div>
  {/if}

  <!-- Footer -->
  <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700 mt-auto">
    <button onclick={openSidebar} class="text-sm text-blue-600 dark:text-blue-400 hover:underline">
      Open Reading List →
    </button>
  </div>
</div>

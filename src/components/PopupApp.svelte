<script lang="ts">
  import { getSettings } from "../lib/storage";
  import type { Article } from "../lib/models";

  type Status = "loading" | "unsaved" | "saving" | "saved" | "error";

  let status = $state<Status>("loading");
  let savedArticle = $state<Article | null>(null);
  let errorMsg = $state("");

  $effect(() => {
    initPopup();
  });

  async function initPopup() {
    try {
      const settings = await getSettings();
      applyTheme(settings.theme);
    } catch { /* non-fatal */ }

    try {
      const result = await browser.runtime.sendMessage({ type: "GET_CURRENT_TAB_STATUS" });
      if (result?.isSaved) {
        status = "saved";
        savedArticle = result.article ?? null;
      } else {
        status = "unsaved";
      }
    } catch {
      status = "unsaved";
    }
  }

  async function savePage() {
    status = "saving";
    errorMsg = "";
    try {
      const result = await browser.runtime.sendMessage({ type: "SAVE_CURRENT_TAB" });
      if (result?.success) {
        status = "saved";
        savedArticle = result.article ?? null;
      } else {
        status = "error";
        errorMsg = "Could not save page.";
      }
    } catch (e) {
      status = "error";
      errorMsg = e instanceof Error ? e.message : "Unknown error";
    }
  }

  async function openSidebar() {
    try {
      await browser.sidebarAction.open();
    } catch { /* already open or unsupported */ }
    finally {
      window.close();
    }
  }

  function applyTheme(theme: "system" | "light" | "dark") {
    const html = document.documentElement;
    if (theme === "dark") html.classList.add("dark");
    else if (theme === "light") html.classList.remove("dark");
    else {
      window.matchMedia("(prefers-color-scheme: dark)").matches
        ? html.classList.add("dark")
        : html.classList.remove("dark");
    }
  }
</script>

<div class="w-[300px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm p-4 flex flex-col gap-3">
  {#if status === "loading"}
    <div class="h-10 flex items-center text-gray-400 dark:text-gray-500 text-xs">Checking...</div>
  {:else if status === "saved"}
    <div class="flex items-center gap-2">
      <span class="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/40 flex items-center justify-center">
        <svg class="w-3 h-3 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"/>
        </svg>
      </span>
      <div class="min-w-0">
        <p class="text-xs font-medium text-green-700 dark:text-green-400">Already saved</p>
        {#if savedArticle}
          <p class="text-xs text-gray-500 dark:text-gray-400 truncate">{savedArticle.title}</p>
        {/if}
      </div>
    </div>
    <button onclick={savePage} class="w-full py-1.5 px-3 rounded-md border border-gray-200 dark:border-gray-700 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      Save again
    </button>
  {:else if status === "saving"}
    <button disabled class="w-full py-2 px-4 rounded-md bg-blue-300 dark:bg-blue-800 text-white text-sm cursor-not-allowed">Saving...</button>
  {:else if status === "error"}
    {#if errorMsg}<p class="text-xs text-red-500 dark:text-red-400">{errorMsg}</p>{/if}
    <button onclick={savePage} class="w-full py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors">Save this page</button>
  {:else}
    <button onclick={savePage} class="w-full py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors">Save this page</button>
  {/if}

  <hr class="border-gray-100 dark:border-gray-800" />

  <button onclick={openSidebar} class="w-full py-2 px-4 rounded-md bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm transition-colors flex items-center justify-center gap-2">
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h7"/>
    </svg>
    Open sidebar
  </button>
</div>

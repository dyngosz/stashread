<script lang="ts">
  import {
    getArticles, getStats, updateArticle, deleteArticle,
    deleteArticles, searchArticles, getSettings, updateSettings,
  } from "../../lib/storage";
  import ArticleCard from "../../components/ArticleCard.svelte";
  import ReaderView from "../../components/ReaderView.svelte";
  import SettingsView from "../../components/SettingsView.svelte";
  import EpubDialog from "../../components/EpubDialog.svelte";
  import TagEditor from "../../components/TagEditor.svelte";
  import type { Article, FilterOptions, StashReadSettings } from "../../lib/models";

  type SaveStatus = "idle" | "saving" | "saved" | "error";

  let articles = $state<Article[]>([]);
  let stats = $state({ total: 0, unread: 0, favorites: 0 });
  let settings = $state<StashReadSettings | null>(null);
  let loading = $state(true);
  let error = $state("");

  let saveStatus = $state<SaveStatus>("idle");
  let saveError = $state("");

  let rawQuery = $state("");
  let debouncedQuery = $state("");
  let debounceTimer: ReturnType<typeof setTimeout> | undefined;

  let activeView = $state<FilterOptions["view"]>("all");
  let sortOrder = $state<FilterOptions["sortOrder"]>("newest");
  let selectionMode = $state(false);
  let selectedIds = $state(new Set<string>());
  let showSettings = $state(false);
  let showEpubDialog = $state(false);
  let epubArticles = $state<Article[]>([]);
  let activeTag = $state<string | null>(null);
  let editTagsArticle = $state<Article | null>(null);
  let activeArticle = $state<Article | null>(null);

  // Debounce search query
  $effect(() => {
    clearTimeout(debounceTimer);
    const q = rawQuery;
    debounceTimer = setTimeout(() => { debouncedQuery = q; }, 300);
    return () => clearTimeout(debounceTimer);
  });

  // Reload when filters or debounced query changes
  $effect(() => {
    load(debouncedQuery, activeView, sortOrder, activeTag);
  });

  async function load(query: string, view: FilterOptions["view"], sort: FilterOptions["sortOrder"], tag: string | null) {
    try {
      loading = true;
      error = "";
      articles = query.trim()
        ? await searchArticles(query)
        : await getArticles({ view, sortOrder: sort, tag: tag ?? undefined });
      stats = await getStats();
      if (!settings) {
        settings = await getSettings();
        applyTheme(settings.theme);
      }
    } catch (e) {
      error = e instanceof Error ? e.message : "Load failed";
    } finally {
      loading = false;
    }
  }

  async function checkCurrentTab() {
    try {
      const result = await browser.runtime.sendMessage({ type: "GET_CURRENT_TAB_STATUS" });
      saveStatus = result?.isSaved ? "saved" : "idle";
    } catch {
      saveStatus = "idle";
    }
  }

  async function saveCurrentPage() {
    saveStatus = "saving";
    saveError = "";
    try {
      const result = await browser.runtime.sendMessage({ type: "SAVE_CURRENT_TAB" });
      if (result?.success) {
        saveStatus = "saved";
        await load(debouncedQuery, activeView, sortOrder);
      } else {
        saveStatus = "error";
        saveError = "Failed to save page.";
      }
    } catch (e) {
      saveStatus = "error";
      saveError = e instanceof Error ? e.message : "Unknown error";
    }
  }

  // Reload when any storage change happens (saves from popup, keyboard shortcut, context menu)
  $effect(() => {
    function onStorageChange(_changes: object, area: string) {
      if (area === "local") load(debouncedQuery, activeView, sortOrder, activeTag);
    }
    browser.storage.onChanged.addListener(onStorageChange);
    return () => browser.storage.onChanged.removeListener(onStorageChange);
  });

  // Check current tab status and keep in sync on navigation
  $effect(() => {
    checkCurrentTab();

    function onActivated() {
      checkCurrentTab();
    }

    function onUpdated(_tabId: number, changeInfo: { status?: string }) {
      if (changeInfo.status === "complete") {
        checkCurrentTab();
      }
    }

    browser.tabs.onActivated.addListener(onActivated);
    browser.tabs.onUpdated.addListener(onUpdated);

    return () => {
      browser.tabs.onActivated.removeListener(onActivated);
      browser.tabs.onUpdated.removeListener(onUpdated);
    };
  });

  async function handleAction(action: string, article: Article) {
    try {
      if (action === "mark-read") await updateArticle(article.id, { isRead: true });
      else if (action === "mark-unread") await updateArticle(article.id, { isRead: false });
      else if (action === "toggle-favorite") await updateArticle(article.id, { isFavorite: !article.isFavorite });
      else if (action === "copy-url") await navigator.clipboard.writeText(article.url);
      else if (action === "delete") await deleteArticle(article.id);
      else if (action.startsWith("filter-tag:")) {
        const tag = action.slice("filter-tag:".length);
        activeTag = activeTag === tag ? null : tag;
        return;
      }
      else if (action === "edit-tags") {
        editTagsArticle = editTagsArticle?.id === article.id ? null : { ...article };
        return;
      }
      await load(debouncedQuery, activeView, sortOrder, activeTag);
    } catch (e) {
      error = e instanceof Error ? e.message : "Action failed";
    }
  }

  async function openArticle(article: Article) {
    activeArticle = { ...article, isRead: true };
    if (!article.isRead) {
      try {
        await updateArticle(article.id, { isRead: true });
        await load(debouncedQuery, activeView, sortOrder, activeTag);
      } catch (e) {
        error = e instanceof Error ? e.message : "Failed to mark as read";
      }
    }
  }

  function toggleSelection(id: string, checked: boolean) {
    const next = new Set(selectedIds);
    checked ? next.add(id) : next.delete(id);
    selectedIds = next;
  }

  function selectAll() { selectedIds = new Set(articles.map((a) => a.id)); }
  function selectUnread() { selectedIds = new Set(articles.filter((a) => !a.isRead).map((a) => a.id)); }
  function selectFavorites() { selectedIds = new Set(articles.filter((a) => a.isFavorite).map((a) => a.id)); }

  async function markSelectedRead() {
    for (const id of selectedIds) await updateArticle(id, { isRead: true });
    exitSelection();
    await load(debouncedQuery, activeView, sortOrder);
  }

  async function deleteSelected() {
    await deleteArticles(Array.from(selectedIds));
    exitSelection();
    await load(debouncedQuery, activeView, sortOrder, activeTag);
  }

  function exitSelection() {
    selectionMode = false;
    selectedIds = new Set();
  }

  function openEpubExport(articleSubset: Article[]) {
    epubArticles = articleSubset;
    showEpubDialog = true;
  }

  async function handleEpubClose(didMarkAsRead: boolean) {
    if (didMarkAsRead) {
      for (const article of epubArticles) {
        await updateArticle(article.id, { isRead: true });
      }
      await load(debouncedQuery, activeView, sortOrder, activeTag);
    }
    showEpubDialog = false;
    exitSelection();
  }

  async function applySettings(updates: Partial<StashReadSettings>) {
    await updateSettings(updates);
    settings = await getSettings();
    applyTheme(settings.theme);
  }

  function applyTheme(theme: StashReadSettings["theme"]) {
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

<div class="relative min-h-screen flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-sm">
  <!-- Header -->
  <div class="flex-shrink-0 border-b border-gray-200 dark:border-gray-700 px-3 pt-3 pb-2 space-y-2">
    <!-- Save button -->
    <div>
      {#if saveStatus === "saving"}
        <button disabled class="w-full py-2 px-4 rounded-md bg-blue-300 dark:bg-blue-800 text-white text-sm cursor-not-allowed">
          Saving...
        </button>
      {:else if saveStatus === "saved"}
        <button disabled class="w-full py-2 px-4 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm cursor-not-allowed">
          Already saved ✓
        </button>
      {:else if saveStatus === "error"}
        <p class="text-red-500 dark:text-red-400 text-xs mb-1">{saveError}</p>
        <button onclick={saveCurrentPage} class="w-full py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors">
          Save this page
        </button>
      {:else}
        <button onclick={saveCurrentPage} class="w-full py-2 px-4 rounded-md bg-blue-600 hover:bg-blue-700 text-white text-sm transition-colors">
          Save this page
        </button>
      {/if}
    </div>

    <!-- Search -->
    <input
      type="search"
      bind:value={rawQuery}
      placeholder="Search articles..."
      class="w-full px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />

    <!-- Filters + sort + selection toggle -->
    <div class="flex items-center gap-1">
      {#each (["all", "unread", "favorites"] as const) as view}
        <button
          onclick={() => { activeView = view; }}
          class="px-2.5 py-1 rounded-md transition-colors capitalize"
          class:bg-blue-100={activeView === view}
          class:text-blue-700={activeView === view}
          class:dark:bg-blue-900={activeView === view}
          class:dark:text-blue-300={activeView === view}
          class:text-gray-600={activeView !== view}
          class:dark:text-gray-400={activeView !== view}
          class:hover:bg-gray-100={activeView !== view}
          class:dark:hover:bg-gray-800={activeView !== view}
        >{view}</button>
      {/each}

      <div class="ml-auto flex items-center gap-1">
        <select
          bind:value={sortOrder}
          class="text-xs bg-transparent border border-gray-200 dark:border-gray-700 rounded px-1 py-0.5 text-gray-600 dark:text-gray-400 focus:outline-none"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="title">Title</option>
          <option value="domain">Domain</option>
        </select>

        <button
          onclick={() => { selectionMode = !selectionMode; if (!selectionMode) selectedIds = new Set(); }}
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
          title="Selection mode"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
          </svg>
        </button>
      </div>
    </div>

    <!-- Active tag filter pill -->
    {#if activeTag}
      <div class="flex items-center gap-1.5">
        <span class="text-xs text-gray-500 dark:text-gray-400">Tag:</span>
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
          {activeTag}
          <button
            onclick={() => { activeTag = null; }}
            class="hover:text-blue-900 dark:hover:text-blue-100 ml-0.5"
            aria-label="Clear tag filter"
          >×</button>
        </span>
      </div>
    {/if}

    <!-- Quick-select row (selection mode only) -->
    {#if selectionMode}
      <div class="flex gap-3">
        <button onclick={selectAll} class="text-xs text-blue-600 dark:text-blue-400 hover:underline">All visible</button>
        <button onclick={selectUnread} class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Unread</button>
        <button onclick={selectFavorites} class="text-xs text-blue-600 dark:text-blue-400 hover:underline">Favorites</button>
      </div>
    {/if}
  </div>

  <!-- Article list -->
  <div class="flex-1 overflow-y-auto">
    {#if loading}
      <div class="flex items-center justify-center py-12 text-gray-400 dark:text-gray-500">Loading...</div>
    {:else if error}
      <div class="px-4 py-4 text-red-500 dark:text-red-400">{error}</div>
    {:else if articles.length === 0}
      <div class="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
        <svg class="w-10 h-10 mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"/>
        </svg>
        <p class="font-medium">{rawQuery ? "No results found" : "No articles yet"}</p>
        {#if !rawQuery}
          <p class="text-xs mt-1">Save articles using the popup or Alt+S</p>
        {/if}
      </div>
    {:else}
      {#each articles as article (article.id)}
        <ArticleCard
          {article}
          {selectionMode}
          selected={selectedIds.has(article.id)}
          onselect={toggleSelection}
          onaction={handleAction}
          onopen={openArticle}
        />
        {#if editTagsArticle?.id === article.id}
          <TagEditor
            tags={article.tags}
            knownTags={[...new Set([...(settings?.knownTags ?? []), ...articles.flatMap((a) => a.tags)])].sort()}
            onsave={async (newTags) => {
              try {
                await updateArticle(article.id, { tags: [...newTags] });
                await load(debouncedQuery, activeView, sortOrder, activeTag);
              } catch (e) {
                error = e instanceof Error ? e.message : "Failed to save tags";
              }
              editTagsArticle = null;
            }}
            onclose={() => { editTagsArticle = null; }}
          />
        {/if}
      {/each}
    {/if}
  </div>

  <!-- Selection toolbar -->
  {#if selectionMode && selectedIds.size > 0}
    <div class="flex-shrink-0 flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/30 border-t border-blue-200 dark:border-blue-800">
      <span class="font-medium text-blue-700 dark:text-blue-300">{selectedIds.size} selected</span>
      <button onclick={markSelectedRead} class="text-blue-700 dark:text-blue-300 hover:underline">Mark read</button>
      <button onclick={() => openEpubExport(articles.filter((a) => selectedIds.has(a.id)))} class="text-blue-700 dark:text-blue-300 hover:underline">Export EPUB</button>
      <button onclick={deleteSelected} class="text-red-600 dark:text-red-400 hover:underline ml-auto">Delete</button>
      <button onclick={exitSelection} class="text-gray-500 dark:text-gray-400 hover:underline">Cancel</button>
    </div>
  {/if}

  <!-- Footer -->
  {#if !selectionMode}
    <div class="flex-shrink-0 flex items-center justify-between px-4 py-2 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
      <span>{stats.total} articles ({stats.unread} unread)</span>
      <div class="flex items-center gap-1">
        <button
          onclick={() => openEpubExport(articles)}
          disabled={articles.length === 0}
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-40"
          title="Export EPUB"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
          </svg>
        </button>
        <button
          onclick={() => { showSettings = !showSettings; }}
          class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
          title="Settings"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
        </button>
      </div>
    </div>
  {/if}

  <!-- Settings overlay -->
  {#if showSettings && settings}
    <div class="absolute inset-0 bg-white dark:bg-gray-900 z-30 flex flex-col">
      <SettingsView
        {settings}
        onclose={() => { showSettings = false; }}
        onsave={applySettings}
      />
    </div>
  {/if}

  <!-- Reader view overlay -->
  {#if activeArticle}
    <div class="absolute inset-0 bg-white dark:bg-gray-900 z-30 flex flex-col">
      <ReaderView
        article={activeArticle}
        onclose={() => { activeArticle = null; }}
      />
    </div>
  {/if}

  <!-- EPUB export dialog -->
  {#if showEpubDialog}
    <EpubDialog
      articles={epubArticles}
      onclose={handleEpubClose}
    />
  {/if}
</div>

<script lang="ts">
  import type { Article } from "../lib/models";
  import { formatRelativeTime } from "../lib/utils";

  let {
    article,
    selectionMode = false,
    selected = false,
    onselect,
    onaction,
  }: {
    article: Article;
    selectionMode?: boolean;
    selected?: boolean;
    onselect?: (id: string, checked: boolean) => void;
    onaction?: (action: string, article: Article) => void;
  } = $props();

  let menuOpen = $state(false);

  function toggleMenu(e: MouseEvent) {
    e.stopPropagation();
    menuOpen = !menuOpen;
  }

  function closeMenu() { menuOpen = false; }

  function toggleFavorite(e: MouseEvent) {
    e.stopPropagation();
    onaction?.("toggle-favorite", article);
  }

  function menuAction(action: string) {
    menuOpen = false;
    onaction?.(action, article);
  }

  function handleCardClick() {
    if (selectionMode) {
      onselect?.(article.id, !selected);
    } else {
      browser.tabs.create({ url: article.url });
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  onclick={handleCardClick}
  class="relative flex items-start gap-2 px-3 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer border-b border-gray-100 dark:border-gray-800 transition-colors {selected ? 'bg-blue-50 dark:bg-blue-900/20' : ''}"
>
  {#if selectionMode}
    <input
      type="checkbox"
      checked={selected}
      onclick={(e) => e.stopPropagation()}
      onchange={(e) => onselect?.(article.id, (e.currentTarget as HTMLInputElement).checked)}
      class="mt-1.5 flex-shrink-0"
    />
  {/if}

  <!-- Unread indicator -->
  <div class="w-2 flex-shrink-0 flex items-center justify-center pt-1.5">
    {#if !article.isRead}
      <div class="w-2 h-2 rounded-full bg-blue-500"></div>
    {/if}
  </div>

  <!-- Favicon -->
  <img
    src={article.favicon}
    alt=""
    class="w-4 h-4 flex-shrink-0 rounded-sm mt-1"
    onerror={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
  />

  <!-- Text content -->
  <div class="flex-1 min-w-0">
    <p class="text-sm font-medium text-gray-900 dark:text-gray-100 leading-snug">{article.title}</p>
    {#if article.excerpt}
      <p class="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{article.excerpt}</p>
    {/if}
    <p class="text-xs text-gray-400 dark:text-gray-500 mt-1">
  {#if article.byline}<span class="text-gray-500 dark:text-gray-400">{article.byline} · </span>{/if}{article.domain} · {formatRelativeTime(article.savedAt)}{#if article.estimatedReadTime} · {article.estimatedReadTime} min read{/if}
</p>
    <div class="flex flex-wrap gap-1 mt-1.5" onclick={(e) => e.stopPropagation()}>
      {#each article.tags as tag (tag)}
        <button
          onclick={(e) => { e.stopPropagation(); onaction?.(`filter-tag:${tag}`, article); }}
          class="px-1.5 py-0.5 rounded-full text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
        >
          {tag}
        </button>
      {/each}
      <button
        onclick={(e) => { e.stopPropagation(); onaction?.("edit-tags", article); }}
        class="px-1.5 py-0.5 rounded-full text-[10px] text-gray-400 dark:text-gray-600 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
        title="Edit tags"
      >
        {article.tags.length === 0 ? "+ tag" : "✎"}
      </button>
    </div>
  </div>

  <!-- Favorite + overflow -->
  <div class="flex items-center gap-0.5 flex-shrink-0 ml-1">
    <button
      onclick={toggleFavorite}
      class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      title={article.isFavorite ? "Remove from favorites" : "Add to favorites"}
    >
      {#if article.isFavorite}
        <svg class="w-4 h-4 text-yellow-400 fill-yellow-400" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
        </svg>
      {:else}
        <svg class="w-4 h-4 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"/>
        </svg>
      {/if}
    </button>

    <div class="relative">
      <button
        onclick={toggleMenu}
        class="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="More options"
      >
        <svg class="w-4 h-4 text-gray-400 dark:text-gray-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
        </svg>
      </button>

      {#if menuOpen}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div class="fixed inset-0 z-10" onclick={closeMenu}></div>
        <div class="absolute right-0 mt-1 w-44 bg-white dark:bg-gray-800 rounded-md shadow-lg border border-gray-200 dark:border-gray-700 z-20 py-1" onclick={(e) => e.stopPropagation()}>
          <button onclick={() => menuAction(article.isRead ? "mark-unread" : "mark-read")} class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            {article.isRead ? "Mark as unread" : "Mark as read"}
          </button>
          <button onclick={() => menuAction("toggle-favorite")} class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            {article.isFavorite ? "Remove from favorites" : "Add to favorites"}
          </button>
          <button onclick={() => menuAction("copy-url")} class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            Copy URL
          </button>
          <button onclick={() => menuAction("edit-tags")} class="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300">
            Edit tags
          </button>
          <hr class="my-1 border-gray-200 dark:border-gray-700" />
          <button onclick={() => menuAction("delete")} class="w-full text-left px-3 py-2 text-sm hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400">
            Delete
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>

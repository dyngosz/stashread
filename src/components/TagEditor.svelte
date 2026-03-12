<script lang="ts">
  let {
    tags,
    knownTags = [],
    onsave,
    onclose,
  }: {
    tags: string[];
    knownTags?: string[];
    onsave: (tags: string[]) => void;
    onclose: () => void;
  } = $props();

  let localTags = $state<string[]>([...tags]);
  let inputValue = $state("");
  let inputEl = $state<HTMLInputElement | null>(null);
  let closed = false;

  // Tags from knownTags not yet on this article
  const suggestions = $derived(knownTags.filter((t) => !localTags.includes(t)));

  $effect(() => {
    inputEl?.focus();
  });

  function addTag(raw: string) {
    const tag = raw.trim().toLowerCase().replace(/,+$/, "");
    if (!tag || localTags.includes(tag) || tag.length > 30) return;
    localTags = [...localTags, tag];
  }

  function removeTag(tag: string) {
    localTags = localTags.filter((t) => t !== tag);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue);
        inputValue = "";
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      closed = true;
      onclose();
    } else if (e.key === "Backspace" && inputValue === "" && localTags.length > 0) {
      localTags = localTags.slice(0, -1);
    }
  }

  function handleBlur() {
    setTimeout(() => {
      if (closed) return;
      if (inputValue.trim()) {
        addTag(inputValue);
        inputValue = "";
      }
      onsave(localTags);
    }, 150);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="px-3 pb-3 pt-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800"
  onclick={(e) => e.stopPropagation()}
>
  <!-- Current tags on this article -->
  {#if localTags.length > 0}
    <div class="flex flex-wrap gap-1 mb-2">
      {#each localTags as tag (tag)}
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
          {tag}
          <button
            onmousedown={(e) => e.preventDefault()}
            onclick={(e) => { e.stopPropagation(); removeTag(tag); }}
            class="hover:text-blue-900 dark:hover:text-blue-100 leading-none"
            aria-label="Remove tag {tag}"
          >×</button>
        </span>
      {/each}
    </div>
  {/if}

  <!-- Predefined tag suggestions (quick-add) -->
  {#if suggestions.length > 0}
    <div class="flex flex-wrap gap-1 mb-2">
      {#each suggestions as tag (tag)}
        <button
          onmousedown={(e) => e.preventDefault()}
          onclick={(e) => { e.stopPropagation(); addTag(tag); }}
          class="px-2 py-0.5 rounded-full text-xs border border-dashed border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-blue-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        >
          + {tag}
        </button>
      {/each}
    </div>
    <hr class="border-gray-200 dark:border-gray-700 mb-2" />
  {/if}

  <!-- Custom tag input -->
  <input
    bind:this={inputEl}
    bind:value={inputValue}
    onkeydown={handleKeydown}
    onblur={handleBlur}
    placeholder={knownTags.length > 0 ? "Or type a custom tag..." : "Add tags..."}
    class="w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded px-2.5 py-1.5 text-xs outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600"
  />
  <p class="mt-1 text-[10px] text-gray-400 dark:text-gray-600">Enter to add · Esc to cancel</p>
</div>

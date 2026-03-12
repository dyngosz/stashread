<script lang="ts">
  let {
    tags,
    onsave,
    onclose,
  }: {
    tags: string[];
    onsave: (tags: string[]) => void;
    onclose: () => void;
  } = $props();

  let localTags = $state<string[]>([...tags]);
  let inputValue = $state("");
  let inputEl = $state<HTMLInputElement | null>(null);

  $effect(() => {
    inputEl?.focus();
  });

  function addTag() {
    const raw = inputValue.trim().toLowerCase().replace(/,+$/, "");
    if (!raw || localTags.includes(raw) || raw.length > 30) {
      inputValue = "";
      return;
    }
    localTags = [...localTags, raw];
    inputValue = "";
  }

  function removeTag(tag: string) {
    localTags = localTags.filter((t) => t !== tag);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Escape") {
      onclose();
    } else if (e.key === "Backspace" && inputValue === "" && localTags.length > 0) {
      localTags = localTags.slice(0, -1);
    }
  }

  function handleBlur() {
    setTimeout(() => {
      if (inputValue.trim()) addTag();
      onsave(localTags);
    }, 150);
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="px-3 pb-3 pt-1 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-100 dark:border-gray-800"
  onclick={(e) => e.stopPropagation()}
>
  <div
    class="flex flex-wrap gap-1 items-center p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md min-h-[36px] cursor-text focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent"
    onclick={() => inputEl?.focus()}
  >
    {#each localTags as tag (tag)}
      <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
        {tag}
        <button
          onclick={(e) => { e.stopPropagation(); removeTag(tag); }}
          class="hover:text-blue-900 dark:hover:text-blue-100 leading-none"
          aria-label="Remove tag {tag}"
        >×</button>
      </span>
    {/each}
    <input
      bind:this={inputEl}
      bind:value={inputValue}
      onkeydown={handleKeydown}
      onblur={handleBlur}
      placeholder={localTags.length === 0 ? "Add tags..." : ""}
      class="flex-1 min-w-[80px] bg-transparent outline-none text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600"
    />
  </div>
  <p class="mt-1 text-[10px] text-gray-400 dark:text-gray-600">Enter or comma to add · Backspace to remove · Esc to cancel</p>
</div>

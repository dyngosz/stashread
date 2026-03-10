<script lang="ts">
  import type { StashReadSettings } from "../lib/models";

  let {
    settings,
    onclose,
    onsave,
  }: {
    settings: StashReadSettings;
    onclose: () => void;
    onsave: (updates: Partial<StashReadSettings>) => Promise<void>;
  } = $props();

  let theme = $state(settings.theme);
  let badgeCount = $state(settings.badgeCount);
  let saving = $state(false);

  async function save() {
    saving = true;
    await onsave({ theme, badgeCount });
    saving = false;
    onclose();
  }
</script>

<div class="flex flex-col h-full">
  <div class="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
    <h2 class="text-base font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
    <button onclick={onclose} class="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
      </svg>
    </button>
  </div>

  <div class="flex-1 overflow-y-auto px-4 py-4 space-y-6">
    <!-- Theme -->
    <section>
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Theme</h3>
      <div class="space-y-2">
        {#each (["system", "light", "dark"] as const) as option}
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="theme" value={option} bind:group={theme} class="text-blue-600" />
            <span class="text-sm text-gray-700 dark:text-gray-300 capitalize">{option}</span>
          </label>
        {/each}
      </div>
    </section>

    <!-- Badge -->
    <section>
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Extension badge</h3>
      <div class="space-y-2">
        {#each ([["unread", "Show unread count"], ["total", "Show total count"], ["off", "Off"]] as const) as [value, label]}
          <label class="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="badge" {value} bind:group={badgeCount} class="text-blue-600" />
            <span class="text-sm text-gray-700 dark:text-gray-300">{label}</span>
          </label>
        {/each}
      </div>
    </section>

    <!-- About -->
    <section>
      <h3 class="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">About</h3>
      <p class="text-xs text-gray-500 dark:text-gray-400">StashRead v0.1.0</p>
      <a href="https://github.com/dyngosz/stashread" target="_blank" rel="noopener noreferrer"
         class="text-xs text-blue-600 dark:text-blue-400 hover:underline">GitHub →</a>
    </section>
  </div>

  <div class="flex-shrink-0 px-4 py-3 border-t border-gray-200 dark:border-gray-700">
    <button
      onclick={save}
      disabled={saving}
      class="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm rounded-md transition-colors"
    >
      {saving ? "Saving..." : "Save settings"}
    </button>
  </div>
</div>

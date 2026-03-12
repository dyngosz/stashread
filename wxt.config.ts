import { defineConfig } from "wxt";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  srcDir: "src",
  extensionApi: "chrome",
  modules: ["@wxt-dev/module-svelte"],
  browser: "firefox",

  vite: () => ({
    plugins: [tailwindcss()],
  }),

  manifest: {
    name: "StashRead",
    version: "0.1.0",
    description:
      "Save articles to read later. Generate EPUB reading packs for Kindle.",
    permissions: [
      "storage",
      "unlimitedStorage",
      "activeTab",
      "tabs",
      "contextMenus",
    ],
    browser_specific_settings: {
      gecko: {
        id: "stashread@stashread.dev",
        strict_min_version: "109.0",
        data_collection_permissions: {
          required: [],
          optional: [],
        },
      },
    },
    browser_action: {
      default_icon: {
        16: "icons/icon-16.png",
        32: "icons/icon-32.png",
        48: "icons/icon-48.png",
        96: "icons/icon-96.png",
      },
      default_title: "StashRead",
    },
    sidebar_action: {
      default_title: "StashRead",
      default_panel: "sidebar.html",
      default_icon: {
        16: "icons/icon-16.png",
        32: "icons/icon-32.png",
        48: "icons/icon-48.png",
        96: "icons/icon-96.png",
      },
    },
    commands: {
      "save-current-page": {
        suggested_key: { default: "Alt+S" },
        description: "Save current page to StashRead",
      },
    },
    icons: {
      16: "icons/icon-16.png",
      32: "icons/icon-32.png",
      48: "icons/icon-48.png",
      96: "icons/icon-96.png",
      128: "icons/icon-128.png",
    },
  } as any,
});

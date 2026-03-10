import { saveArticle, getArticles, getSettings, getStats } from "../lib/storage";
import type { Article } from "../lib/models";

type Message = { type: "SAVE_CURRENT_TAB" } | { type: "GET_CURRENT_TAB_STATUS" };
type SaveResult = { success: boolean; duplicate?: boolean; article?: Article };
type TabStatus = { isSaved: boolean; article?: Article };

export default defineBackground(() => {
  // Register context menu on install
  browser.runtime.onInstalled.addListener(() => {
    browser.contextMenus.create({
      id: "save-link-to-stashread",
      title: "Save link to StashRead",
      contexts: ["link"],
    });
  });

  // Context menu click: save the link
  browser.contextMenus.onClicked.addListener(async (info) => {
    if (info.menuItemId !== "save-link-to-stashread" || !info.linkUrl) return;
    const url = info.linkUrl;
    const title = info.selectionText || url;
    await saveArticle({ url, title });
    await updateBadge();
  });

  // Keyboard shortcut: Alt+S saves current page
  browser.commands.onCommand.addListener(async (command) => {
    if (command !== "save-current-page") return;
    await saveCurrentTab();
  });

  // Messages from popup
  browser.runtime.onMessage.addListener((message: Message, _sender, sendResponse) => {
    handleMessage(message).then(sendResponse);
    return true; // keep channel open for async response
  });

  // Badge refresh on any storage change
  browser.storage.onChanged.addListener(async (_changes, area) => {
    if (area === "local") await updateBadge();
  });

  // Set initial badge
  updateBadge();
});

async function saveCurrentTab(): Promise<SaveResult> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) return { success: false };

  let excerpt = "";
  let title = tab.title ?? tab.url;

  if (tab.id) {
    try {
      const response = await browser.tabs.sendMessage(tab.id, { type: "EXTRACT_EXCERPT" });
      if (response) {
        excerpt = response.excerpt ?? "";
        title = response.title || title;
      }
    } catch {
      // Content script not available on restricted pages — continue without excerpt
    }
  }

  const articles = await getArticles();
  const existing = articles.find((a) => a.url === tab.url);
  if (existing) return { success: true, duplicate: true, article: existing };

  const article = await saveArticle({ url: tab.url, title, excerpt });
  await updateBadge();
  return { success: true, duplicate: false, article };
}

async function handleMessage(message: Message): Promise<SaveResult | TabStatus> {
  if (message.type === "SAVE_CURRENT_TAB") {
    return saveCurrentTab();
  }

  if (message.type === "GET_CURRENT_TAB_STATUS") {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (!tab?.url) return { isSaved: false };
    const articles = await getArticles();
    const article = articles.find((a) => a.url === tab.url);
    return article ? { isSaved: true, article } : { isSaved: false };
  }

  return { success: false };
}

async function updateBadge(): Promise<void> {
  const [settings, stats] = await Promise.all([getSettings(), getStats()]);

  if (settings.badgeCount === "off") {
    await browser.browserAction.setBadgeText({ text: "" });
    return;
  }

  const count = settings.badgeCount === "unread" ? stats.unread : stats.total;
  await browser.browserAction.setBadgeText({ text: count > 0 ? String(count) : "" });
  await browser.browserAction.setBadgeBackgroundColor({ color: "#3b82f6" });
}

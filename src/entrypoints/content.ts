export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== "EXTRACT_EXCERPT") return false;

      const ogTitle = (
        document.querySelector('meta[property="og:title"]') as HTMLMetaElement | null
      )?.content ?? "";

      const title = ogTitle || document.title;

      const excerpt = (document.body?.innerText ?? "").substring(0, 500).trim();

      sendResponse({ title, excerpt });
      return true;
    });
  },
});

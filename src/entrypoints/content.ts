import { Readability } from "@mozilla/readability";

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    browser.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message?.type !== "EXTRACT_CONTENT") return false;

      try {
        const documentClone = document.cloneNode(true) as Document;
        const reader = new Readability(documentClone);
        const result = reader.parse();

        if (!result) {
          // Readability failed — fall back to basic extraction
          sendResponse({
            success: false,
            title: document.title,
            excerpt: (document.body?.innerText ?? "").substring(0, 500).trim(),
          });
          return true;
        }

        sendResponse({
          success: true,
          title: result.title || document.title,
          content: result.content,
          textContent: result.textContent,
          byline: result.byline ?? "",
          siteName: result.siteName ?? "",
          excerpt: result.excerpt || result.textContent.substring(0, 300).trim(),
        });
      } catch {
        // Any DOM error — fall back gracefully
        sendResponse({
          success: false,
          title: document.title,
          excerpt: (document.body?.innerText ?? "").substring(0, 500).trim(),
        });
      }
      return true;
    });
  },
});

export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",
  main() {
    // Content script stub - Phase 1 implementation
    console.log("StashRead content script loaded.");
  },
});

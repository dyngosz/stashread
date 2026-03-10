export default defineBackground(() => {
  console.log("StashRead background script started.", { id: browser.runtime.id });
});

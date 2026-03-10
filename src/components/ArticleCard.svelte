<script lang="ts">
  import type { Article } from "../lib/models";
  let { article }: { article: Article } = $props();
</script>

<!-- ArticleCard stub - Phase 1 implementation -->
<div class="p-3 border border-gray-200 rounded">
  <p class="text-sm font-medium truncate">{article.title}</p>
  <p class="text-xs text-gray-500">{article.domain}</p>
</div>

<script lang="ts">
  import { isLoading } from '$lib/stores/loading';
  import { navigating } from '$app/stores';
</script>

{#if $isLoading || $navigating}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div class="animate-spin rounded-full h-32 w-32 border-b-2 border-white"></div>
  </div>
{/if}
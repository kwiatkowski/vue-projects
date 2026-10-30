<template>
  <!-- the site's other domains next to the status: a globe in the worst one's tone, the tooltip – each of them -->
  <HoverTip v-if="rows.length > 0" anchor-class="domains-hit">
    <span class="domains-mark" :class="`domains-mark--${tone}`" tabindex="0"><Globe /><span class="mono">{{ rows.length }}</span></span>

    <template #tip>
      <div class="report-tip__title"><strong>Inne domeny strony</strong></div>

      <dl class="info-tip info-tip--after">
        <template v-for="row in rows" :key="row.domain">
          <dt class="mono">{{ row.domain }}</dt>

          <dd>
            <span :class="`domains-mark--${row.tone}`">{{ row.text }}</span>
            <span v-if="row.ssl" class="faint"> · {{ row.ssl }}</span>
          </dd>
        </template>
      </dl>
    </template>
  </HoverTip>
</template>

<script lang="ts" setup>
  import type { Project } from '@/types'
  import { Globe } from 'lucide-vue-next'
  import { computed } from 'vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { domainChecks } from '@/utils/projects'

  /** The site's other domains (multisite, another language's address) – checked as the home page is. */
  const props = defineProps<{ project: Project }>()

  const rows = computed(() => domainChecks(props.project))

  /** the worst of them – not checked yet counts last */
  const tone = computed(() => {
    const tones = new Set(rows.value.map(row => row.tone))

    return (['down', 'warn', 'ok'] as const).find(each => tones.has(each)) ?? 'unknown'
  })
</script>

<style scoped>
.domains-mark {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: 8px;
  font-size: 11px;
  font-weight: 600;
  vertical-align: middle;
  outline: none;
}

.domains-mark svg {
  width: 13px;
  height: 13px;
}

.domains-mark--ok {
  color: var(--positive);
}

.domains-mark--warn {
  color: var(--warn);
}

.domains-mark--down {
  color: var(--danger);
}

.domains-mark--unknown {
  color: var(--text-3);
}
</style>

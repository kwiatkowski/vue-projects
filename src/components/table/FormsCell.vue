<template>
  <!-- the forms at a glance: an envelope with how many, its colour what they need; the popup – each form, where, how it did -->
  <HoverTip v-if="state" anchor-class="report-hit" interactive>
    <span
      :aria-label="state.label"
      class="forms"
      :class="`forms--${state.tone}`"
      role="img"
      tabindex="0"
    >
      <Mail /><span class="mono">{{ state.count }}</span>
      <span v-if="state.failed > 0" class="forms__also"><X /><span class="mono">{{ state.failed }}</span></span>
      <span v-else-if="state.setup > 0" class="forms__also"><TriangleAlert /><span class="mono">{{ state.setup }}</span></span>
    </span>

    <template #tip>
      <FormsSummary :forms="project.forms!" />
    </template>
  </HoverTip>
</template>

<script lang="ts" setup>
  import type { Project } from '@/types'
  import { Mail, TriangleAlert, X } from 'lucide-vue-next'
  import { computed } from 'vue'
  import FormsSummary from '@/components/table/FormsSummary.vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { formsState } from '@/utils/projects'

  /** The "Formularze" cell: nothing without forms; else the envelope – green, orange (setup, no reCAPTCHA), red (failed). */
  const props = defineProps<{ project: Project }>()

  const state = computed(() => formsState(props.project.forms))
</script>

<style scoped>
.forms {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 600;
  vertical-align: middle;
}

.forms svg {
  width: 16px;
  height: 16px;
  stroke-width: 2.25;
}

.forms .mono {
  line-height: 1;
}

.forms--ok {
  color: var(--positive);
}

.forms--warn {
  color: var(--warn);
}

.forms--bad {
  color: var(--danger);
}

/* the failed sends or the setup errors – a little apart from the count */
.forms__also {
  display: inline-flex;
  align-items: center;
  gap: 1px;
  margin-left: 6px;
}

.forms__also svg {
  width: 13px;
  height: 13px;
}
</style>

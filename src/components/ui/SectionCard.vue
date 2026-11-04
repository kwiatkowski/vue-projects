<template>
  <!-- a bordered section on the dialog's own background: a header bar (an icon in its tone, the name, a remark, actions
       on the right) over its content -->
  <section :aria-labelledby="titleId" class="section-card" :class="`section-card--${tone}`">
    <header class="section-card__head">
      <span v-if="icon" class="section-card__icon"><component :is="icon" /></span>
      <h3 :id="titleId" class="section-card__title">{{ title }}</h3>
      <span v-if="note" class="faint section-card__note">{{ note }}</span>
      <div v-if="$slots.actions" class="section-card__actions"><slot name="actions" /></div>
    </header>

    <div class="section-card__body"><slot /></div>
  </section>
</template>

<script lang="ts" setup>
  import { type Component, useId } from 'vue'

  /** A section of a dialog's tab: production, staging … in Dostęp – usable in any tab. */
  withDefaults(defineProps<{
    title: string
    icon?: Component
    /** a remark after the name, in grey */
    note?: string
    /** the icon's colour: green, blue or grey */
    tone?: 'accent' | 'info' | 'neutral'
  }>(), { icon: undefined, note: undefined, tone: 'neutral' })

  const titleId = useId()
</script>

<style scoped>
.section-card {
  overflow: hidden;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  background: var(--surface);
}

/* the header – a bar in the panel's tone with a line under it, as the dialog's own head */
.section-card__head {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 8px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}

.section-card__title {
  font-size: 13px;
  font-weight: 600;
}

.section-card__note {
  font-size: 12px;
}

.section-card__actions {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.section-card__icon {
  display: inline-grid;
  flex: none;
  place-items: center;
  width: 24px;
  height: 24px;
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text-2);
}

.section-card__icon svg {
  width: 14px;
  height: 14px;
  stroke-width: 2.25;
}

.section-card--accent .section-card__icon {
  background: var(--accent-soft);
  color: var(--accent-text);
}

.section-card--info .section-card__icon {
  background: var(--info-soft);
  color: var(--info);
}

.section-card__body {
  display: grid;
  gap: 12px;
  padding: 14px 16px 16px;
}
</style>

<template>
  <!-- a bordered section on the dialog's own background: a low header bar (an icon, the name, a remark, actions on the
       right) over its content; a collapsible one folds to the bar – the bar is its button, a chevron at its end -->
  <section :aria-labelledby="titleId" class="section-card" :class="{ 'section-card--closed': collapsible && !open }">
    <header class="section-card__head">
      <component
        :is="collapsible ? 'button' : 'div'"
        :aria-controls="collapsible ? bodyId : undefined"
        :aria-expanded="collapsible ? open : undefined"
        class="section-card__label"
        :type="collapsible ? 'button' : undefined"
        @click="collapsible && (open = !open)"
      >
        <span v-if="icon" class="section-card__icon"><component :is="icon" /></span>
        <span :id="titleId" class="section-card__title">{{ title }}</span>
        <span v-if="note" class="faint section-card__note">{{ note }}</span>
        <ChevronDown v-if="collapsible" class="section-card__chevron" />
      </component>

      <div v-if="$slots.actions" class="section-card__actions"><slot name="actions" /></div>
    </header>

    <div v-show="!collapsible || open" :id="bodyId" class="section-card__body"><slot /></div>
  </section>
</template>

<script lang="ts" setup>
  import { ChevronDown } from 'lucide-vue-next'
  import { type Component, useId } from 'vue'

  /** A section of a dialog's tab: production, staging … in Dostęp – usable in any tab. */
  withDefaults(defineProps<{
    title: string
    icon?: Component
    /** a remark after the name, in grey */
    note?: string
    /** folds to its header bar – `open` says whether it is unfolded */
    collapsible?: boolean
  }>(), { icon: undefined, note: undefined, collapsible: false })

  const open = defineModel<boolean>('open', { default: true })

  const titleId = useId()
  const bodyId = useId()
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
  min-height: 36px;
  padding: 6px 16px;
  border-bottom: 1px solid var(--line);
  background: var(--panel);
}

/* the icon, the name, the remark – a button on a collapsible card, the chevron pushed to its end */
.section-card__label {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  text-align: left;
}

button.section-card__label {
  cursor: pointer;
}

button.section-card__label:focus-visible {
  border-radius: var(--radius-sm);
  box-shadow: var(--focus-ring);
  outline: none;
}

/* the name in the text's colour, not bold */
.section-card__title {
  font-size: 13px;
  font-weight: 400;
}

.section-card__chevron {
  width: 14px;
  height: 14px;
  margin-left: auto;
  color: var(--text-3);
  transform: rotate(180deg);
  transition: transform .15s;
}

/* folded: the chevron down, no line under the bar */
.section-card--closed .section-card__chevron {
  transform: none;
}

.section-card--closed .section-card__head {
  border-bottom: 0;
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

/* the icon plain, in the label's grey – no patch of colour behind it */
.section-card__icon {
  display: inline-flex;
  flex: none;
  color: var(--text-2);
}

.section-card__icon svg {
  width: 14px;
  height: 14px;
  stroke-width: 2.25;
}

.section-card__body {
  display: grid;
  gap: 12px;
  padding: 14px 16px 16px;
}
</style>

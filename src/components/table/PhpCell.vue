<template>
  <!-- the version in its status's colour; the tooltip: what that means, the branch's newest release and support, the
       limits the site runs with – it can be entered, to select and copy them -->
  <HoverTip v-if="project.php" anchor-class="php-hit" interactive>
    <span class="mono php" :class="`php--${status.tone}`" tabindex="0">{{ project.php }}</span>

    <template #tip>
      <div class="report-tip__title">
        <strong>PHP {{ project.phpVersion ?? project.php }}</strong>
        <span class="php" :class="`php--${status.tone}`">{{ STATUS_TEXT[status.tone] }}</span>
      </div>

      <dl class="info-tip info-tip--right info-tip--after">
        <template v-if="status.info?.latest">
          <dt>Najnowsza {{ status.branch }}</dt>
          <dd class="mono" :class="{ 'php--outdated': status.tone === 'outdated' }">{{ status.info.latest }}</dd>
        </template>

        <template v-if="status.info?.activeEnd">
          <dt>Aktywne wsparcie</dt>
          <dd><span class="mono">do {{ formatDay(status.info.activeEnd) }}</span> <span v-if="ended(status.info.activeEnd)" class="faint">(minęło)</span></dd>
        </template>

        <template v-if="status.info?.securityEnd">
          <dt>Poprawki bezpieczeństwa</dt>
          <dd><span class="mono" :class="{ 'php--eol': ended(status.info.securityEnd) }">do {{ formatDay(status.info.securityEnd) }}</span> <span v-if="!ended(status.info.securityEnd)" class="faint">({{ daysTo(status.info.securityEnd) }} dni)</span></dd>
        </template>

        <template v-if="project.phpSapi">
          <dt>SAPI</dt>
          <dd class="mono">{{ project.phpSapi }}</dd>
        </template>

        <template v-for="(value, key) in project.phpIni ?? {}" :key="key">
          <dt class="mono">{{ key }}</dt>
          <dd class="mono">{{ value === '' ? '–' : value }}</dd>
        </template>
      </dl>

      <p v-if="!project.phpVersion" class="faint php-note">Pełna wersja i limity – po raporcie z plugin_meden 1.19.0 / MK Core.</p>
    </template>
  </HoverTip>
</template>

<script lang="ts" setup>
  import type { Project } from '@/types'
  import { computed } from 'vue'
  import HoverTip from '@/components/ui/HoverTip.vue'
  import { config } from '@/config'
  import { formatDay, phpStatus } from '@/utils/projects'

  /** The "PHP" cell: green – the branch's newest release; orange – the same, its support ending within half a year; red – unpatched or unsupported. */
  const props = defineProps<{ project: Project }>()

  const status = computed(() => phpStatus(props.project, config.phpBranches ?? {}))

  // ok and ending: the branch's own state says the rest (full support, or security fixes only)
  const STATUS_TEXT = computed(() => ({
    ok: status.value.info?.state === 'stable' ? 'aktualna, pełne wsparcie' : 'aktualna, tylko poprawki bezpieczeństwa',
    ending: 'aktualna, wsparcie kończy się wkrótce',
    outdated: 'nieaktualna – brak poprawek',
    eol: 'bez wsparcia',
    unknown: 'stan nieznany',
  }))

  const ended = (day: string) => new Date(day).getTime() < Date.now()
  const daysTo = (day: string) => Math.ceil((new Date(day).getTime() - Date.now()) / 86_400_000)
</script>

<style scoped>
.php {
  outline: none;
}

.php--ok {
  color: var(--positive);
}

.php--ending {
  color: var(--warn);
}

.php--outdated,
.php--eol {
  color: var(--danger);
  font-weight: 600;
}

.php-note {
  margin: 6px 0 0;
  font-size: 11px;
}
</style>

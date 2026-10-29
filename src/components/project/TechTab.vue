<template>
  <div class="stack">
    <label class="field">
      <span>Silnik <span class="reported-mark">*</span></span>

      <SelectField
        :disabled="locked('engine')"
        label="Silnik"
        :model-value="form.engine || null"
        :options="engineOptions"
        @update:model-value="form.engine = $event ?? ''"
      />
    </label>

    <label class="field">
      <span>Wersja <span class="reported-mark">*</span></span>

      <SelectField
        custom
        :disabled="locked('version')"
        label="Wersja"
        :model-value="form.version || null"
        :options="versionOptions"
        searchable
        @update:model-value="form.version = $event ?? ''"
      >
        <template #option="{ option }"><span class="mono">{{ option.label }}</span></template>
      </SelectField>
    </label>

    <label class="field">
      <span>Motyw <span class="reported-mark">*</span></span>
      <input v-model.trim="form.theme" class="input" :disabled="locked('theme')" type="text">
    </label>

    <label class="field">
      <span>PHP <span class="reported-mark">*</span></span>

      <SelectField
        custom
        :disabled="locked('php')"
        label="PHP"
        :model-value="form.php || null"
        :options="phpOptions"
        searchable
        @update:model-value="form.php = $event ?? ''"
      >
        <template #option="{ option }"><span class="mono">{{ option.label }}</span></template>
      </SelectField>
    </label>
  </div>
</template>

<script lang="ts" setup>
  import { computed } from 'vue'
  import { useProjectForm } from '@/components/project/form'
  import SelectField from '@/components/ui/SelectField.vue'
  import { config } from '@/config'
  import { useProjectsStore } from '@/stores/projects'

  /** "Technologia": the engine, its version, the theme, PHP */
  const { form, locked } = useProjectForm()
  const projects = useProjectsStore()

  /** what's known, newest first – with the project's own value, even an unusual one, so it isn't lost */
  function versions (...values: Array<string | null | undefined>): Array<{ value: string, label: string }> {
    return [...new Set(values.filter((value): value is string => typeof value === 'string' && value !== ''))]
      .toSorted((a, b) => b.localeCompare(a, undefined, { numeric: true }))
      .map(value => ({ value, label: value }))
  }

  const engineOptions = computed(() => versions('wordpress', form.value.engine).toSorted((a, b) => a.value === 'wordpress' ? -1 : (b.value === 'wordpress' ? 1 : 0)))
  // every WordPress since 5.0, plus what the projects run (an older one isn't lost)
  const versionOptions = computed(() => versions(projects.latestWordpress, ...config.wordpressVersions, form.value.version, ...projects.items.map(item => item.version)))
  const phpOptions = computed(() => versions('7.4', '8.0', '8.1', '8.2', '8.3', '8.4', '8.5', form.value.php, ...projects.items.map(item => item.php)))
</script>

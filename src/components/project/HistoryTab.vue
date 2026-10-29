<template>
  <p v-if="!project" class="faint">Historia pojawi się po utworzeniu projektu.</p>
  <p v-else-if="loading && !history" class="faint">Wczytuję historię…</p>

  <p v-else-if="!history || (!history.targets.home && !history.targets.staging && history.events.length === 0)" class="faint">
    Lista jeszcze nie sprawdzała tej strony – historia zbiera się od teraz, co 5 minut.
  </p>

  <template v-else>
    <section v-for="item in targets" :key="item.key" class="target">
      <h3 class="eyebrow">{{ item.label }}</h3>

      <!-- the availability over three periods and the response time – numbers, not a chart -->
      <dl class="tiles">
        <div v-for="tile in tilesOf(item.data)" :key="tile.label" class="tile">
          <dt>{{ tile.label }}</dt>
          <dd class="mono" :class="tile.tone && `tile--${tile.tone}`">{{ tile.value }}</dd>
        </div>
      </dl>

      <!-- the response time of the last 24 hours, half-hour bars; a half-hour with a failed check in red -->
      <figure class="chart">
        <figcaption class="chart__head">
          <span>Czas odpowiedzi – ostatnie 24 h</span>
          <span v-if="item.bars.some(bar => bar.down > 0)" class="chart__key"><span class="chart__swatch" /> niedostępna</span>
        </figcaption>

        <svg
          :aria-label="`Czas odpowiedzi: ${item.label}, ostatnie 24 godziny`"
          class="chart__plot"
          preserveAspectRatio="none"
          role="img"
          :viewBox="`0 0 ${WIDTH} ${HEIGHT}`"
        >
          <line
            class="chart__grid"
            x1="0"
            :x2="WIDTH"
            :y1="HEIGHT - 0.5"
            :y2="HEIGHT - 0.5"
          />

          <line
            class="chart__grid chart__grid--top"
            x1="0"
            :x2="WIDTH"
            y1="0.5"
            y2="0.5"
          />

          <g
            v-for="(bar, index) in item.bars"
            :key="index"
            v-tip="barText(bar)"
            class="chart__bar"
            tabindex="-1"
          >
            <!-- the whole column is the hover target, bigger than the bar -->
            <rect
              class="chart__hit"
              :height="HEIGHT"
              :width="barWidth + GAP"
              :x="index * (barWidth + GAP) - GAP / 2"
              y="0"
            />

            <path v-if="bar.down > 0" class="chart__down" :d="column(index, HEIGHT)" />
            <path v-else-if="bar.ms !== null" class="chart__ms" :d="column(index, (bar.ms / item.scale) * HEIGHT)" />
          </g>
        </svg>

        <div class="chart__axis faint mono">
          <span>{{ formatTime(item.bars[0]?.from) }}</span>
          <span>skala: {{ formatMs(item.scale) }}</span>
          <span>teraz</span>
        </div>
      </figure>

      <!-- the outages of 30 days -->
      <div v-if="item.data.outages.length > 0" class="outages">
        <div class="outages__head faint">Niedostępność – 30 dni</div>

        <ul class="rows">
          <li v-for="outage in item.data.outages" :key="outage.from" class="row">
            <span class="mono row__when">{{ formatDateTime(outage.from) }}</span>
            <span class="row__what">{{ outageText(outage) }}</span>
            <span class="mono row__extra" :class="{ 'row__extra--open': !outage.to }">{{ outage.to ? formatDuration(outage.minutes) : `trwa ${formatDuration(outage.minutes)}` }}</span>
          </li>
        </ul>
      </div>

      <p v-else class="faint">Bez niedostępności w ostatnich 30 dniach.</p>
    </section>

    <!-- what changed: down and back, versions, plugins, users – as the reports brought it -->
    <section class="target">
      <h3 class="eyebrow">Zmiany <span class="group__note">– 90 dni</span></h3>

      <ul v-if="history.events.length > 0" class="rows rows--events">
        <li v-for="(event, index) in history.events" :key="index" class="row" :class="eventTone(event) && `row--${eventTone(event)}`">
          <span class="mono row__when">{{ formatDateTime(event.at) }}</span>
          <span class="row__what">{{ describeEvent(event) }}</span>
        </li>
      </ul>

      <p v-else class="faint">Jeszcze nic się nie zmieniło.</p>
    </section>
  </template>
</template>

<script lang="ts" setup>
  import type { HistoryEvent, Outage, ProjectHistory, TargetHistory } from '@/types'
  import { computed, ref, watch } from 'vue'
  import { projectsApi } from '@/api/projects'
  import { useProjectForm } from '@/components/project/form'
  import { vTip } from '@/directives/tip'
  import { type Bucket, buckets, describeEvent, formatDuration, formatMs, formatUptime } from '@/utils/history'
  import { formatDateTime, stagingCheck } from '@/utils/projects'

  /** "Historia": the home page's and staging's availability and response times, the outages, what changed */
  const props = defineProps<{ active: boolean }>()
  const { project } = useProjectForm()

  const history = ref<ProjectHistory | null>(null)
  const loading = ref(false)
  /** which project the history is of – fetched once it is shown, again for another project */
  let loadedFor: number | null = null

  watch(() => [props.active, project.value?.id] as const, async ([active, id]) => {
    if (id === undefined) {
      history.value = null
      loadedFor = null

      return
    }

    if (!active || loadedFor === id) {
      return
    }

    loadedFor = id
    history.value = null
    loading.value = true
    const fetched = await projectsApi.history(id).catch(() => null)

    if (loadedFor === id) {
      history.value = fetched
      loading.value = false
    }
  }, { immediate: true })

  // the chart's geometry, in the viewBox's units – it stretches to the tab's width
  const WIDTH = 480
  const HEIGHT = 72
  const GAP = 2
  const COUNT = 48
  const barWidth = (WIDTH - GAP * (COUNT - 1)) / COUNT

  /** a bar from the baseline up, its top corners rounded */
  function column (index: number, height: number): string {
    const h = Math.max(height, 2)
    const x = index * (barWidth + GAP)
    const r = Math.min(2, barWidth / 2, h)

    return `M${x},${HEIGHT} V${HEIGHT - h + r} Q${x},${HEIGHT - h} ${x + r},${HEIGHT - h} H${x + barWidth - r} Q${x + barWidth},${HEIGHT - h} ${x + barWidth},${HEIGHT - h + r} V${HEIGHT} Z`
  }

  /** the bars' top – the slowest half-hour, rounded up to a whole 250 ms */
  function scaleOf (bars: Bucket[]): number {
    const slowest = Math.max(0, ...bars.map(bar => bar.ms ?? 0))

    return Math.max(250, Math.ceil(slowest / 250) * 250)
  }

  const targets = computed(() => {
    const all = history.value?.targets ?? {}

    return ([['home', 'Strona'], ['staging', 'Staging']] as const)
      .filter(([key]) => all[key])
      .map(([key, label]) => {
        const data = all[key] as TargetHistory
        const bars = buckets(data.recent, new Date(), COUNT)

        return { key, label, data, bars, scale: scaleOf(bars) }
      })
  })

  /** below 99 % the availability is worth a look, below 95 % it is bad */
  function uptimeTone (value: number | null): string | null {
    if (value === null) {
      return null
    }

    return value < 95 ? 'bad' : (value < 99 ? 'warn' : null)
  }

  function tilesOf (data: TargetHistory): Array<{ label: string, value: string, tone: string | null }> {
    return [
      { label: 'Dostępność 24 h', value: formatUptime(data.uptime.day), tone: uptimeTone(data.uptime.day) },
      { label: '7 dni', value: formatUptime(data.uptime.week), tone: uptimeTone(data.uptime.week) },
      { label: '30 dni', value: formatUptime(data.uptime.month), tone: uptimeTone(data.uptime.month) },
      { label: 'Czas odpowiedzi 24 h', value: formatMs(data.ms), tone: null },
      { label: '7 dni', value: formatMs(data.msWeek), tone: null },
    ]
  }

  const formatTime = (date: Date | undefined) => date ? formatDateTime(date.toISOString()).slice(-5) : ''

  function barText (bar: Bucket): string | undefined {
    if (bar.total === 0) {
      return undefined
    }

    const when = `${formatTime(bar.from)}–${formatTime(new Date(bar.from.getTime() + 30 * 60_000))}`

    return bar.down > 0
      ? `${when} · niedostępna (${bar.down} z ${bar.total} sprawdzeń)`
      : `${when} · ${formatMs(bar.ms)}`
  }

  /** why it was down – as the staging's check says it */
  const outageText = (outage: Outage) => stagingCheck({ code: outage.code, checkedAt: outage.from, error: outage.error ?? undefined }).text

  /** down in red, back in green, a new administrator orange */
  function eventTone (event: HistoryEvent): string | null {
    if (event.type === 'status') {
      return event.data.to === 'offline' ? 'bad' : (event.data.to === 'online' ? 'ok' : null)
    }

    return event.data.what === 'role' && event.data.role === 'administrator' && Number(event.data.to) > Number(event.data.from) ? 'warn' : null
  }
</script>

<style scoped>
.target {
  display: grid;
  gap: 10px;
}

.target + .target {
  padding-top: 14px;
  border-top: 1px solid var(--line);
}

.target h3 {
  margin: 0;
}

/* the numbers: availability over three periods, response times */
.tiles {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 8px;
  margin: 0;
}

.tile {
  padding: 8px 10px;
  border: 1px solid var(--line);
  border-radius: var(--radius);
}

.tile dt {
  color: var(--text-3);
  font-size: 11px;
}

.tile dd {
  margin: 2px 0 0;
  color: var(--text);
  font-size: 16px;
  font-weight: 600;
}

.tile dd.tile--warn {
  color: var(--warn);
}

.tile dd.tile--bad {
  color: var(--danger);
}

.chart {
  display: grid;
  gap: 6px;
  margin: 0;
}

.chart__head {
  display: flex;
  justify-content: space-between;
  color: var(--text-2);
  font-size: 12px;
}

.chart__key {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.chart__swatch {
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: var(--danger);
}

.chart__plot {
  width: 100%;
  height: 72px;
  overflow: visible;
}

.chart__grid {
  stroke: var(--line);
  stroke-width: 1;
  vector-effect: non-scaling-stroke;
}

.chart__grid--top {
  stroke-dasharray: 2 3;
}

.chart__hit {
  fill: transparent;
}

.chart__ms {
  fill: var(--info);
}

.chart__down {
  fill: var(--danger);
  opacity: .8;
}

.chart__bar:hover .chart__ms,
.chart__bar:hover .chart__down {
  opacity: .7;
}

.chart__bar {
  outline: none;
}

.chart__axis {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
}

/* the outages and the changes: when, what, how long */
.outages {
  display: grid;
  gap: 6px;
}

.outages__head {
  font-size: 12px;
}

.rows {
  display: grid;
  max-height: 240px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  border: 1px solid var(--line);
  border-radius: var(--radius);
  font-size: 13px;
  list-style: none;
}

.rows--events {
  max-height: 320px;
}

.row {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 6px 10px;
  border-bottom: 1px solid var(--line);
}

.row:last-child {
  border-bottom: 0;
}

.row__when {
  flex: none;
  color: var(--text-3);
  font-size: 12px;
}

.row__what {
  flex: 1;
  min-width: 0;
}

.row__extra {
  flex: none;
  color: var(--text-2);
  font-size: 12px;
}

.row__extra--open,
.row--bad .row__what {
  color: var(--danger);
}

.row--ok .row__what {
  color: var(--positive);
}

.row--warn .row__what {
  color: var(--warn);
}

@media (max-width: 640px) {
  .tiles {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>

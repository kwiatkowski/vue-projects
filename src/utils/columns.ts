/**
 * The list's columns, in the table's order (its cells follow it – keep the two the same), with their section – for the table and the "Wyświetl" dialog. `private` ones never go to
 * the public list (access data, the owner's own work): the server doesn't send their data to anyone else.
 */
export const COLUMN_KEYS = [
  'name', 'status', 'uptime', 'server', 'php', 'engine', 'theme', 'repo', 'deploy', 'bedrock', 'security',
  'local', 'stage', 'acf', 'miModal', 'todo', 'report',
] as const

export type ColumnKey = typeof COLUMN_KEYS[number]

export interface ColumnDef {
  key: ColumnKey
  label: string
  section: string
  /** only for the owner */
  private?: true
}

export const COLUMNS: ColumnDef[] = [
  { key: 'name', label: 'Projekt', section: 'Podstawowe' },
  { key: 'status', label: 'Status', section: 'Podstawowe' },
  { key: 'uptime', label: 'Dostępność', section: 'Podstawowe' },
  { key: 'server', label: 'Serwer', section: 'Podstawowe', private: true },
  { key: 'php', label: 'PHP', section: 'Podstawowe' },
  { key: 'engine', label: 'Silnik', section: 'Podstawowe' },
  { key: 'theme', label: 'Motyw', section: 'Podstawowe' },
  { key: 'repo', label: 'Repo', section: 'Konfiguracja', private: true },
  { key: 'deploy', label: 'Deploy', section: 'Konfiguracja' },
  { key: 'bedrock', label: 'Bedrock', section: 'Konfiguracja' },
  { key: 'security', label: 'Security', section: 'Konfiguracja' },
  { key: 'local', label: 'Local', section: 'Środowiska', private: true },
  { key: 'stage', label: 'Stage', section: 'Środowiska', private: true },
  { key: 'acf', label: 'ACF', section: 'Konfiguracja' },
  { key: 'miModal', label: 'MI Modal', section: 'Konfiguracja' },
  { key: 'todo', label: 'Todo', section: 'Praca', private: true },
  { key: 'report', label: 'Raport', section: 'Praca', private: true },
]

/** the public list until the owner chooses */
export const PUBLIC_DEFAULT: ColumnKey[] = ['name', 'status', 'engine', 'theme']

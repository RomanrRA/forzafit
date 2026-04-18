'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Scale, Plus, Trash2, Bell, BellOff, Settings, Pencil, Check, Upload } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import { loadEncryptedJson } from '@/lib/crypto'
import {
  useBodyMeasurements,
  useCreateBodyMeasurement,
  useUpdateBodyMeasurement,
  useDeleteBodyMeasurement,
  type BodyMeasurement,
} from '@/hooks/use-body-measurements'

// Custom field definition (persists across sessions)
interface CustomFieldDef {
  id: string
  name: string
  unit: string
}

// Legacy localStorage entry format
interface LegacyBodyEntry {
  id: string
  date: string
  weightKg: number | null
  bodyFatPct: number | null
  chestCm: number | null
  waistCm: number | null
  hipsCm: number | null
  armCm: number | null
  custom: { fieldId: string; name: string; value: number; unit: string }[]
}

interface BodyReminderSettings {
  enabled: boolean
  intervalDays: number
}

type BodyGoal = 'gain' | 'lose'

interface BodyMetricSetting {
  visible: boolean
  goal: BodyGoal
}

interface BodyWidgetSettings {
  [key: string]: BodyMetricSetting
}

const STANDARD_METRICS = [
  { key: 'weightKg', label: 'Вес', unit: 'кг' },
  { key: 'bodyFatPct', label: '% жира', unit: '%' },
  { key: 'chestCm', label: 'Грудь', unit: 'см' },
  { key: 'waistCm', label: 'Талия', unit: 'см' },
  { key: 'hipsCm', label: 'Бёдра', unit: 'см' },
  { key: 'armCm', label: 'Рука', unit: 'см' },
]

const STORAGE_KEY = 'fitlog_body_measurements'
const FIELDS_KEY  = 'fitlog_custom_fields'
const MIGRATED_KEY = 'fitlog_body_migrated_to_db'
const MIGRATED_IDS_KEY = 'fitlog_body_migrated_ids'
const REMINDER_SETTINGS_KEY = 'fitlog_body_reminder_settings'
const WIDGET_SETTINGS_KEY = 'fitlog_body_widget_settings'
const DEFAULT_REMINDER: BodyReminderSettings = { enabled: true, intervalDays: 21 }

const DEFAULT_WIDGET_SETTINGS: BodyWidgetSettings = {
  weightKg: { visible: true, goal: 'lose' },
  bodyFatPct: { visible: true, goal: 'lose' },
  chestCm: { visible: false, goal: 'gain' },
  waistCm: { visible: true, goal: 'lose' },
  hipsCm: { visible: false, goal: 'lose' },
  armCm: { visible: false, goal: 'gain' },
}

const REMINDER_OPTIONS = [
  { value: 7, label: 'Раз в неделю' },
  { value: 14, label: 'Раз в 2 недели' },
  { value: 21, label: 'Раз в 3 недели' },
  { value: 30, label: 'Раз в месяц' },
]

const EMPTY_STANDARD = {
  date: new Date().toISOString().split('T')[0],
  weightKg: '', bodyFatPct: '', chestCm: '', waistCm: '', hipsCm: '', armCm: '',
}

export default function BodyPage() {
  const userId = useAuthStore((s) => s.user?.id ?? 'anon')
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([])
  const [showForm, setShowForm] = useState(false)
  const [reminderSettings, setReminderSettings] = useState<BodyReminderSettings>(DEFAULT_REMINDER)
  const [showReminderSettings, setShowReminderSettings] = useState(false)
  const [widgetSettings, setWidgetSettings] = useState<BodyWidgetSettings>(DEFAULT_WIDGET_SETTINGS)
  const [showChartSettings, setShowChartSettings] = useState(false)
  const [chartMetric, setChartMetric] = useState('weightKg')

  // API hooks
  const { data, isLoading } = useBodyMeasurements({ limit: 200 })
  const createMutation = useCreateBodyMeasurement()
  const updateMutation = useUpdateBodyMeasurement()
  const deleteMutation = useDeleteBodyMeasurement()

  // Entries sorted by date ascending
  const entries = useMemo(() => {
    if (!data?.items) return []
    return [...data.items].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [data])

  // Все метрики = стандартные + кастомные
  const allMetrics = useMemo(() => {
    const custom = customFields.map((f) => ({
      key: `custom_${f.id}`,
      label: f.name,
      unit: f.unit,
    }))
    return [...STANDARD_METRICS, ...custom]
  }, [customFields])

  // Standard fields form state
  const [form, setForm] = useState(EMPTY_STANDARD)
  // Custom fields values in the form: { [fieldId]: string }
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  // New custom field being defined
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldUnit, setNewFieldUnit] = useState('')
  const [showAddField, setShowAddField] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<{
    date: string; weightKg: string; bodyFatPct: string; chestCm: string; waistCm: string; hipsCm: string; armCm: string
    custom: Record<string, string>
  } | null>(null)

  // Migration from localStorage
  const [migrating, setMigrating] = useState(false)
  const [hasLocalData, setHasLocalData] = useState(false)
  const migrationChecked = useRef(false)

  useEffect(() => {
    // Custom field definitions — plain localStorage
    try {
      const raw = localStorage.getItem(FIELDS_KEY)
      if (raw) setCustomFields(JSON.parse(raw))
    } catch {}
    try {
      const raw = localStorage.getItem(REMINDER_SETTINGS_KEY)
      if (raw) setReminderSettings(JSON.parse(raw))
    } catch {}
    try {
      const raw = localStorage.getItem(WIDGET_SETTINGS_KEY)
      if (raw) setWidgetSettings({ ...DEFAULT_WIDGET_SETTINGS, ...JSON.parse(raw) })
    } catch {}
  }, [])

  // Check for local data to migrate
  useEffect(() => {
    if (migrationChecked.current || userId === 'anon') return
    migrationChecked.current = true
    const alreadyMigrated = localStorage.getItem(MIGRATED_KEY)
    if (alreadyMigrated) return
    loadEncryptedJson<LegacyBodyEntry>(STORAGE_KEY, userId).then((localEntries) => {
      if (localEntries.length > 0) {
        setHasLocalData(true)
      }
    })
  }, [userId])

  async function migrateFromLocalStorage() {
    setMigrating(true)
    // Per-entry progress — если миграция упадёт в середине, повтор пропустит
    // уже успешные записи и не создаст дубликаты на бэкенде.
    const alreadyMigrated = new Set<string>(
      JSON.parse(localStorage.getItem(MIGRATED_IDS_KEY) ?? '[]') as string[],
    )
    const localEntries = await loadEncryptedJson<LegacyBodyEntry>(STORAGE_KEY, userId)
    let migrated = 0
    let failed = 0
    for (const entry of localEntries) {
      if (alreadyMigrated.has(entry.id)) continue
      try {
        await createMutation.mutateAsync({
          date: new Date(entry.date).toISOString(),
          weightKg: entry.weightKg ?? undefined,
          bodyFatPct: entry.bodyFatPct ?? undefined,
          chestCm: entry.chestCm ?? undefined,
          waistCm: entry.waistCm ?? undefined,
          hipsCm: entry.hipsCm ?? undefined,
          armCm: entry.armCm ?? undefined,
          custom: entry.custom?.length ? entry.custom : undefined,
        })
        alreadyMigrated.add(entry.id)
        localStorage.setItem(MIGRATED_IDS_KEY, JSON.stringify([...alreadyMigrated]))
        migrated++
      } catch {
        failed++
      }
    }
    setMigrating(false)
    if (failed === 0) {
      localStorage.setItem(MIGRATED_KEY, 'true')
      localStorage.removeItem(MIGRATED_IDS_KEY)
      setHasLocalData(false)
      toast({ title: `Перенесено ${migrated} замеров в облако` })
    } else {
      toast({
        variant: 'destructive',
        title: `Перенесено ${migrated}, ошибок: ${failed}`,
        description: 'Нажмите «Перенести» ещё раз — пропущенные попробуем снова',
      })
    }
  }

  function updateWidgetSettings(next: BodyWidgetSettings) {
    setWidgetSettings(next)
    localStorage.setItem(WIDGET_SETTINGS_KEY, JSON.stringify(next))
  }

  function saveReminderSettings(settings: BodyReminderSettings) {
    setReminderSettings(settings)
    localStorage.setItem(REMINDER_SETTINGS_KEY, JSON.stringify(settings))
    toast({ title: settings.enabled ? `Напоминание: ${REMINDER_OPTIONS.find(o => o.value === settings.intervalDays)?.label ?? `каждые ${settings.intervalDays} дн.`}` : 'Напоминания отключены' })
  }

  function saveFields(fields: CustomFieldDef[]) {
    setCustomFields(fields)
    localStorage.setItem(FIELDS_KEY, JSON.stringify(fields))
  }

  function handleAddField() {
    if (!newFieldName.trim()) {
      toast({ variant: 'destructive', title: 'Введите название поля' })
      return
    }
    const field: CustomFieldDef = {
      id: Date.now().toString(),
      name: newFieldName.trim(),
      unit: newFieldUnit.trim(),
    }
    saveFields([...customFields, field])
    setNewFieldName('')
    setNewFieldUnit('')
    setShowAddField(false)
  }

  function handleRemoveField(id: string) {
    saveFields(customFields.filter((f) => f.id !== id))
    setCustomValues((prev) => { const next = { ...prev }; delete next[id]; return next })
  }

  function handleAdd() {
    const hasStandard = form.weightKg || form.bodyFatPct || form.chestCm ||
      form.waistCm || form.hipsCm || form.armCm
    const hasCustom = Object.values(customValues).some(Boolean)
    if (!hasStandard && !hasCustom) {
      toast({ variant: 'destructive', title: 'Введите хотя бы одно значение' })
      return
    }

    const custom = customFields
      .filter((f) => customValues[f.id])
      .map((f) => ({ fieldId: f.id, name: f.name, value: Number(customValues[f.id]), unit: f.unit }))

    createMutation.mutate({
      date: new Date(form.date).toISOString(),
      weightKg: form.weightKg ? Number(form.weightKg) : undefined,
      bodyFatPct: form.bodyFatPct ? Number(form.bodyFatPct) : undefined,
      chestCm: form.chestCm ? Number(form.chestCm) : undefined,
      waistCm: form.waistCm ? Number(form.waistCm) : undefined,
      hipsCm: form.hipsCm ? Number(form.hipsCm) : undefined,
      armCm: form.armCm ? Number(form.armCm) : undefined,
      custom: custom.length ? custom : undefined,
    }, {
      onSuccess: () => {
        setShowForm(false)
        setForm({ ...EMPTY_STANDARD, date: new Date().toISOString().split('T')[0] })
        setCustomValues({})
        toast({ title: 'Замер сохранён' })
      },
    })
  }

  function handleDelete(id: string) {
    if (editingId === id) { setEditingId(null); setEditForm(null) }
    deleteMutation.mutate(id)
  }

  function startEdit(entry: BodyMeasurement) {
    setEditingId(entry.id)
    const custom: Record<string, string> = {}
    entry.custom?.forEach((c) => { custom[c.fieldId] = String(c.value) })
    const dateStr = entry.date.includes('T') ? entry.date.split('T')[0] : entry.date
    setEditForm({
      date: dateStr,
      weightKg: entry.weightKg?.toString() ?? '',
      bodyFatPct: entry.bodyFatPct?.toString() ?? '',
      chestCm: entry.chestCm?.toString() ?? '',
      waistCm: entry.waistCm?.toString() ?? '',
      hipsCm: entry.hipsCm?.toString() ?? '',
      armCm: entry.armCm?.toString() ?? '',
      custom,
    })
  }

  function saveEdit() {
    if (!editingId || !editForm) return
    const custom = customFields
      .filter((f) => editForm.custom[f.id])
      .map((f) => ({ fieldId: f.id, name: f.name, value: Number(editForm.custom[f.id]), unit: f.unit }))

    updateMutation.mutate({
      id: editingId,
      date: new Date(editForm.date).toISOString(),
      weightKg: editForm.weightKg ? Number(editForm.weightKg) : undefined,
      bodyFatPct: editForm.bodyFatPct ? Number(editForm.bodyFatPct) : undefined,
      chestCm: editForm.chestCm ? Number(editForm.chestCm) : undefined,
      waistCm: editForm.waistCm ? Number(editForm.waistCm) : undefined,
      hipsCm: editForm.hipsCm ? Number(editForm.hipsCm) : undefined,
      armCm: editForm.armCm ? Number(editForm.armCm) : undefined,
      custom: custom.length ? custom : undefined,
    }, {
      onSuccess: () => {
        setEditingId(null)
        setEditForm(null)
        toast({ title: 'Замер обновлён' })
      },
    })
  }

  const latest = entries[entries.length - 1]

  // Получить значение метрики из записи (стандартной или кастомной)
  function getMetricValue(entry: BodyMeasurement, key: string): number | null {
    if (key.startsWith('custom_')) {
      const fieldId = key.replace('custom_', '')
      const found = entry.custom?.find((c) => c.fieldId === fieldId)
      return found?.value ?? null
    }
    return (entry[key as keyof BodyMeasurement] as number | null) ?? null
  }

  // Данные для графика — по выбранному показателю
  const selectedMetricDef = allMetrics.find((m) => m.key === chartMetric) ?? allMetrics[0]
  const metricGoal = widgetSettings[chartMetric]?.goal ?? 'lose'

  const chartData = useMemo(() => {
    return entries
      .filter((e) => getMetricValue(e, chartMetric) != null)
      .map((e) => ({
        date: format(new Date(e.date), 'd MMM', { locale: ru }),
        value: getMetricValue(e, chartMetric) as number,
      }))
  }, [entries, chartMetric, customFields])

  // Определяем цвет линии: тренд к цели = зелёный, от цели = оранжевый
  const chartColor = useMemo(() => {
    if (chartData.length < 2) return 'hsl(var(--primary))'
    const first = chartData[0].value
    const last = chartData[chartData.length - 1].value
    const delta = last - first
    if (delta === 0) return 'hsl(var(--primary))'
    const isGood = metricGoal === 'lose' ? delta < 0 : delta > 0
    return isGood ? '#22c55e' : '#f97316'
  }, [chartData, metricGoal])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold">Замеры тела</h1>
          <p className="text-sm text-muted-foreground hidden sm:block">Отслеживайте вес и обхваты</p>
        </div>
        <div className="flex gap-1.5 shrink-0">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setShowReminderSettings((v) => !v)}
            title="Настройки напоминаний"
          >
            {reminderSettings.enabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4 text-muted-foreground" />}
          </Button>
          <Button size="sm" className="sm:size-default" onClick={() => setShowForm(!showForm)}>
            <Plus className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">Добавить замер</span>
          </Button>
        </div>
      </div>

      {/* Migration banner */}
      {hasLocalData && (
        <Card className="border-amber-500/50 bg-amber-500/5">
          <CardContent className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium">Найдены локальные замеры</p>
              <p className="text-xs text-muted-foreground">Перенести данные из браузера в облако?</p>
            </div>
            <Button size="sm" onClick={migrateFromLocalStorage} disabled={migrating}>
              <Upload className="h-4 w-4 mr-1.5" />
              {migrating ? 'Переношу...' : 'Перенести'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Reminder settings */}
      {showReminderSettings && (
        <Card>
          <CardContent className="py-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Напоминания о замерах</p>
                <p className="text-xs text-muted-foreground">Показываются на дашборде</p>
              </div>
              <button
                onClick={() => saveReminderSettings({ ...reminderSettings, enabled: !reminderSettings.enabled })}
                className={`relative w-11 h-6 rounded-full transition-colors ${reminderSettings.enabled ? 'bg-primary' : 'bg-muted'}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${reminderSettings.enabled ? 'translate-x-5' : ''}`} />
              </button>
            </div>
            {reminderSettings.enabled && (
              <div className="flex flex-wrap gap-2">
                {REMINDER_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => saveReminderSettings({ enabled: true, intervalDays: opt.value })}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                      reminderSettings.intervalDays === opt.value
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Measurement form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Новый замер</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {/* Standard fields */}
              <div>
                <Label className="text-xs">Дата</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Вес, кг</Label>
                <Input type="number" inputMode="decimal" step="0.1" placeholder="75.5" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">% жира</Label>
                <Input type="number" inputMode="decimal" step="0.1" placeholder="15" value={form.bodyFatPct} onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Грудь, см</Label>
                <Input type="number" inputMode="decimal" placeholder="100" value={form.chestCm} onChange={(e) => setForm({ ...form, chestCm: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Талия, см</Label>
                <Input type="number" inputMode="decimal" placeholder="80" value={form.waistCm} onChange={(e) => setForm({ ...form, waistCm: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Бёдра, см</Label>
                <Input type="number" inputMode="decimal" placeholder="90" value={form.hipsCm} onChange={(e) => setForm({ ...form, hipsCm: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Рука, см</Label>
                <Input type="number" inputMode="decimal" placeholder="35" value={form.armCm} onChange={(e) => setForm({ ...form, armCm: e.target.value })} />
              </div>

              {/* Custom fields */}
              {customFields.map((field) => (
                <div key={field.id} className="relative">
                  <Label className="text-xs">{field.name}{field.unit ? `, ${field.unit}` : ''}</Label>
                  <div className="flex gap-1.5">
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      placeholder="0"
                      value={customValues[field.id] ?? ''}
                      onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 shrink-0 text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveField(field.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add new custom field */}
            {showAddField ? (
              <div className="border rounded-md p-3 space-y-2 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground">Новое поле</p>
                <div className="grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Название (Бицепс левый)"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                  />
                  <Input
                    placeholder="Единица (см, кг, %)"
                    value={newFieldUnit}
                    onChange={(e) => setNewFieldUnit(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddField}>Добавить</Button>
                  <Button size="sm" variant="ghost" onClick={() => setShowAddField(false)}>Отмена</Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowAddField(true)}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить своё поле
              </button>
            )}

            <div className="flex gap-2">
              <Button onClick={handleAdd} disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
              </Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setShowAddField(false) }}>Отмена</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current stats */}
      {latest && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {latest.weightKg && (
            <Card>
              <CardContent className="p-3 sm:pt-4 sm:pb-3 sm:px-6">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Scale className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs text-muted-foreground">Вес</span>
                </div>
                <div className="text-xl sm:text-2xl font-bold">{latest.weightKg} <span className="text-xs sm:text-sm font-normal text-muted-foreground">кг</span></div>
              </CardContent>
            </Card>
          )}
          {latest.bodyFatPct && (
            <Card>
              <CardContent className="p-3 sm:pt-4 sm:pb-3 sm:px-6">
                <div className="text-xs text-muted-foreground mb-0.5">% жира</div>
                <div className="text-xl sm:text-2xl font-bold">{latest.bodyFatPct}<span className="text-xs sm:text-sm font-normal text-muted-foreground">%</span></div>
              </CardContent>
            </Card>
          )}
          {latest.waistCm && (
            <Card>
              <CardContent className="p-3 sm:pt-4 sm:pb-3 sm:px-6">
                <div className="text-xs text-muted-foreground mb-0.5">Талия</div>
                <div className="text-xl sm:text-2xl font-bold">{latest.waistCm} <span className="text-xs sm:text-sm font-normal text-muted-foreground">см</span></div>
              </CardContent>
            </Card>
          )}
          {latest.chestCm && (
            <Card>
              <CardContent className="p-3 sm:pt-4 sm:pb-3 sm:px-6">
                <div className="text-xs text-muted-foreground mb-0.5">Грудь</div>
                <div className="text-xl sm:text-2xl font-bold">{latest.chestCm} <span className="text-xs sm:text-sm font-normal text-muted-foreground">см</span></div>
              </CardContent>
            </Card>
          )}
          {latest.custom?.map((c) => (
            <Card key={c.fieldId}>
              <CardContent className="p-3 sm:pt-4 sm:pb-3 sm:px-6">
                <div className="text-xs text-muted-foreground mb-0.5">{c.name}</div>
                <div className="text-xl sm:text-2xl font-bold">{c.value} <span className="text-xs sm:text-sm font-normal text-muted-foreground">{c.unit}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Chart with metric picker + goal settings */}
      {entries.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">График</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setShowChartSettings((v) => !v)}
              >
                <Settings className="h-4 w-4" />
              </Button>
            </div>
            {/* Metric picker chips */}
            <div className="flex flex-wrap gap-1.5 mt-2">
              {allMetrics.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setChartMetric(m.key)}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                    chartMetric === m.key
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </CardHeader>

          {/* Goal settings panel */}
          {showChartSettings && (
            <div className="px-6 pb-2">
              <div className="border rounded-lg p-3 bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground mb-2">Цели показателей</p>
                <div className="space-y-2">
                  {allMetrics.map((m) => {
                    const s = widgetSettings[m.key] ?? { visible: false, goal: 'lose' as BodyGoal }
                    return (
                      <div key={m.key} className="flex items-center justify-between gap-2">
                        <label className="flex items-center gap-2 min-w-0">
                          <input
                            type="checkbox"
                            checked={s.visible}
                            onChange={() => updateWidgetSettings({
                              ...widgetSettings,
                              [m.key]: { ...s, visible: !s.visible },
                            })}
                            className="rounded border-border"
                          />
                          <span className="text-sm">{m.label}</span>
                          <span className="text-[10px] text-muted-foreground">(дашборд)</span>
                        </label>
                        <div className="flex rounded-full bg-muted p-0.5 shrink-0">
                          <button
                            onClick={() => updateWidgetSettings({
                              ...widgetSettings,
                              [m.key]: { ...s, goal: 'lose' },
                            })}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                              s.goal === 'lose'
                                ? 'bg-green-500 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Снижение
                          </button>
                          <button
                            onClick={() => updateWidgetSettings({
                              ...widgetSettings,
                              [m.key]: { ...s, goal: 'gain' },
                            })}
                            className={`px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors ${
                              s.goal === 'gain'
                                ? 'bg-blue-500 text-white'
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            Набор
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

          <CardContent>
            {chartData.length > 1 ? (
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                  <Tooltip formatter={(value) => [`${value} ${selectedMetricDef.unit}`, selectedMetricDef.label]} />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={chartColor}
                    strokeWidth={2}
                    dot={{ r: 4, fill: chartColor }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-6">
                Недостаточно данных для графика «{selectedMetricDef.label}»
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* History */}
      {entries.length > 0 ? (
        <Card>
          <CardHeader className="p-3 sm:p-6 pb-2 sm:pb-3">
            <CardTitle className="text-sm sm:text-base">История замеров</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-6 pt-0 sm:pt-0">
            <div className="space-y-1">
              {[...entries].reverse().map((entry) => (
                <div key={entry.id} className="py-2 border-b last:border-0">
                  {editingId === entry.id && editForm ? (
                    /* ── Inline edit form ── */
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs">Дата</Label>
                          <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">Вес, кг</Label>
                          <Input type="number" inputMode="decimal" step="0.1" value={editForm.weightKg} onChange={(e) => setEditForm({ ...editForm, weightKg: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">% жира</Label>
                          <Input type="number" inputMode="decimal" step="0.1" value={editForm.bodyFatPct} onChange={(e) => setEditForm({ ...editForm, bodyFatPct: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">Грудь, см</Label>
                          <Input type="number" inputMode="decimal" value={editForm.chestCm} onChange={(e) => setEditForm({ ...editForm, chestCm: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">Талия, см</Label>
                          <Input type="number" inputMode="decimal" value={editForm.waistCm} onChange={(e) => setEditForm({ ...editForm, waistCm: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">Бёдра, см</Label>
                          <Input type="number" inputMode="decimal" value={editForm.hipsCm} onChange={(e) => setEditForm({ ...editForm, hipsCm: e.target.value })} />
                        </div>
                        <div>
                          <Label className="text-xs">Рука, см</Label>
                          <Input type="number" inputMode="decimal" value={editForm.armCm} onChange={(e) => setEditForm({ ...editForm, armCm: e.target.value })} />
                        </div>
                        {customFields.map((field) => (
                          <div key={field.id}>
                            <Label className="text-xs">{field.name}{field.unit ? `, ${field.unit}` : ''}</Label>
                            <Input
                              type="number"
                              inputMode="decimal"
                              step="0.1"
                              value={editForm.custom[field.id] ?? ''}
                              onChange={(e) => setEditForm({ ...editForm, custom: { ...editForm.custom, [field.id]: e.target.value } })}
                            />
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={saveEdit} disabled={updateMutation.isPending}>
                          <Check className="h-3.5 w-3.5 mr-1" />
                          {updateMutation.isPending ? 'Сохраняю...' : 'Сохранить'}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => { setEditingId(null); setEditForm(null) }}>
                          Отмена
                        </Button>
                      </div>
                    </div>
                  ) : (
                    /* ── Display mode ── */
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0">
                        <span className="text-xs sm:text-sm font-medium">
                          {format(new Date(entry.date), 'd MMM yyyy', { locale: ru })}
                        </span>
                        <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-0.5">
                          {entry.weightKg   && <span className="text-[11px] sm:text-xs text-muted-foreground">Вес: {entry.weightKg}</span>}
                          {entry.bodyFatPct && <span className="text-[11px] sm:text-xs text-muted-foreground">Жир: {entry.bodyFatPct}%</span>}
                          {entry.chestCm    && <span className="text-[11px] sm:text-xs text-muted-foreground">Грудь: {entry.chestCm}</span>}
                          {entry.waistCm    && <span className="text-[11px] sm:text-xs text-muted-foreground">Талия: {entry.waistCm}</span>}
                          {entry.hipsCm     && <span className="text-[11px] sm:text-xs text-muted-foreground">Бёдра: {entry.hipsCm}</span>}
                          {entry.armCm      && <span className="text-[11px] sm:text-xs text-muted-foreground">Рука: {entry.armCm}</span>}
                          {entry.custom?.map((c) => (
                            <span key={c.fieldId} className="text-[11px] sm:text-xs text-muted-foreground">{c.name}: {c.value}</span>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-0.5 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => startEdit(entry)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => handleDelete(entry.id)}
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <Scale className="h-12 w-12 mx-auto mb-3 opacity-20" />
          <p>Замеров пока нет</p>
          <p className="text-sm">Добавьте первый замер, чтобы начать отслеживание</p>
        </div>
      )}
    </div>
  )
}

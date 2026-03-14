'use client'

import { useState, useEffect, useCallback } from 'react'
import { format } from 'date-fns'
import { ru } from 'date-fns/locale'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Scale, Plus, Trash2, X } from 'lucide-react'
import { toast } from '@/hooks/use-toast'
import { useAuthStore } from '@/store/auth.store'
import { loadEncryptedJson, saveEncryptedJson } from '@/lib/crypto'

// Custom field definition (persists across sessions)
interface CustomFieldDef {
  id: string
  name: string
  unit: string
}

interface BodyEntry {
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

const STORAGE_KEY = 'fitlog_body_measurements'
const FIELDS_KEY  = 'fitlog_custom_fields'

const EMPTY_STANDARD = {
  date: new Date().toISOString().split('T')[0],
  weightKg: '', bodyFatPct: '', chestCm: '', waistCm: '', hipsCm: '', armCm: '',
}

export default function BodyPage() {
  const userId = useAuthStore((s) => s.user?.id ?? 'anon')
  const [entries, setEntries] = useState<BodyEntry[]>([])
  const [customFields, setCustomFields] = useState<CustomFieldDef[]>([])
  const [showForm, setShowForm] = useState(false)

  // Standard fields form state
  const [form, setForm] = useState(EMPTY_STANDARD)
  // Custom fields values in the form: { [fieldId]: string }
  const [customValues, setCustomValues] = useState<Record<string, string>>({})
  // New custom field being defined
  const [newFieldName, setNewFieldName] = useState('')
  const [newFieldUnit, setNewFieldUnit] = useState('')
  const [showAddField, setShowAddField] = useState(false)

  useEffect(() => {
    loadEncryptedJson<BodyEntry>(STORAGE_KEY, userId).then((data) =>
      setEntries(data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
    )
    // Custom field definitions are not sensitive — plain localStorage
    try {
      const raw = localStorage.getItem(FIELDS_KEY)
      if (raw) setCustomFields(JSON.parse(raw))
    } catch {}
  }, [userId])

  const persistEntries = useCallback(async (updated: BodyEntry[]) => {
    setEntries(updated)
    await saveEncryptedJson(STORAGE_KEY, updated, userId)
  }, [userId])

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

    const entry: BodyEntry = {
      id: Date.now().toString(),
      date: form.date,
      weightKg:   form.weightKg   ? Number(form.weightKg)   : null,
      bodyFatPct: form.bodyFatPct ? Number(form.bodyFatPct) : null,
      chestCm:    form.chestCm    ? Number(form.chestCm)    : null,
      waistCm:    form.waistCm    ? Number(form.waistCm)    : null,
      hipsCm:     form.hipsCm     ? Number(form.hipsCm)     : null,
      armCm:      form.armCm      ? Number(form.armCm)      : null,
      custom,
    }
    const sorted = [...entries, entry].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    persistEntries(sorted)
    setShowForm(false)
    setForm({ ...EMPTY_STANDARD, date: new Date().toISOString().split('T')[0] })
    setCustomValues({})
    toast({ title: 'Замер сохранён' })
  }

  function handleDelete(id: string) {
    persistEntries(entries.filter((e) => e.id !== id))
  }

  const weightData = entries
    .filter((e) => e.weightKg)
    .map((e) => ({ date: format(new Date(e.date), 'd MMM', { locale: ru }), weight: e.weightKg }))

  const latest = entries[entries.length - 1]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Замеры тела</h1>
          <p className="text-muted-foreground">Отслеживайте вес и обхваты</p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="h-4 w-4 mr-2" />
          Добавить замер
        </Button>
      </div>

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
                <Input type="number" step="0.1" placeholder="75.5" value={form.weightKg} onChange={(e) => setForm({ ...form, weightKg: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">% жира</Label>
                <Input type="number" step="0.1" placeholder="15" value={form.bodyFatPct} onChange={(e) => setForm({ ...form, bodyFatPct: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Грудь, см</Label>
                <Input type="number" placeholder="100" value={form.chestCm} onChange={(e) => setForm({ ...form, chestCm: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Талия, см</Label>
                <Input type="number" placeholder="80" value={form.waistCm} onChange={(e) => setForm({ ...form, waistCm: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Бёдра, см</Label>
                <Input type="number" placeholder="90" value={form.hipsCm} onChange={(e) => setForm({ ...form, hipsCm: e.target.value })} />
              </div>
              <div>
                <Label className="text-xs">Рука, см</Label>
                <Input type="number" placeholder="35" value={form.armCm} onChange={(e) => setForm({ ...form, armCm: e.target.value })} />
              </div>

              {/* Custom fields */}
              {customFields.map((field) => (
                <div key={field.id} className="relative">
                  <Label className="text-xs flex items-center justify-between">
                    <span>{field.name}{field.unit ? `, ${field.unit}` : ''}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(field.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Label>
                  <Input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={customValues[field.id] ?? ''}
                    onChange={(e) => setCustomValues({ ...customValues, [field.id]: e.target.value })}
                  />
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
              <Button onClick={handleAdd}>Сохранить</Button>
              <Button variant="outline" onClick={() => { setShowForm(false); setShowAddField(false) }}>Отмена</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Current stats */}
      {latest && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {latest.weightKg && (
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Scale className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Вес</span>
                </div>
                <div className="text-2xl font-bold">{latest.weightKg} <span className="text-sm font-normal text-muted-foreground">кг</span></div>
              </CardContent>
            </Card>
          )}
          {latest.bodyFatPct && (
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">% жира</div>
                <div className="text-2xl font-bold">{latest.bodyFatPct}<span className="text-sm font-normal text-muted-foreground">%</span></div>
              </CardContent>
            </Card>
          )}
          {latest.waistCm && (
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">Талия</div>
                <div className="text-2xl font-bold">{latest.waistCm} <span className="text-sm font-normal text-muted-foreground">см</span></div>
              </CardContent>
            </Card>
          )}
          {latest.chestCm && (
            <Card>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">Грудь</div>
                <div className="text-2xl font-bold">{latest.chestCm} <span className="text-sm font-normal text-muted-foreground">см</span></div>
              </CardContent>
            </Card>
          )}
          {latest.custom?.map((c) => (
            <Card key={c.fieldId}>
              <CardContent className="pt-4 pb-3">
                <div className="text-xs text-muted-foreground mb-1">{c.name}</div>
                <div className="text-2xl font-bold">{c.value} <span className="text-sm font-normal text-muted-foreground">{c.unit}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Weight chart */}
      {weightData.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">График веса</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={weightData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={['auto', 'auto']} />
                <Tooltip formatter={(value) => [`${value} кг`, 'Вес']} />
                <Line
                  type="monotone"
                  dataKey="weight"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* History */}
      {entries.length > 0 ? (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">История замеров</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {[...entries].reverse().map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <span className="text-sm font-medium">
                      {format(new Date(entry.date), 'd MMMM yyyy', { locale: ru })}
                    </span>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {entry.weightKg   && <span className="text-xs text-muted-foreground">Вес: {entry.weightKg} кг</span>}
                      {entry.bodyFatPct && <span className="text-xs text-muted-foreground">Жир: {entry.bodyFatPct}%</span>}
                      {entry.chestCm    && <span className="text-xs text-muted-foreground">Грудь: {entry.chestCm} см</span>}
                      {entry.waistCm    && <span className="text-xs text-muted-foreground">Талия: {entry.waistCm} см</span>}
                      {entry.hipsCm     && <span className="text-xs text-muted-foreground">Бёдра: {entry.hipsCm} см</span>}
                      {entry.armCm      && <span className="text-xs text-muted-foreground">Рука: {entry.armCm} см</span>}
                      {entry.custom?.map((c) => (
                        <span key={c.fieldId} className="text-xs text-muted-foreground">{c.name}: {c.value} {c.unit}</span>
                      ))}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(entry.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
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

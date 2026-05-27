import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'

export interface BodyMeasurement {
  id: string
  date: string
  weightKg: number | null
  bodyFatPct: number | null
  chestCm: number | null
  waistCm: number | null
  hipsCm: number | null
  armCm: number | null
  thighCm: number | null
  forearmCm: number | null
  calfCm: number | null
  neckCm: number | null
  custom: { fieldId: string; name: string; value: number; unit: string }[] | null
  createdAt: string
  updatedAt: string
}

export interface CreateBodyMeasurementDto {
  date: string
  weightKg?: number
  bodyFatPct?: number
  chestCm?: number
  waistCm?: number
  hipsCm?: number
  armCm?: number
  thighCm?: number
  forearmCm?: number
  calfCm?: number
  neckCm?: number
  custom?: { fieldId: string; name: string; value: number; unit: string }[]
}

export interface UpdateBodyMeasurementDto {
  date?: string
  weightKg?: number
  bodyFatPct?: number
  chestCm?: number
  waistCm?: number
  hipsCm?: number
  armCm?: number
  thighCm?: number
  forearmCm?: number
  calfCm?: number
  neckCm?: number
  custom?: { fieldId: string; name: string; value: number; unit: string }[]
}

export function useBodyMeasurements(params?: { from?: string; to?: string; limit?: number; page?: number }) {
  return useQuery({
    queryKey: ['body-measurements', params],
    queryFn: async () => {
      const { data } = await api.get('/body-measurements', { params })
      return data as { items: BodyMeasurement[]; total: number }
    },
  })
}

export function useBodyMeasurement(id: string) {
  return useQuery({
    queryKey: ['body-measurements', id],
    queryFn: async () => {
      const { data } = await api.get(`/body-measurements/${id}`)
      return data as BodyMeasurement
    },
    enabled: !!id,
  })
}

export function useCreateBodyMeasurement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateBodyMeasurementDto) => {
      const { data } = await api.post('/body-measurements', body)
      return data as BodyMeasurement
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body-measurements'] }),
  })
}

export function useUpdateBodyMeasurement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...body }: UpdateBodyMeasurementDto & { id: string }) => {
      const { data } = await api.patch(`/body-measurements/${id}`, body)
      return data as BodyMeasurement
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body-measurements'] }),
  })
}

export function useDeleteBodyMeasurement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/body-measurements/${id}`)
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['body-measurements'] }),
  })
}

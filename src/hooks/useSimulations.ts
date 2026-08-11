import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSimulation,
  deleteSimulation,
  duplicateSimulation,
  listSimulations,
  updateSimulation,
  type SimulationInput,
} from '@/services/simulations'
import type { Simulation } from '@/types/domain'

const KEY = ['simulations']

export function useSimulations() {
  return useQuery({ queryKey: KEY, queryFn: listSimulations })
}

function useSimMutation<TArgs>(fn: (args: TArgs) => Promise<unknown>) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: fn,
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useCreateSimulation() {
  return useSimMutation((input: SimulationInput) => createSimulation(input))
}

export function useUpdateSimulation() {
  return useSimMutation(
    ({ id, patch }: { id: string; patch: Partial<SimulationInput> & { converted_at?: string | null } }) =>
      updateSimulation(id, patch),
  )
}

export function useDeleteSimulation() {
  return useSimMutation((id: string) => deleteSimulation(id))
}

export function useDuplicateSimulation() {
  return useSimMutation((s: Simulation) => duplicateSimulation(s))
}

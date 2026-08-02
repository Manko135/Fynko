import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  addContribution,
  createGoal,
  deleteGoal,
  listContributions,
  listGoals,
  updateGoal,
  type GoalInput,
} from '@/services/goals'

const GOALS = ['goals']
const CONTRIBS = ['goal_contributions']

export function useGoals() {
  return useQuery({ queryKey: GOALS, queryFn: listGoals })
}

export function useContributions() {
  return useQuery({ queryKey: CONTRIBS, queryFn: listContributions })
}

export function useCreateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: GoalInput) => createGoal(input),
    onSuccess: () => qc.invalidateQueries({ queryKey: GOALS }),
  })
}

export function useUpdateGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<GoalInput> }) =>
      updateGoal(id, patch),
    onSuccess: () => qc.invalidateQueries({ queryKey: GOALS }),
  })
}

export function useDeleteGoal() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteGoal(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: GOALS })
      qc.invalidateQueries({ queryKey: CONTRIBS })
    },
  })
}

export function useAddContribution() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: addContribution,
    onSuccess: () => qc.invalidateQueries({ queryKey: CONTRIBS }),
  })
}

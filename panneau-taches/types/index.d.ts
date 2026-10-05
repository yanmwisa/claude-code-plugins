export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type Task = { id: number; title: string; status: TaskStatus }
export type BandMode = 'list' | 'line' | 'focus'

declare module 'claude-code' {
  interface PluginState {
    'panneau-taches': {
      tasks: Task[]
      mode: BandMode
      cursor: number
      isHidden: boolean
    }
  }
}

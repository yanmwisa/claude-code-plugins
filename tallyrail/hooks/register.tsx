import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderElement, Timer } from 'claude-code'

import type { BandMode, Task, TaskStatus } from '../types'

const TOOL = 'mcp__tallyrail__tasks'
const STATUSES: readonly TaskStatus[] = ['pending', 'in_progress', 'done']
const AUTO_HIDE_MS = 5000
const BAR_WIDTH = 10
const MIN_PROMPT_CHARS_FOR_REMINDER = 25
const NARROW_BAND_COLUMNS = 44
const MIN_RULE_WIDTH = 8
const MAX_RULE_WIDTH = 48

// Read by Claude next to each prompt, never shown to the user.
const PLANNING_REMINDER =
  `Reminder from the tallyrail plugin: if the request has two steps or more, first call the ${TOOL} tool ` +
  'with action "plan" (one entry per task), then action "update" for each task: status "done" as soon as it ' +
  'is finished. For a simple question, do not plan.'

const tasksState = atom({ plugin: 'tallyrail', key: 'tasks' } as const, [])
const modeState = atom({ plugin: 'tallyrail', key: 'mode' } as const, 'list')
const cursorState = atom({ plugin: 'tallyrail', key: 'cursor' } as const, 0)
const isHiddenState = atom({ plugin: 'tallyrail', key: 'isHidden' } as const, false)

let hideTimer: Timer | undefined

// --- pure:start (decisions without side effects; tested outside the engine)

type TaskAction =
  | { kind: 'plan'; titles: string[] }
  | { kind: 'update'; id: number; status: TaskStatus }

type Parsed = { action: TaskAction } | { error: string }

type Progress = { done: number; total: number }

type BandView =
  | { kind: 'list'; progress: Progress; tasks: Task[]; isFinished: boolean }
  | { kind: 'line'; progress: Progress; current: Task }
  | { kind: 'focus'; progress: Progress; shown: Task; following: Task | null; canPrev: boolean; canNext: boolean }

const isStatus = (value: unknown): value is TaskStatus => STATUSES.includes(value as TaskStatus)

// Boundary: the tool input comes from the model, so it is not trusted.
function parseTaskAction(input: Record<string, unknown>): Parsed {
  if (input.action === 'plan') {
    const titles = Array.isArray(input.titles)
      ? input.titles.filter((title): title is string => typeof title === 'string' && title.trim() !== '')
      : []
    if (titles.length === 0) {
      return { error: 'tallyrail: "plan" needs a non-empty "titles" list.' }
    }
    return { action: { kind: 'plan', titles } }
  }

  if (input.action === 'update') {
    if (typeof input.id !== 'number' || !isStatus(input.status)) {
      return { error: 'tallyrail: "update" needs "id" (a number) and "status" (pending, in_progress, done).' }
    }
    return { action: { kind: 'update', id: input.id, status: input.status } }
  }

  return { error: 'tallyrail: "action" must be "plan" or "update".' }
}

// While tasks remain there is always one in progress: the first one to do is promoted.
function withCurrentTask(tasks: Task[]): Task[] {
  if (tasks.some(task => task.status === 'in_progress')) {
    return tasks
  }
  const firstPending = tasks.findIndex(task => task.status === 'pending')
  if (firstPending === -1) {
    return tasks
  }
  return tasks.map((task, index) => (index === firstPending ? { ...task, status: 'in_progress' } : task))
}

function applyTaskAction(current: Task[], request: TaskAction): { tasks: Task[] } | { error: string } {
  if (request.kind === 'plan') {
    const planned = request.titles.map((title, index): Task => ({ id: index + 1, title, status: 'pending' }))
    return { tasks: withCurrentTask(planned) }
  }

  // Empty list: never planned, or lost when the session resumed (the state is not kept).
  if (current.length === 0) {
    return { error: 'tallyrail: the list was lost, plan again.' }
  }
  if (!current.some(task => task.id === request.id)) {
    return { error: `tallyrail: no task number ${request.id}.` }
  }
  const updated = current.map(task => (task.id === request.id ? { ...task, status: request.status } : task))
  return { tasks: withCurrentTask(updated) }
}

const allDone = (tasks: Task[]): boolean => tasks.length > 0 && tasks.every(task => task.status === 'done')

function currentIndex(tasks: Task[]): number {
  const index = tasks.findIndex(task => task.status !== 'done')
  return index === -1 ? Math.max(0, tasks.length - 1) : index
}

const clampCursor = (cursor: number, total: number): number => Math.min(Math.max(cursor, 0), Math.max(total - 1, 0))

const describeProgress = (tasks: Task[]): Progress => ({
  done: tasks.filter(task => task.status === 'done').length,
  total: tasks.length,
})

function describeOutcome(tasks: Task[]): string {
  const { done, total } = describeProgress(tasks)
  const current = tasks.find(task => task.status === 'in_progress')
  return `${done}/${total} tasks done. ${current ? `In progress: ${current.title}.` : 'All done.'}`
}

function describeBand(mode: BandMode, tasks: Task[], cursor: number): BandView {
  const progress = describeProgress(tasks)
  if (allDone(tasks)) {
    return { kind: 'list', progress, tasks, isFinished: true }
  }
  if (mode === 'line') {
    return { kind: 'line', progress, current: tasks[currentIndex(tasks)] as Task }
  }
  if (mode === 'focus') {
    const index = clampCursor(cursor, tasks.length)
    return {
      kind: 'focus',
      progress,
      shown: tasks[index] as Task,
      following: tasks[index + 1] ?? null,
      canPrev: index > 0,
      canNext: index < tasks.length - 1,
    }
  }
  return { kind: 'list', progress, tasks, isFinished: false }
}

const progressBar = (progress: Progress): { filled: number; rest: number } => {
  const filled = progress.total === 0 ? 0 : Math.round((progress.done / progress.total) * BAR_WIDTH)
  return { filled, rest: BAR_WIDTH - filled }
}

const markOf = (status: TaskStatus): string => (status === 'done' ? '✔' : status === 'in_progress' ? '◐' : '○')

const markColorOf = (status: TaskStatus): string | undefined =>
  status === 'done' ? 'green' : status === 'in_progress' ? 'yellow' : undefined

const needsPlanningReminder = (promptText: string): boolean => promptText.trim().length >= MIN_PROMPT_CHARS_FOR_REMINDER

type ButtonKey = 'focus' | 'shrink' | 'grow' | 'previous' | 'next'

// Always words: a button says what it does. Shortened only when the band is very narrow.
const BUTTON_LABELS: Record<ButtonKey, { wide: string; narrow: string }> = {
  focus: { wide: 'One at a time', narrow: 'One by one' },
  shrink: { wide: 'Shrink', narrow: 'Shrink' },
  grow: { wide: 'Expand', narrow: 'Expand' },
  previous: { wide: 'Previous', narrow: 'Prev' },
  next: { wide: 'Next', narrow: 'Next' },
}

const isNarrowBand = (columns: number | undefined): boolean => (columns ?? 80) < NARROW_BAND_COLUMNS

const labelOf = (key: ButtonKey, isNarrow: boolean): string => BUTTON_LABELS[key][isNarrow ? 'narrow' : 'wide']

// Width of the rule between the list and its buttons: the band minus its margin, within bounds.
const ruleWidthOf = (columns: number | undefined): number =>
  Math.min(MAX_RULE_WIDTH, Math.max(MIN_RULE_WIDTH, (columns ?? 80) - 2))

// --- pure:end

function syncAutoHide($: EngineInterface, tasks: Task[]): void {
  hideTimer?.cancel()
  hideTimer = undefined
  if (!allDone(tasks)) {
    return
  }
  hideTimer = $.clock.after(AUTO_HIDE_MS, () => {
    void update($, isHiddenState, () => true)
  })
}

async function showFocus($: EngineInterface): Promise<void> {
  const tasks = await read($, tasksState)
  await update($, modeState, () => 'focus')
  await update($, cursorState, () => currentIndex(tasks))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.tool.register({
      name: 'tasks',
      description:
        "Task tracking shown automatically above the user's prompt. As soon as a request has several steps, " +
        'first call action "plan" with the "titles" list (one entry per task). Then mark each task with ' +
        'action "update" (id, status): "in_progress" when you start it, "done" as soon as it is finished. ' +
        'The band opens and closes by itself: do not ask the user anything.',
      inputSchema: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['plan', 'update'] },
          titles: { type: 'array', items: { type: 'string' } },
          id: { type: 'number' },
          status: { type: 'string', enum: [...STATUSES] },
        },
        required: ['action'],
      },
    })
    await $.command.register({ name: 'tasks', description: 'Show or hide the task band' })

    return next(e)
  })

  on('prompt.submit', ($, e, next) => {
    if (!needsPlanningReminder(e.text)) {
      return next(e)
    }
    return next({ ...e, context: [...(e.context ?? []), PLANNING_REMINDER] })
  })

  on('command.run', { command: 'tasks' }, async $ => {
    const tasks = await read($, tasksState)
    if (tasks.length === 0) {
      return { text: 'No tasks in progress.' }
    }
    const wasHidden = await read($, isHiddenState)
    await update($, isHiddenState, () => !wasHidden)

    return { text: wasHidden ? 'Task band shown.' : 'Task band hidden.' }
  })

  on('tool.call', { tool: TOOL }, async ($, e) => {
    const parsed = parseTaskAction(e as unknown as Record<string, unknown>)
    if ('error' in parsed) {
      return { deny: parsed.error }
    }

    const outcome = applyTaskAction(await read($, tasksState), parsed.action)
    if ('error' in outcome) {
      return { deny: outcome.error }
    }

    await update($, tasksState, () => outcome.tasks)
    await update($, cursorState, () => currentIndex(outcome.tasks))
    if (parsed.action.kind === 'plan') {
      await update($, isHiddenState, () => false)
    }
    syncAutoHide($, outcome.tasks)

    return { result: describeOutcome(outcome.tasks) }
  })

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next): Promise<RenderElement> => {
    const below = await next(e)
    const tasks = await read($, tasksState)
    const isHidden = await read($, isHiddenState)
    if (e.props.hasSurvey || isHidden || tasks.length === 0) {
      return below
    }

    const mode = await read($, modeState)
    const cursor = await read($, cursorState)
    const view = describeBand(mode, tasks, cursor)
    const { Box, Text, Button } = $.ui.resolve(e)

    const isFinished = view.kind === 'list' && view.isFinished
    const { filled, rest } = progressBar(view.progress)

    const renderTask = (task: Task) => (
      <Box key={`task${task.id}`}>
        <Text color={markColorOf(task.status)} dimColor={task.status === 'pending'} bold={task.status === 'in_progress'}>
          {markOf(task.status)}{' '}
        </Text>
        <Text strikethrough={task.status === 'done'} dimColor={task.status === 'done'} bold={task.status === 'in_progress'}>
          {task.title}
        </Text>
      </Box>
    )

    const renderButton = (key: string, hotkey: string, label: string, onPress: () => void) => (
      <Box key={key} marginRight={2}>
        <Button hotkey={hotkey} plain label={label} onPress={onPress} />
      </Box>
    )

    const toList = () => void update($, modeState, () => 'list')
    const toLine = () => void update($, modeState, () => 'line')
    const toFocus = () => void showFocus($)
    const toPrevious = () => void update($, cursorState, previous => previous - 1)
    const toNext = () => void update($, cursorState, previous => previous + 1)

    const isNarrow = isNarrowBand(e.props.bodyColumns)

    // Shrunk view: a single line, only the task in progress, and a small button to expand.
    if (view.kind === 'line') {
      return (
        <Box flexDirection="column">
          {below}
          <Box marginTop={1} marginLeft={1}>
            <Text color={markColorOf('in_progress')} bold>
              {markOf('in_progress')}{' '}
            </Text>
            <Box flexShrink={1}>
              <Text bold wrap="truncate-end">
                {view.current.title}
              </Text>
            </Box>
            <Box marginLeft={1}>
              <Text dimColor>
                {view.progress.done}/{view.progress.total}
              </Text>
            </Box>
            <Box flexGrow={1} />
            {renderButton('grow', 'e', labelOf('grow', isNarrow), toList)}
          </Box>
        </Box>
      )
    }

    const buttons =
      view.kind === 'list'
        ? isFinished
          ? []
          : [
              renderButton('focus', 'f', labelOf('focus', isNarrow), toFocus),
              renderButton('line', 's', labelOf('shrink', isNarrow), toLine),
            ]
        : [
            ...(view.canPrev ? [renderButton('prev', 'p', labelOf('previous', isNarrow), toPrevious)] : []),
            ...(view.canNext ? [renderButton('next', 'n', labelOf('next', isNarrow), toNext)] : []),
            renderButton('list', 'e', labelOf('grow', isNarrow), toList),
          ]

    const rows =
      view.kind === 'list'
        ? view.tasks.map(renderTask)
        : [
            renderTask(view.shown),
            view.following === null ? null : (
              <Text key="following" dimColor wrap="truncate-end">
                next: {view.following.title}
              </Text>
            ),
          ]

    return (
      <Box flexDirection="column">
        {below}
        <Box marginTop={1} marginLeft={1} flexDirection="column">
          <Box>
            <Text bold color={isFinished ? 'green' : undefined}>
              Tasks
            </Text>
            <Box marginLeft={1}>
              <Text color={isFinished ? 'green' : undefined} dimColor={!isFinished}>
                {isFinished ? `${view.progress.total}/${view.progress.total} done` : `${view.progress.done}/${view.progress.total}`}
              </Text>
            </Box>
            <Box marginLeft={1}>
              <Text color={isFinished ? 'green' : 'yellow'}>{'█'.repeat(filled)}</Text>
              <Text dimColor>{'█'.repeat(rest)}</Text>
            </Box>
          </Box>
          {rows}
          {buttons.length === 0 ? null : (
            <Box flexDirection="column">
              <Text dimColor>{'─'.repeat(ruleWidthOf(e.props.bodyColumns))}</Text>
              <Box>{buttons}</Box>
            </Box>
          )}
        </Box>
      </Box>
    )
  })
}

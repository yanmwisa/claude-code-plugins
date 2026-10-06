import { test, expect } from 'claude-code/testing'

const TOOL = 'mcp__task-band__tasks'
const LOST_LIST = 'task-band: the list was lost, plan again.'

// What the engine returns for a denied call: the denial text, wherever it is stored.
const textOf = (answer: unknown): string => JSON.stringify(answer)

test('update on an empty list: "the list was lost, plan again"', async ($: any) => {
  const answer = await $.tool.call({ tool: TOOL, action: 'update', id: 1, status: 'done' })
  expect(textOf(answer)).toContain(LOST_LIST)
  expect(textOf(answer)).not.toContain('no task number')
})

test('update of a wrong number on an existing list: the number message stays', async ($: any) => {
  await $.tool.call({ tool: TOOL, action: 'plan', titles: ['A', 'B'] })
  const answer = await $.tool.call({ tool: TOOL, action: 'update', id: 9, status: 'done' })
  expect(textOf(answer)).toContain('no task number 9')
  expect(textOf(answer)).not.toContain(LOST_LIST)
})

test('plan then update: the list works', async ($: any) => {
  await $.tool.call({ tool: TOOL, action: 'plan', titles: ['A', 'B'] })
  const answer = await $.tool.call({ tool: TOOL, action: 'update', id: 1, status: 'done' })
  expect(textOf(answer)).toContain('1/2 tasks done')
})

import { test, expect } from 'claude-code/testing'

const TOOL = 'mcp__task-band__tasks'
const LOST_LIST = 'task-band: liste perdue, refais un plan.'

// Ce que le moteur rend d'un appel refusé : le texte du refus, où qu'il soit rangé.
const textOf = (answer: unknown): string => JSON.stringify(answer)

test('update sur une liste vide : « liste perdue, refais un plan »', async ($: any) => {
  const answer = await $.tool.call({ tool: TOOL, action: 'update', id: 1, status: 'done' })
  expect(textOf(answer)).toContain(LOST_LIST)
  expect(textOf(answer)).not.toContain('aucune tâche numéro')
})

test('update d\'un mauvais numéro sur une liste existante : l\'ancien message reste', async ($: any) => {
  await $.tool.call({ tool: TOOL, action: 'plan', titles: ['A', 'B'] })
  const answer = await $.tool.call({ tool: TOOL, action: 'update', id: 9, status: 'done' })
  expect(textOf(answer)).toContain('aucune tâche numéro 9')
  expect(textOf(answer)).not.toContain(LOST_LIST)
})

test('plan puis update : la liste fonctionne', async ($: any) => {
  await $.tool.call({ tool: TOOL, action: 'plan', titles: ['A', 'B'] })
  const answer = await $.tool.call({ tool: TOOL, action: 'update', id: 1, status: 'done' })
  expect(textOf(answer)).toContain('1/2 tâches terminées')
})

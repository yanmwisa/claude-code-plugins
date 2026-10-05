# next-steps-sequence

A variant of [next-steps](https://github.com/anthropics/claude-plugins-community/tree/main/next-steps) by Thariq Shihipar (MIT). After each turn, Claude suggests up to three next prompts above the input box. Instead of picking one, you **tick several, in the order you want, and run them as a sequence**: each step is sent when the previous one has finished with an answer.

```
next:
  1: ☑ ② Run the tests
  2: ☐ Commit
  3: ☑ ① Push the branch
Ordre : 3 puis 1
4 Lancer la séquence   5 Éditer d'abord   6 Tout   0 Fermer
```

*Interface labels are in French: "Ordre : 3 puis 1" (order: 3 then 1), "Lancer la séquence" (run the sequence), "Éditer d'abord" (edit first), "Tout" (all), "Fermer" (close), "Arrêter après cette étape" (stop after this step).*

## Keys

Press them from an empty prompt box, or click the buttons.

| Key | Action |
| --- | --- |
| `1` `2` `3` | tick or untick a suggestion; the rank follows the order of your presses |
| `4` | run the ticked steps as a sequence |
| `5` | put the first ticked step in the prompt box as a draft (the original next-steps behaviour) |
| `6` | tick everything |
| `7` | while a sequence runs: stop after the current step |
| `0` | close |

A step that is interrupted, refused or fails stops the sequence. Steps are sent as coming from the plugin, not as your own words.

## Install

```bash
claude plugin marketplace add yanmwisa/claude-code-plugins
```

```bash
claude plugin install next-steps-sequence@yanmwisa
```

Use it **instead of** `next-steps@claude-community`, not alongside it, or you will get two "next:" bands. Then start a new session.

## Options

| Option | Default | What it does |
| --- | --- | --- |
| `minAnswerChars` | `80` | Skip suggestions after answers shorter than this |
| `suggestSkills` | `true` | Tell the suggester which skills and slash commands the session has |

## How it works

It is a function-hooks plugin (`hooks/register.tsx`):

- `turn.complete`: forks the session with `$.model.fork` to ask for likely next prompts. The fork shares the session's prompt cache, so it costs about one short reply. During a sequence, the same hook sends the next step with `$.prompt.submit`.
- `$.command.list`: the session's skills and slash commands go into the fork's question, so a suggestion can be `/skill arguments`. A suggestion naming a command the session does not have is dropped.
- `ui.render` on `AbovePrompt`: draws the suggestions and the sequence progress.
- `turn.start`: hides the suggestions, except while a sequence runs.

## Safety and privacy

- Suggestions come from a model that may have read untrusted content. The original sanitising and the unknown-command check are kept, and the text of every step is shown before you run it.
- The only model call is the session fork (`$.model.fork`), inside your own Claude session. No other network access, no files written, no process started.

## Develop

```bash
claude plugin validate ./next-steps-sequence
```

To try a local copy: `claude --plugin-dir ./next-steps-sequence`.

## Credits and license

Based on next-steps by Thariq Shihipar. MIT, see [LICENSE](LICENSE).

---

### En français

Variante de next-steps : après chaque tour, cochez plusieurs suggestions (`1`, `2`, `3`) dans l'ordre voulu, puis `4` les lance une à une, chaque étape partant quand la précédente a fini. `5` met la première en brouillon, `6` coche tout, `7` arrête après l'étape en cours, `0` ferme. À utiliser à la place de next-steps, pas en plus.

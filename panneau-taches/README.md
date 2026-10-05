# panneau-taches

A task band above the Claude Code prompt that opens by itself. When a request has several steps, Claude plans it as a list of tasks, ticks each one as it goes, and the band closes a few seconds after the last task is done. You never have to ask for it.

```
Tâches 2/4 █████░░░░░
✔ Copy the files
✔ Remove the old code
◐ Write the README
○ Run the validation
────────────────────────────
f Une à la fois   r Réduire
```

*Interface labels are in French: "Tâches" (tasks), "Une à la fois" (one at a time), "Réduire" (shrink), "Agrandir" (expand), "Précédente" / "Suivante" (previous / next).*

## What you get

- **A band that opens and closes by itself.** Claude calls the plugin's `taches` tool with `plan` (one title per task), then `update` (`in_progress`, `done`) as it works. The band shows the progress bar and the list, and hides itself 5 seconds after everything is done.
- **Three views**, switched with one key from an empty prompt box:
  - list: every task with its status (`f` focus, `r` shrink);
  - single line: only the current task and `done/total` (`a` to expand);
  - focus: one task at a time (`p` previous, `s` next, `a` back to the list).
- **`/taches`** shows or hides the band by hand.
- **A short reminder**, added to each prompt of 25 characters or more, asks Claude to plan multi-step requests with the tool. It is read by Claude only, never shown to you.

## Install

```bash
claude plugin marketplace add yanmwisa/claude-code-plugins
```

```bash
claude plugin install panneau-taches@yanmwisa
```

Then start a new session.

## How it works

It is a function-hooks plugin (`hooks/register.tsx`):

| Hook | Role |
| --- | --- |
| `session.start` | registers the `taches` tool and the `/taches` command |
| `tool.call` on `mcp__panneau-taches__taches` | validates `plan` / `update` and stores the tasks |
| `prompt.submit` | adds the planning reminder to longer prompts |
| `command.run` on `taches` | shows or hides the band |
| `ui.render` on `AbovePrompt` | draws the band |

The tasks live in the session's state (`$.state`) only. Pure decisions (parsing tool input, computing the view) are separated from effects and covered by `panneau-taches.test.ts`.

## Privacy

No network access, no files written, no process started. Task titles stay in the session.

## Develop

```bash
claude plugin validate ./panneau-taches
```

```bash
claude plugin test ./panneau-taches
```

To try a local copy: `claude --plugin-dir ./panneau-taches`.

## License

MIT, see [LICENSE](LICENSE).

---

### En français

Une bande de tâches au-dessus de la zone de saisie, qui s'ouvre toute seule : Claude découpe une demande en plusieurs étapes, coche chaque tâche au fur et à mesure, et la bande se ferme 5 secondes après la dernière. Trois affichages (liste, ligne, focus), la commande `/taches` pour l'afficher ou la masquer. Aucun accès réseau, rien n'est écrit sur le disque.

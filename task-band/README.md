# Task Band

A task band above the Claude Code prompt that opens by itself. When a request has several steps, Claude plans it as a list of tasks, ticks each one as it goes, and the band closes a few seconds after the last task is done. You never have to ask for it.

```
Tasks 2/4 █████░░░░░
✔ Copy the files
✔ Remove the old code
◐ Write the README
○ Run the validation
────────────────────────────
f One at a time   s Shrink
```

## What you get

- **A band that opens and closes by itself.** Claude calls the plugin's `tasks` tool with `plan` (one title per task), then `update` (`in_progress`, `done`) as it works. The band shows the progress bar and the list, and hides itself 5 seconds after everything is done.
- **Three views**, switched with one key from an empty prompt box:
  - list: every task with its status (`f` one at a time, `s` shrink);
  - single line: only the current task and `done/total` (`e` to expand);
  - focus: one task at a time (`p` previous, `n` next, `e` back to the list).
- **`/tasks`** shows or hides the band by hand.
- **A short reminder**, added to each prompt of 25 characters or more, asks Claude to plan multi-step requests with the tool. It is read by Claude only, never shown to you.

## Install

```bash
claude plugin marketplace add yanmwisa/claude-code-plugins
```

```bash
claude plugin install task-band@yanmwisa
```

Then start a new session.

This plugin was called `panneau-taches` before version 0.3.0. If you installed it under that name, the marketplace moves you to `task-band` on the next update.

## How it works

It is a function-hooks plugin (`hooks/register.tsx`):

| Hook | Role |
| --- | --- |
| `session.start` | registers the `tasks` tool and the `/tasks` command |
| `tool.call` on `mcp__task-band__tasks` | validates `plan` / `update` and stores the tasks |
| `prompt.submit` | adds the planning reminder to longer prompts |
| `command.run` on `tasks` | shows or hides the band |
| `ui.render` on `AbovePrompt` | draws the band |

The tasks live in the session's state (`$.state`) only. Pure decisions (parsing tool input, computing the view) are separated from effects and covered by `task-band.test.ts`.

## Privacy

No network access, no files written, no process started. Task titles stay in the session.

## Develop

```bash
claude plugin validate ./task-band
```

```bash
claude plugin test ./task-band
```

To try a local copy: `claude --plugin-dir ./task-band`.

## License

MIT, see [LICENSE](LICENSE).


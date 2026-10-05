# Claude Code plugins by yanmwisa

Two function-hook plugins for [Claude Code](https://claude.com/product/claude-code), free and open source (MIT).

| Plugin | What it does |
| --- | --- |
| [**panneau-taches**](panneau-taches) | A task band above the prompt that opens by itself: Claude plans multi-step work, ticks each task as it goes, and the band closes when everything is done. |
| [**next-steps-sequence**](next-steps-sequence) | A variant of next-steps: tick several suggested next prompts, in the order you choose, and run them as a sequence, one step per turn. |

The interface labels are in French; each README translates them.

## Install

Add this repository as a plugin marketplace, then install what you want:

```bash
claude plugin marketplace add yanmwisa/claude-code-plugins
```

```bash
claude plugin install panneau-taches@yanmwisa
```

```bash
claude plugin install next-steps-sequence@yanmwisa
```

Start a new session afterwards. To update later:

```bash
claude plugin marketplace update yanmwisa
```

## Requirements

A Claude Code version with function-hook plugins (`hooks/register.tsx`). These plugins use an early-access API that may change between Claude Code releases.

## Repository layout

```
.claude-plugin/marketplace.json   the marketplace listing
panneau-taches/                    one plugin per folder
next-steps-sequence/
```

Each plugin folder holds `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.tsx`, a README and a LICENSE.

## Contributing

Issues and pull requests are welcome, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT, see [LICENSE](LICENSE). next-steps-sequence is based on next-steps by Thariq Shihipar (MIT).

# Claude Code plugins by yanmwisa

Two function-hook plugins for [Claude Code](https://claude.com/product/claude-code), free and open source (MIT).

| Plugin | What it does |
| --- | --- |
| [**tallyrail**](tallyrail) | A task band above the prompt that opens by itself: Claude plans multi-step work, ticks each task as it goes, and the band closes when everything is done. |
| [**step-chain**](step-chain) | A variant of next-steps: tick several suggested next prompts, in the order you choose, and run them as a sequence, one step per turn. |

The interface labels are in French; each README translates them.

## Install

Add this repository as a plugin marketplace, then install what you want:

```bash
claude plugin marketplace add yanmwisa/claude-code-plugins
```

```bash
claude plugin install tallyrail@yanmwisa
```

```bash
claude plugin install step-chain@yanmwisa
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
tallyrail/                        one plugin per folder
step-chain/
```

Each plugin folder holds `.claude-plugin/plugin.json`, `hooks/hooks.json`, `hooks/register.tsx`, a README and a LICENSE.

## Contributing

Issues and pull requests are welcome, see [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT, see [LICENSE](LICENSE). step-chain is based on next-steps by Thariq Shihipar (MIT).

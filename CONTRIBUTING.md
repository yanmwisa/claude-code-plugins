# Contributing

Thanks for helping. Issues and pull requests are welcome, in English or French.

## Report a problem

Open an issue with:

- the plugin and its version (`.claude-plugin/plugin.json`);
- your Claude Code version (`claude --version`) and where you use it (terminal, desktop app);
- what you did, what you expected, what happened.

Do not paste secrets, tokens or private conversation content.

## Change a plugin

1. Fork the repository and create a branch.
2. Keep the change to one subject.
3. Check the plugin before opening the pull request:

   ```bash
   claude plugin validate ./<plugin> --strict
   ```

   For tallyrail, also run the tests:

   ```bash
   claude plugin test ./tallyrail
   ```

4. If the behaviour changes, update the plugin's README and raise `version` in its `plugin.json`.

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/): `feat(tallyrail): …`, `fix(step-chain): …`. The body says why the change is needed.

## Rules for plugin code

- Keep decisions pure and testable; keep effects (`$.prompt`, `$.state`, `$.ui`) at the edges.
- No network access, no process spawning, no file writes unless the README says why.
- Never log prompt text, tokens or personal data.

By contributing, you agree that your contribution is released under the MIT License.

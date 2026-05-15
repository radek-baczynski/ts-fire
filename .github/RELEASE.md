# Releasing ts-fire

Releases use [Semantic Versioning](https://semver.org/) and git tags `vMAJOR.MINOR.PATCH`.

## One-time setup

1. **npm**: Create an [npm access token](https://www.npmjs.com/settings/~youruser/tokens) with **Publish** scope.
2. **GitHub**: Add repository secret `NPM_TOKEN` with that token.
3. **GitHub**: Create environment `npm` (Settings → Environments → `npm`) and add `NPM_TOKEN` as an environment secret (recommended) or use repository-level secret.
4. **npm package**: Publish as `ts-fire` (verify the name is still available: `npm view ts-fire`).

Optional: enable [npm trusted publishing](https://docs.npmjs.com/generating-provenance-statements) for this repo via GitHub OIDC instead of `NPM_TOKEN`.

## Release workflow (interactive)

Requires a **clean** git working tree.

```bash
npm run release           # patch (default): prompts, then bump + optional push
npm run release:minor
npm run release:major
```

1. First prompt: bump version, commit, and tag **locally**. If you answer **no**, nothing changes.
2. Second prompt: push branch and tag to **origin**. If you answer **no**, the script **reverts** the bump (`git tag -d v…` and `git reset --hard HEAD~1`).

That push triggers [`.github/workflows/release.yml`](workflows/release.yml) (npm publish + GitHub Release when the tag matches `package.json`).

## Release workflow (manual)

```bash
# Bump version only (no interactive script)
npm version patch -m "chore: release %s"
git push && git push --tags
```

Or manually:

```bash
npm version 0.2.0 --no-git-tag-version
npm install
git add package.json package-lock.json
git commit -m "chore: release v0.2.0"
git tag v0.2.0
git push && git push origin v0.2.0
```

## What the pipeline does

| Workflow | Trigger | Actions |
|----------|---------|---------|
| **CI** | Push/PR to `main` | typecheck, test, build, CLI smoke test (Node 20 & 22) |
| **Release** | Push tag `v*.*.*` | Verify version, test, build, `npm publish`, GitHub Release |
| **Release validate** | Manual (`workflow_dispatch`) | Test build; print tag instructions |

## Dry-run locally

```bash
npm ci && npm test && npm run build
npm pack   # creates ts-fire-0.1.0.tgz without publishing
```

## Pre-release versions

For betas, use `npm version 0.2.0-beta.0` and tag `v0.2.0-beta.0`. Publish with:

```bash
npm publish --tag beta
```

(Extend `release.yml` with an input if you need automated dist-tags.)

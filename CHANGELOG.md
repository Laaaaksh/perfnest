# Changelog

All notable changes to Perfnest are documented in this file. Released
sections mirror the notes on the
[GitHub Releases page](https://github.com/Laaaaksh/perfnest/releases).
Format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- Scheduled and on-demand Lighthouse runs (mobile "Slow 4G, 4x CPU" and
  desktop "Dense 4G" throttling presets), with a trends dashboard for
  performance score, LCP, TBT (the lab-mode proxy for INP), CLS, and FCP.
- Per-metric, per-page performance budgets with Slack, generic webhook, and
  email alerting on breach.
- A CI/webhook trigger endpoint authenticated by a per-project API token,
  plus a small `scripts/check-budget.mjs` helper for failing a deploy
  pipeline on a budget breach.
- An optional public, read-only dashboard per project.
- Single-admin-password auth - no user accounts or SSO in v1.

[Unreleased]: https://github.com/Laaaaksh/perfnest/compare/HEAD

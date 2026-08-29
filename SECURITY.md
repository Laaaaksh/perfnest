# Security Policy

## Supported versions

Perfnest is a young project. Security fixes are made against the **latest
release** and `main` only — please confirm you can reproduce the issue on
the newest release before reporting.

| Version        | Supported |
| -------------- | --------- |
| latest release | yes       |
| older releases | no        |

## Reporting a vulnerability

Please do **not** open a public GitHub issue for anything you believe is a
security problem.

Use GitHub's private vulnerability reporting instead:

> https://github.com/Laaaaksh/perfnest/security/advisories/new

That link reaches the maintainer privately — the report, follow-up
discussion, and any fix coordination stay confidential until a patched
release ships.

When reporting, please include:

- your Perfnest version or Docker image tag
- how you're running it (docker compose, custom Docker setup, source checkout)
- clear steps to reproduce

## What belongs in a report

Perfnest is a self-hosted dashboard that launches headless Chrome against
URLs you configure, stores the results in Postgres, and holds one admin
password plus a per-project API token. Things worth reporting:

- A way to bypass the admin session check or forge/replay a session cookie.
- A way to trigger a run, read another project's data, or read/modify
  budgets and alert channels without a valid session or the matching
  project's API token.
- A path where an attacker-controlled URL, page title, or Lighthouse audit
  output causes command execution outside the intended Chrome/Lighthouse
  invocation, or lets one project's monitored page read another project's
  data.
- The public dashboard route (`/p/<slug>`) leaking anything beyond the
  performance metrics of the pages that project explicitly monitors.
- Server-side request forgery via a monitored page URL that reaches
  internal network resources the operator did not intend to expose.

Out of scope:

- Bugs in Lighthouse or Chromium itself — please report those to the
  [Lighthouse](https://github.com/GoogleChrome/lighthouse/security) or
  [Chromium](https://www.google.com/about/appsecurity/) projects directly.
- An operator monitoring a URL they don't control or trust: Perfnest
  launches real headless Chrome against whatever URL you configure, so
  monitoring an untrusted or adversarial page is a risk you're taking on
  deliberately, the same as visiting it in a browser.
- Missing rate limiting on a self-hosted instance you run for yourself —
  file it as a regular issue instead, it's a hardening request, not a
  vulnerability.

## Credits

Reporters who wish to be credited in a fix's release notes may say so in
the private report; otherwise reports are handled without attribution.

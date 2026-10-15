# TaskFlow

A personal task planner in English and Thai, with scheduled work, Saved Courses,
and a separate undated Todo list. Use it as a guest in your browser or sign in
for private Supabase storage and cross-device synchronization.

[Open TaskFlow](https://taskflow-ruddy-one.vercel.app/) ·
[Download desktop Release 1](https://github.com/Micosz/taskflow/releases/tag/v1.0.0)

## Develop

Requires a current Node.js LTS release and npm. Cloud configuration is optional
for guest mode; copy `.env.example` to `.env.local` to enable Supabase.

```bash
npm ci
npm run dev
```

Open [localhost:3000](http://localhost:3000). Before sharing changes:

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Stack: Next.js App Router, React, TypeScript, Tailwind CSS, Motion, Supabase and Vitest.

## Repository map

| Folder | Purpose |
| --- | --- |
| `src/` | All web application code |
| `public/` | Background artwork and app icons |
| `tests/` | Web unit and contract tests |
| `supabase/migrations/` | Ordered schema, RLS and Realtime migrations |
| `desktop/` | KDE widgets, portable Windows/Linux client and release tooling |
| `docs/` | Architecture, cloud setup and historical design notes |

Project configuration, environment files and dependency manifests stay at the root.

## Guides

- [Architecture, data models and Todo](docs/architecture.md)
- [Supabase setup, authentication and guest imports](docs/supabase.md)
- [Desktop install, OS reinstall and preferences restore](desktop/release/RELEASE-README.md)
- [KDE companion, reminders, privacy and removal](desktop/kde-widget/README.md)
- [Historical design QA](docs/archive/design-qa.md)

Desktop Release 1 supports Windows 10/11 x64 and Linux with Python 3.10+.
Plasma 6 uses native widgets with frosted backgrounds and deadline reminders;
GNOME/other desktops and Windows use opaque, movable portable windows.
Desktop clients show unfinished scheduled tasks; undated Todo lives in the web menu.

## Mobile and limitations

On iPhone, open the HTTPS site in Safari → Share → Add to Home Screen. The app
includes a manifest, icons, safe-area handling and responsive layouts. There is
no service worker, guaranteed offline page loading or browser push notification support.

Guest data stays in that browser. Move it into an account before clearing browser
data or reinstalling the OS. Cloud edits require connectivity; there is no offline
mutation queue. Password reset UI, OAuth, collaboration and recurring tasks remain
outside the current scope.

[MIT License](LICENSE)

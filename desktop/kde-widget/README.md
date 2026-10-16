# TaskFlow KDE widget

A Plasma 6 widget for the desktop or panel, backed by a small Python companion.
No Electron, npm server, additional Python packages, or sudo required.

## Install on Fedora KDE / Plasma 6

From the TaskFlow checkout, with the same public Supabase configuration as the web app in `.env.local`:

```bash
python3 desktop/kde-widget/install.py --web-url https://taskflow-ruddy-one.vercel.app/
```

`--web-url` is optional; you can enter the deployed website URL in the widget's settings.
The installer reads only public Supabase URL/publishable key (legacy anon key also supported).
It never executes `.env.local` as a shell script. Environment variables can also supply these values.
Do not supply a service-role or secret key.

Right-click the desktop or panel → **Add Widgets** → search **TaskFlow** → add it.
Sign in inside the widget with your existing TaskFlow email/password. Accounts must already
exist; create/confirm them on the website. The widget has its own session; the website can stay closed.
Guest browser tasks are not accessible here: move them to your cloud account through the web app first.

To open a standalone preview window:

```bash
plasmawindowed com.github.micosz.taskflow
```

## Everyday use

- All unfinished, Today, Next 7 days, and Overdue views, with English/Thai switching.
- Due-date countdowns and completion buttons. Completion updates the existing Supabase row;
  the web app receives the change through its existing Realtime subscription.
- Desktop display updates about every 30 seconds. This companion uses polling, not Realtime.
  Manual refresh queries immediately. A slow network can delay updates beyond that interval.
- A panel icon shows the count of unfinished tasks due today; click to open its popup.
- Last successful cloud snapshot remains visible when offline; completion is disabled offline.
  No offline mutation queue. Auth rejection clears the session and cache.
- Desktop notifications start one hour before each deadline, once per task/deadline/account.
  Date-only tasks are due at 23:59:59 local time, matching the web app. After sleep, deadlines
  missed by up to five minutes can still notify; older overdue tasks only appear in the list.
  The computer must be awake, connected, and signed in; KDE Do Not Disturb can suppress banners.
- **Open web** opens your configured TaskFlow homepage to view/edit full details.
- Sign out in settings to erase the widget's local session, tasks, and reminder history.
  Website/mobile sessions are independent.

The companion starts automatically with your graphical session, even when the popup is closed.
To disable notifications, rerun installation with `--no-notifications`. Rerunning installation
updates the installed files and preserves your account; changing Supabase projects clears it.
After a QML update, log out/in or restart `plasma-plasmashell.service` to clear Plasma's component cache. Closing/reopening a tile can reuse the old cached QML.

## Appearance

The widget follows TaskFlow's sage palette and wordmark, with clear task/category/deadline
hierarchy and an outlined completion button. The settings button contains language,
System/Dark/Light theme, frosted-background, and reduced-motion preferences. These are
stored per widget, alongside your existing website URL and filter selection.

On the desktop, frosted mode samples only the wallpaper behind this widget using Qt Quick's
`ShaderEffectSource` and `MultiEffect`. A rounded mask, half-resolution texture, restrained
blur, and readable tint give actual frosted glass without changing your Plasma theme or
KWin configuration. Moving the tile updates the sampled wallpaper area. This does not take
or save screenshots, and does not sample your application windows or desktop icons.

Disable **Frosted background** for a fully opaque surface. Missing wallpaper sources,
software rendering, standalone previews, and panel popups also use the opaque fallback.
Text colors are calibrated for both modes, including bright wallpaper behind dark mode.

Press feedback is limited to 120 ms and pointer input. Keyboard actions are immediate;
**Reduce motion** and KDE's disabled animation setting remove movement. Polling and filter
changes never replay entry animations. Loading, empty, login, settings, offline, and error
states use the same design; settings/login remain scrollable at the minimum tile size.

## Local files and security boundary

- `~/.local/share/taskflow-widget/bridge.py`: installed Python companion.
- `~/.local/share/plasma/plasmoids/com.github.micosz.taskflow/`: installed widget.
- `~/.config/taskflow-widget/config.json`: public cloud configuration and random local API secret.
- `~/.local/state/taskflow-widget/session.json`: access/refresh tokens, cached tasks and reminder history.
- `~/.config/systemd/user/taskflow-widget.service`: user service.

XDG overrides are respected. Session/config files use mode `0600`; the widget directory uses
`0700` because its generated `connection.js` contains a per-install local API credential.
The password is sent to Supabase over HTTPS and is never stored. Tokens are stored in a private
file, not an encrypted keyring; software running as your Unix user can read them. Do not share
the generated installed widget folder or account state, and do not commit these files.

The companion binds only to `127.0.0.1:38471`, requires its random bearer credential for every
endpoint, rejects browser Origin headers and unexpected Host headers, and exposes no CORS access.
It sends the signed-in user's bearer token to Supabase, where the existing task RLS policies
remain authoritative. Tokens never appear in widget responses or request logs.

## Troubleshoot / remove

```bash
systemctl --user status taskflow-widget.service
systemctl --user restart taskflow-widget.service
journalctl --user -u taskflow-widget.service -n 30
python3 desktop/kde-widget/install.py --uninstall
# Also erase this widget's local login/cache/config:
python3 desktop/kde-widget/install.py --uninstall --purge
```

Remove its desktop/panel tile through KDE. Neither uninstall option deletes cloud tasks.
If port 38471 is occupied, change `port` in the private config and rerun installation.
If Supabase requires CAPTCHA/MFA, this initial email/password-only widget cannot complete that
flow; use the website until an interactive auth flow is added.

## Verification

```bash
python3 -m unittest discover -s desktop/kde-widget -p 'test_*.py' -v
```

Tests use a fake cloud and check scope isolation, token rotation, cache clearing, completion,
notification deduplication, date-only deadlines, and loopback API authorization.
Live account login/cloud sync should be checked with an actual user account; automated tests
do not establish deployed Supabase behavior.

## Separate calendar widget

The installer also registers **TaskFlow Calendar** (`com.github.micosz.taskflow.calendar`).
Add it through KDE's Add Widgets menu. It shares the existing loopback companion,
login, offline cache, and 30-second refresh; no extra service or browser is needed.

Browse months, jump to today, and select a date to view unfinished scheduled tasks,
notes, and due times. Completed tasks and undated Todo are not part of this calendar.
The calendar shares the main widget's frosted wallpaper surface and supports Thai/English
and light/dark/system themes. Blur falls back to an opaque surface in panel popups or
software rendering. The calendar's `glass` setting can disable the effect. Both packages are removed
by the existing uninstall command.

## Undated Todo widget

Add **TaskFlow Todo** from Plasma's Add Widgets menu. It shares the companion and
account with the other widgets, uses the frosted background, and syncs the web
Todo table every 30 seconds. Add reminders without dates, check them off, and use
Show completed to reopen them. Editing and deletion remain available on the web.
Todo has its own cached list and sync status; failures do not stop scheduled-task
refreshes or reminders. Offline writes show an error and retain the input for retry.
This addition is newer than the published v1.0.0 assets; updating from this source
requires rerunning the installer. It does not modify the existing Release 1 archives.

## Startup recovery

All three Plasma widgets retry a missing/unresponsive companion automatically after
2, 4, 8, then at most every 15 seconds. A successful response resets the delay.
Retries only read `/state`; login, add and completion commands are never replayed.
Status reads time out after 8 seconds; cloud/mutation requests retain a 60-second
guard. The normal 30-second poll remains. Existing cached data stays visible while
reconnecting. No Plasma restart is needed to run the companion; log out/in once
after updating QML if Plasma is still using its previously loaded components.

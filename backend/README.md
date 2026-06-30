# Backend — Log Generator

A small Node.js service that feeds the Traffic Classifier PWA with realistic demo
traffic. It continuously inserts synthetic HTTP request logs into the Supabase
`live_logs` table, which the frontend's **Monitor** and **History** pages read from.

About **25%** of generated entries are simulated attacks (SQL injection, XSS, path
traversal, web shells, and known attack-tool user agents such as `sqlmap`, `nikto`,
and `Hydra`); the rest are normal browser/API traffic. A new log is inserted every
500&nbsp;ms.

## Setup

1. Copy the example env file and fill in your Supabase credentials:

   ```bash
   cp .env.example .env
   ```

   | Variable            | Where to find it                                          |
   | ------------------- | --------------------------------------------------------- |
   | `SUPABASE_URL`      | Supabase dashboard → Project Settings → API → Project URL |
   | `SUPABASE_ANON_KEY` | Supabase dashboard → Project Settings → API → `anon` key  |

2. Install dependencies:

   ```bash
   npm install
   ```

## Run

```bash
npm start
```

You should see output like:

```
[benign] GET /api/products — 192.168.1.14 — 200 — 47ms
[ATTACK] GET /admin' OR 1=1-- — 45.33.32.156 — 403 — 120ms
```

Stop it with `Ctrl+C`.

## Notes

- **Requires an active Supabase project.** Free-tier projects pause after 7 days of
  inactivity. If the live feed in the app is empty, check that the project is
  *Active* in the Supabase dashboard and restore it if needed — running this
  generator counts as activity and keeps it awake.
- `.env` holds secrets and is gitignored. Only `.env.example` is committed.
- Requires Node.js 20.6+ (uses the built-in `--env-file` flag; no `dotenv` dependency).

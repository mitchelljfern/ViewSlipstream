# Slipstream (viewslipstream.com) redesign

> **If you are not Mitchell, push your updates to the staging server, never the live server.**
> That means the `staging` branch (https://staging--viewslipstream.netlify.app), or a pull request into `staging`.
> Never push to or merge into `main`: `main` is the live site (https://viewslipstream.netlify.app), and only Mitchell publishes it.
> This applies to people and AI assistants alike.

The new Slipstream site: screenings people RSVP to, a password-protected DaCast player during each show's window, three emails per RSVP, giveaways, YouTube live streams, paid shows, and the In Conversation archive.

**Right now this is a review build.** It's the real frontend, but with no database: shows come from a snapshot of the live WordPress site, and signing in and RSVPing only happen in your own browser. That lets Social Upgrades and the Slipstream team get the look and the flow right before the database is built. The live site at viewslipstream.com is untouched.

## Links

| What | Where |
|---|---|
| **Staging site (review here)** | https://staging--viewslipstream.netlify.app |
| Every screen and RSVP state on one page | https://staging--viewslipstream.netlify.app/review/ |
| The three emails | https://staging--viewslipstream.netlify.app/emails/ |
| GitHub repo | https://github.com/mitchelljfern/ViewSlipstream |
| Netlify project | https://app.netlify.com/projects/viewslipstream |
| Netlify deploys (build logs) | https://app.netlify.com/projects/viewslipstream/deploys |
| Admin (Shows tab in the Client Hub) | https://dashboard.socialupgrades.com (Shows in the sidebar) |
| Design canvas (all screens, admin, emails, style guide) | https://claude.ai/artifact/NeWnLfEuZjPmmgYnaC5eH2 |
| Current live site (WordPress, don't change) | https://viewslipstream.com |
| **New site, live version** (not in Google yet) | https://viewslipstream.netlify.app |

## How it's wired

- GitHub is linked to Netlify. Pushing to a branch is how you deploy; nobody uploads anything to Netlify by hand.
- `staging` is the one shared workspace. Social Upgrades, the Slipstream team and anyone's AI assistant all push here, and the staging site rebuilds in a minute or two. It has no password (nothing on it is secret yet) and costs no production credits.
- `main` is the live site. Only Mitchell updates it. A GitHub ruleset ("Live site: Mitchell only") enforces this, so everyone else gets "push declined" if they try.
- Any other branch builds nothing unless it has a pull request (`ignore` in `netlify.toml`), so experiments cost nothing.
- `staging` is the default branch on GitHub, so new pull requests point at it automatically.

## Going live (Mitchell only)

1. Check the staging site.
2. Open https://github.com/mitchelljfern/ViewSlipstream/compare/main...staging?expand=1 and click **Create pull request**, then **Merge pull request**.
3. Netlify builds `main` and https://viewslipstream.netlify.app updates in a couple of minutes. That's the only step that uses a production deploy.

## Giving people access (Mitchell)

- **GitHub:** ViewSlipstream > Settings > Collaborators > Add people, with **Write** access. They can push to `staging` and open pull requests, but can't touch `main`.
- If a push from someone outside the Netlify team ever shows "Pending approval" on the Deploys page, approve it once.

## How to review

1. Open the staging site.
2. Use the white **Review** button (bottom right) to switch between a guest and a signed-in viewer, mark yourself RSVP'd, and pretend it's before, during or after the current show. "Signed in + RSVP'd + During" shows the screening room with the player and the viewing password.
3. Try it on your phone first. Most viewers will be on one.
4. Leave feedback on the design canvas, or send it to Social Upgrades through the Client Hub.

Nothing you do on staging is saved anywhere except your browser, and no emails are sent.

## Where changes go (read this before changing anything)

| Branch | What happens when you push | Who |
|---|---|---|
| `staging` | Netlify builds it and updates the staging site. No production credits used. | Anyone on either team |
| `your-name/what-you-changed` + a pull request into `staging` | Netlify builds a private preview link on the pull request. | Recommended for anything bigger than a text fix |
| `main` | **Live site** (https://viewslipstream.netlify.app). GitHub blocks everyone but Mitchell. | Mitchell only |

Rules for everyone, people and AI assistants alike:

- **Only ever push to `staging` or to a branch with a pull request into `staging`.**
- **Never push to `main`, never merge into `main`, and never run `netlify deploy --prod`.** That's Mitchell's step. Production deploys use Netlify credits, so everything gets checked on staging first.
- Don't create new Netlify projects or change Netlify settings. Ask Mitchell.
- Don't touch the WordPress site.

AI assistants: the same rules, with more detail, are in [CLAUDE.md](./CLAUDE.md). Claude Code reads it automatically.

## Making a change, step by step

```bash
git clone https://github.com/mitchelljfern/ViewSlipstream.git
cd ViewSlipstream
git checkout staging          # always start from staging
git pull
npm install
npm run dev                   # http://localhost:3000, with the Review button

# ...make the change...

npm run build                 # must pass before you push
git checkout -b yourname/short-description
git commit -am "Say what changed and why"
git push -u origin yourname/short-description
# open a pull request into `staging` (not main). Netlify posts a preview link on it.
# small fixes can go straight to staging: git checkout staging && git merge ... && git push
```

When the pull request is merged into `staging`, the staging site updates in a minute or two.

## What's where

```
src/app/                 pages (one folder per URL)
  page.tsx               home
  [slug]/page.tsx        every show page, old WordPress addresses included (/spider-noir/)
  sign-in/  account/  in-conversation/  previous-titles/  emails/  review/
src/components/          the parts: header, RSVP card, show page, video facade, review toolbar
src/lib/data.ts          the ONLY place pages read content from (swap for Supabase in phase 2)
src/lib/time.ts          show phases (upcoming, live, closed), dates in Pacific time
src/data/*.json          snapshot of the live site: 19 featured shows, 250 archive titles, 148 conversations
src/app/globals.css      colors, type, buttons, chips, layout (mobile first, full width on big screens)
scripts/                 data import from WordPress, staging deploy helper
docs/BRIEF.md            the full redesign brief (flow, emails, show types, admin, decisions)
netlify.toml             build settings, which branches build, old-URL redirects
```

Design system: black ground, Slipstream blue `#1E73BE`, deep blue `#003972` for the RSVP and newsletter panels, white. Outfit for headings, Figtree for everything else. Buttons are 52px tall on phones. The layout has no maximum width, so it fills big monitors for a movie night; the player sizes itself to the screen height.

Every video (trailers, conversations, the show itself) loads as a thumbnail first and only starts the real player on tap. That's what fixed the slow In Conversation page: 148 videos, zero players until someone presses play.

## Refreshing the content snapshot

The JSON in `src/data` was built from the live WordPress site on Nov 1, 2026. To refresh it, see `scripts/README.md`. In phase 2 this goes away: shows will be created in the Client Hub and read from the database.

## Roadmap

1. **Now: review build.** Frontend only, on staging. Both teams dial in the look and the flow.
2. **Database.** Slipstream gets its own Supabase project in an account Slipstream owns and pays for, with Social Upgrades invited as a Developer. Tables: shows, rsvps, accounts, email sends, payments, conversations. `src/lib/data.ts` and the review toolbar's fake sign-in are replaced; pages stay the same.
3. **Emails** (RSVP confirmation, "It's showtime", Thank you) on Resend from viewslipstream.com, sent on schedule by the database, logged for the Client Hub.
4. **DaCast** embed and password per show, shown only to signed-in guests with an RSVP during the window. **Stripe** Checkout for paid shows. **YouTube Live** for live streams.
5. **Admin.** The Shows tab in the Client Hub (dashboard.socialupgrades.com) switches from sample data to the real database. Launch shows, see every email past and upcoming, payments and guests.
6. **Launch.** Migrate WordPress accounts, point viewslipstream.com at Netlify, keep every old URL working, and drop the noindex header. Mitchell does this step.

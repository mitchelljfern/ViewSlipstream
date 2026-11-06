# Slipstream (viewslipstream.com) redesign brief and build spec

Prepared Oct 16, 2026 for Social Upgrades. This file is meant to be dropped into the project as `CLAUDE.md` (or linked from it) when the build moves to Claude Code. Everything in it comes from a walk-through of the live site plus Mitchell's requirements. The approved visual direction lives in the "Slipstream Redesign" Design canvas in Claude (13 artboards: 8 mobile, 3 desktop, emails, style guide).

## 1. What Slipstream is

Slipstream is a Los Angeles screening platform run by Satiated Productions / Slipstream LLC. It hosts feature films and series episodes for awards-season and press audiences. Guests RSVP (which creates an account), then watch the title inside a password-protected DaCast embed on the site during a fixed window. Some programs are in-person screenings at LA theaters, some are giveaways, some are YouTube live streams, and occasionally a show is paid. Nearly every show is followed by a recorded "In Conversation" Q&A with the filmmakers, which stays on the site permanently.

The client likes the current flow. Users are used to it. The redesign changes how it looks and how fast it is, not what it does.

## 2. Current stack (observed on the live site)

WordPress with the Salient theme 13.0.5 and WPBakery Page Builder. Accounts are Ultimate Member 2.8.6 (login at /login/, register at /rforme/, account at /account/). RSVPs are Events Made Easy bookings (form fields: first name, last name, email; one seat per booking; capacity enforced, "This event has reached capacity" when full). Newsletter popup is Popup Maker; contact is Contact Form 7; reCAPTCHA v2 on forms. Trailers are YouTube iframes. In Conversation videos are Vimeo iframes. The feature itself is a DaCast embed with DaCast's password gate, shown only inside the show window to signed-in RSVP'd users. Fonts today: Titillium Web (body), Fira Sans (headings), some Roboto and Open Sans. Colors today: black ground, white text, Slipstream blue #1E73BE, deep blue #003972 on section bands, grey #777 for captions.

Mitchell can connect the WordPress install so Claude Code can see the theme code, the show template, and how new shows get added. Do that before building so the admin workflow (how a show is created, how the DaCast embed and password are entered, how the email triggers fire) is reproduced exactly.

## 3. The user flow that must be preserved

1. Home shows the current program ("Now Showing") first, then featured titles grouped by month or series, then In Conversation, then newsletter and contact. Every month or series row fills the full width with no empty space: up to 5 posters per row, and a row of 1 or 2 shows uses big horizontal cards (6 = 4 + 2, 7 = 5 + 2).
2. A show page has: a key art hero, the date window or venue line, the trailer, "About the show", and an RSVP section. Today a "SCROLL DOWN TO RSVP" band sits under the header.
3. RSVP does not require an account (client feedback, Nov 2026). Signed out, the RSVP form is first name, last name and email; the email goes on that show's RSVP list and gets the emails below. Right after RSVPing, the card offers a free account: they only pick a password. Signed in, the RSVP is one tap with the account details prefilled. In-person shows let a guest book more than one seat per email (the show sets the limit, usually 2) and switch to a waiting list when full; waiting list guests get a "you're on the waiting list" email and a confirmation if seats open. Watching does: a streaming show's screening room needs a signed-in Slipstream account (client requirement, Nov 6 2026). A guest who RSVP'd without one is asked to set a password (their name and email are already in) or sign in when the show goes live, and the RSVP form has an optional "Create a free account" checkbox so they can do it up front. Never show an email's contents on the site (no "see the email" links): guests must open the real email, so the email list stays real and open and click rates mean something. How the access code is delivered (on the page, in the email, or both) is still the client's call; the Review switch shows each.
4. Three transactional emails, all required: (a) RSVP confirmation immediately, (b) "show is now live" when the window opens, containing viewing instructions and the DaCast password, (c) thank-you when the window closes.
5. When the window is open and the user is signed in and RSVP'd, the show page shows the DaCast embed. The password is entered in the DaCast player (the client is used to this and wants to keep DaCast).
6. After the window, the show page says "No longer available" and the In Conversation recording remains.
7. Nav when signed out: SIGN IN, REGISTER. Nav when signed in: NOW SHOWING, ACCOUNT, SIGN OUT. The redesign adds UPCOMING and keeps PREVIOUS TITLES and IN CONVERSATION reachable from the menu on every page.

## 4. Show types (each is a variant of the same show template)

Streaming (default): DaCast embed, password, date window with start time and closing time in Pacific. In person: venue name and address, "limited number of seats", capacity, no embed, "get directions" link. Giveaway: "Enter for a chance to win", entry closes on a date, winners emailed. Live stream: a YouTube Live embed, no password, "Live now" state, optional replay window. Paid: Stripe Checkout, a price, a receipt in the account page, and the ticket unlocks the embed for every device on the account. A show can combine types (for example an in-person screening that also has a giveaway).

Model this as one `show` post type with a `show_type` field plus the fields each type needs, rather than separate templates.

## 5. Design decisions (approved direction on the canvas)

Keep the colors: black #000000 ground, Slipstream blue #1E73BE for primary buttons and chips, deep blue #003972 for the RSVP panel and newsletter panel, white text. Add #111214 for cards, #1A1D21 for image wells, #4A9BE3 for text links on black (4.5:1), #A9AFB7 for muted text in place of #777, and #E5484D used only as a 6 px "live" dot. No gradients, no glassy washes.

Replace the fonts with Outfit (600) for headlines, eyebrow labels and chips, and Figtree (400/600) for body, buttons and nav. Both are on Google Fonts. Display sizes 44 to 64 px on desktop and 28 to 30 px on mobile, tracking minus 2 percent. Body 16/1.6, never below 13 px. Inputs use 16 px text so iOS does not zoom.

Parts: buttons are 52 px tall on mobile with a 14 px radius and are full width inside panels; cards have a 16 px radius and a hairline border at 10 percent white; status chips are pill-shaped uppercase Outfit 11 px and come in exactly three looks (blue fill, white fill, outlined) so they read by lightness rather than hue; posters are 2:3 and key art and video are 16:9, both with a 12 px radius.

Mobile rules: one primary action per screen (RSVP on a show page); 44 px minimum touch targets; menu and sign-in top right; a blue "RSVP is open · Jump to RSVP" strip under the header on show pages replacing the old "SCROLL DOWN TO RSVP" text; posters in a two-up grid with 12 px gaps (the current single column leaves half the screen empty and the section headings collide with the sticky header); the home page carries zero iframes.

Nav labels: signed out shows a "Sign in" secondary button and a "Create account" primary; signed in shows an avatar-initials "Account" button and a quiet "Sign out". The menu lists Now showing (with a date or a live dot), Upcoming, Previous titles, In conversation, and Account when signed in.

## 6. Pages and what each must contain

Home: hero for the current program with type chips, title, date or venue, Q&A line, primary RSVP button and secondary "Watch the trailer" (a facade: key art with a play button that swaps in the YouTube iframe on click). Upcoming row. Featured titles grouped by series or month with filter chips. In Conversation teaser (three cards, facades). Newsletter panel and contact card. Footer with socials (Instagram @slipstream00, TikTok @slipstream000, Threads @slipstream00) and the Satiated Productions line.

Show page: as in section 3, with a facts card (date/time, venue or window, Q&A guests), the RSVP panel in deep blue, a "What happens after you RSVP" three-step list that explains the three emails, and a "More in this series" row. On desktop the RSVP panel is a sticky right-hand aside.

Now Showing (signed in, window open): DaCast player at the top, "Now showing" chip plus "You're in" chip, a viewing-password card with a copy button and a note that the password is also in the email, an "Available until" countdown with an add-to-calendar link, the synopsis, the conversation card, a "Trouble watching?" help card, and an "Up next" card.

Sign in: email and password, show-password toggle, "Keep me signed in" checked by default, forgot link, and an "Email me a sign-in link" magic-link option. A context card at the top says which show the user was about to RSVP for and returns them there afterwards. There is no separate registration page; creating an account happens inside the RSVP panel. Keep /rforme/ and /login/ as redirects so old links still work.

Account: name and email with edit, "Your RSVPs" list (now showing with a Watch button, upcoming confirmed, giveaway entered), past shows attended, email settings (show emails always on; closing reminder and newsletter toggles), change password, receipts for paid shows, delete account, sign out.

In Conversation archive: see section 8.

Previous titles: the same grouped poster grid as home, paginated or "show more" at 24 per page, with the series filter chips.

## 7. Email system (required, build first)

Triggers: RSVP created, show window opened, show window closed. Optional fourth: 24 hours before closing, controlled by the user's account toggle. Send through a transactional provider (Resend is already connected for Social Upgrades; Postmark or SES also fine), never through wp_mail alone, and log every send against the user and show so the admin can see who received what.

Templates (on the canvas): same black header band with the logo and a state label, white body, one blue button, same footer with "Email preferences". Subjects: "You're in: {Title} on Slipstream", "It's showtime: {Title} is streaming now", "Thank you for watching {Title}". The live email contains a signed "Watch now" link that signs the user in and lands on the player, and the DaCast password in a copyable box. Giveaway, in-person and paid variants swap the middle block (entry received / seat confirmed with directions / receipt).

Scheduling: the window open and window close sends must fire at the show's stored start and end times in America/Los_Angeles, via a real cron (system cron hitting wp-cron, or Action Scheduler), not the default WordPress pseudo-cron, because sends must be on time even if nobody visits the site.

## 8. In Conversation page performance (reported issue)

The page at /in-conversations/ currently embeds every Vimeo player at once (over 100 iframes), which is why it loads so slowly. All videos must stay available. Fix:

Make each conversation its own post type entry (title, guests, series, date, Vimeo ID, duration, show link) so the page is data-driven instead of hand-edited. Render thumbnails only (Vimeo's oEmbed gives the thumbnail URL; cache it as a local image). A play button swaps in the single iframe for the card that was clicked. Show 12 per page with "Show 12 more" (or infinite scroll) and group by series. Add search and filter chips by series and year. Lazy-load the thumbnails with `loading="lazy"`. Add the latest conversation to the matching show page automatically. Result: the archive page carries zero iframes until a click, and first paint drops from tens of seconds to under two.

The same facade pattern applies to trailers on show pages and to the DaCast player (render the poster, load DaCast when the user taps play or the window is open).

## 9. Build approach

Stay on WordPress since the client's admin workflow and content live there. Preferred path: a custom block theme (or a lean child theme) replacing Salient and WPBakery, with the design tokens in theme.json, Ultimate Member replaced by native WordPress users plus a small custom RSVP table (or kept if migration risk is too high; decide after reading the install), Events Made Easy replaced by the `show` post type with an `rsvp` table (user_id, show_id, type, status, seat, stripe_payment_id, created_at). Stripe Checkout for paid shows via webhook to mark the RSVP paid. YouTube Live via the show's `youtube_live_id`. DaCast via the show's `dacast_embed_id` and `dacast_password`, with the embed only rendered for signed-in users whose RSVP status is confirmed and while now() is inside the window.

Migration must carry over all users, all past RSVPs, every show with its poster and copy, every conversation video, and keep every existing URL (show slugs, /previous-titles, /in-conversations/, /account/, /login/, /rforme/) working with redirects where the path changes.

Performance budget: Lighthouse mobile 90+ on home and show pages, no third-party iframe on first paint anywhere, images served as WebP with srcset, fonts self-hosted with `font-display: swap`.

Accessibility: every control is a real button, link or labeled input; chips are not the only signal of state (text says it too); contrast 4.5:1 for text; focus rings visible on the black ground.

## 10. Admin panel: the Shows tab in the Social Upgrades Client Hub

Added Oct 16, 2026. Show management does not live in wp-admin. It lives at dashboard.socialupgrades.com (the Client Hub: a React app on Supabase, built on the Social Upgrades design system, Poppins body and Outfit headings, navy sidebar, cloud page background, white cards) as a new sidebar item, Shows, scoped to the Slipstream client. Six screens are on the canvas in the "Admin" row.

Shows overview: four tiles (live now, RSVPs on the live show against capacity, emails scheduled with the next send time, revenue last 30 days), a Live now card with Open show, Copy password and Extend window, an Upcoming and drafts table (title, type, window or date, RSVPs with a progress bar, status, Manage), and a Past shows table (closed date, RSVPs, watched percentage, thank-you sent with open rate). Sub-tabs across the top: Shows, Emails, Payments, Guests, Settings.

Launch a show: one form in five numbered sections. Basics (title with auto slug, series or group, trailer YouTube link, about text, conversation line, poster 2:3 and key art 16:9 uploads). Show type as five radio cards (Streaming, In person, Giveaway, Live stream, Paid) whose fields swap: DaCast embed ID plus viewing password with a Generate button and a toggle for showing the password on the site to RSVP'd guests; venue and capacity; prize and entry close; YouTube Live ID; Stripe price. Schedule (RSVP opens, window start, window end, Pacific time fixed, optional capacity, page visibility: now as Upcoming or when RSVP opens). Emails (the three sends listed with their computed times, Preview and Edit copy per row, the optional closing reminder toggle, and Send all three to me as a test). Conversation (Vimeo link, fetch thumbnail, add any time). A sticky right rail holds a publish checklist (8 items, Publish stays disabled until complete, except the DaCast embed which can be added after publishing as Upcoming) and a live phone preview of the show page.

Live show detail: status header with countdown, window, URL and password, buttons View on site, Edit show, Resend "It's showtime". Tiles for RSVPs, watched (with average watch time from DaCast analytics), showtime open rate, support requests. A Guests table for this show (RSVP'd date, watched, showtime email status, Resend or Fix email), search, filter, Export CSV, pagination. Right rail: email timeline (sent and scheduled with open rates) and a Window card with Extend 24h and Close now (closing early sends the thank-you immediately and hides the player).

Emails tab: tiles (scheduled, sent last 30 days, open rate, sending health with domain verification and bounce rate), an Upcoming queue table with Preview, Pause and Send now, a Sent table with delivered, opened, clicked and bounced counts and a per-send report, and six shared templates (RSVP confirmation, It's showtime with streaming, in-person and live variants, Thank you, Closing soon, Giveaway entry and winner, Paid receipt) with Edit and Test. Templates use variables: {title}, {window}, {password}, {watch_link}, {venue}.

Payments tab: tiles (revenue net of fees, tickets sold, refunds, next payout), revenue by show, a Stripe connection card (account, live mode, Checkout with Apple Pay and Google Pay, webhook health, receipts sent by the hub), and a transactions table with Refund. A refund releases the ticket, removes player access and emails a refund receipt.

Guests tab: tiles (accounts, new this month, newsletter opted in, regulars with 3+ shows), a searchable, filterable accounts table, and a guest detail panel with RSVP history, email log with open and click status, preferences, Resend last email, Send sign-in link, Export their data and Delete account. Export to newsletter list pushes to the newsletter provider.

Buttons in the hub follow the design system's black square button for primary actions (the hub's current green button puts white text at about 2.8:1, which the design system itself flags), with green reserved for Live and Healthy status.

Architecture decision this forces: if shows are created in the Client Hub, the show, RSVP, email log and payment records live in Supabase, and viewslipstream.com reads them. Two ways to do that. (a) Keep WordPress as the front end and have the theme fetch shows from Supabase (REST, with the DaCast embed and password served only to signed-in RSVP'd users through an edge function), with WordPress users replaced by Supabase Auth. (b) Move the public site off WordPress to a Next.js or similar front end on the same Supabase project, keeping the old URLs via redirects. Option b is cleaner (one auth system, one database, one email pipeline, no wp-cron) and the redesign already replaces the theme, so the recommendation is b unless the client needs to keep editing pages in WordPress. Decide this before any code. Either way the email scheduler runs on Supabase cron plus edge functions calling Resend, and every send is logged to a sends table the Emails tab reads.

## 11. Open questions for the client

Confirm the DaCast password should still be entered by the viewer in the player (the design shows it in a copy box and in the email), or whether DaCast's referrer or token restrictions could replace the password while keeping the DaCast player. Confirm the in-person capacity number and whether "release your seat" should be allowed. Confirm giveaway rules copy (entries per account, close time, how winners are notified). Confirm whether a paid show should also allow a free RSVP tier. Confirm the newsletter provider so the newsletter form posts to it directly.

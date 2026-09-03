# Operating playbook: from bot output to conversations with coaches

## The channel

Everything the bots find lands in one place: a Google Sheet called
**Coach Groups · Lead Tracker**. It is the system of record; Grok emails
are the delivery channel, not the storage.

1. Create the sheet: Google Sheets → File → Import → upload
   `lead-tracker-template.csv`. Freeze the header row, add a filter.
2. `status` column uses exactly: `new` → `requested` → `joined` →
   `posting` → `lead-source`, or `not-a-fit`. Add a data-validation dropdown.
3. Automations deliver by email. Make a Gmail filter: from Grok, subject
   contains "Logbook ·" → label `Grok bots`, skip inbox. Monday morning you
   open one label and see five digests.
4. Optional team channel: if you use Slack, add its email-to-channel
   integration and forward the digests to `#coach-groups` so co-founders or
   contractors see them. Discord: same idea via a Zapier/Make mailhook.
   Neither is required. The sheet is the source of truth.

## Getting a CSV block into the sheet

Copy the CSV block (without the ``` fences) → click cell A1 of a scratch
tab → paste → Data → **Split text to columns** → Detect automatically.
Copy the rows into the tracker, adding the `bot` column by hand and setting
`status = new`. Every two weeks, download the tracker as CSV, rename it
`groups-seen.csv`, and re-upload it to each Workspace so the bots stop
re-finding the same groups.

## Weekly cadence (about 90 minutes)

| When | What |
|------|------|
| Mon 07:00 | Five Automations run (one per finder bot). Digests arrive by email. |
| Mon | Paste new rows into the tracker. 15 min. |
| Tue | Run the Verifier bot on every `new` row with a URL (10 per prompt). Update `verified`, drop SKIPs to `not-a-fit`. 20 min. |
| Wed | Request to join the top 5 by fit × members that you are not in yet. Answer the join questions honestly (you are a founder building a tool for coaches; most admins are fine with that if you do not pitch). `status = requested`. |
| Ongoing | When approved: `status = joined`, `joined_on`. Read the rules. Read the last 20 posts before posting anything. |
| Fri | One value-first post in 2–3 joined groups where the rules allow. `status = posting`, `first_post_on`. |

## Posting rules (so you do not get banned in week one)

- Read `promo_policy` first. "No promo" means no links, no product name,
  ever. Many groups have promo days; use those.
- First post is never about Logbook.fit. It is a question or a useful
  artifact. Links to your site only when someone asks, or on promo days.
- One post per group per week, maximum. Reply to every comment.
- DM only people who reply to you or ask. Never mass-DM members.
- **Do not automate anything on Facebook.** No auto-join, no scraping
  members, no scheduled bot posts from a fake account. Meta bans for this
  quickly and it poisons the groups you want to be welcome in. The Grok
  bots research; you show up as a person.

## Three value-first posts that fit the product's story

**1. The quiet-client question**
> Coaches with 10+ clients: how do you notice someone is drifting *before*
> they cancel? I used to spot it two weeks late in a WhatsApp thread. Now I
> track "days since last real check-in" for everyone. Curious what signals
> you watch.

**2. The check-in template (give it away)**
> My weekly check-in is three questions and it cut my churn noticeably:
> 1) Effort this week 1–10, 2) How does your body feel, 3) One thing you
> want me to change. Clients answer in 60 seconds, I reply within a day.
> Happy to share the full template if useful.

**3. The retention math**
> Losing one $200/mo client is $2,400/yr. Most coaches spend that on ads to
> replace them and $0 on noticing them earlier. What's your retention
> routine? Genuinely collecting ideas.

When someone asks what you use, that is the moment to mention you are
building Logbook.fit for exactly this and offer a beta invite (the
waitlist at logbook.fit).

## What to measure

Per group, in the tracker `notes`: replies per post, DMs received, waitlist
signups you can attribute (ask "where did you hear about us" on the
waitlist form). After four weeks, keep posting only where a post gets
replies. Three groups that talk beat twenty that ignore you.

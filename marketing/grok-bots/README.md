# Grok bots: finding US Facebook groups full of coaches

Six Grok bots, no code and no API. Each bot is a **Grok Workspace** with its
own custom instructions plus a **weekly Automation** that searches the web
and emails you a CSV of Facebook groups where Logbook.fit's future users
(independent fitness coaches) already hang out. Results go into one Google
Sheet; you do the joining and posting as a human.

| Bot | File | Hunts for |
|-----|------|-----------|
| Independent personal trainers | `bots/pt-independent.md` | PTs running their own client roster |
| Online fitness coaches | `bots/online-coaching.md` | Online and hybrid coaches |
| Strength & conditioning coaches | `bots/strength-coaches.md` | S&C, powerlifting, weightlifting, CrossFit coaches |
| Nutrition & health coaches | `bots/nutrition-hybrid.md` | Nutrition coaches who also program training |
| Small gym & studio owners | `bots/gym-studio-owners.md` | Owners who coach and care about retention |
| Verifier | `bots/verifier.md` | Re-checks every URL before you act on it |

## Setup (about 45 minutes, once)

You need a Grok account at grok.com (Automations are available on every
plan; email triggers need SuperGrok, which these bots do not use).

1. **Lead tracker.** Google Sheets → File → Import → `lead-tracker-template.csv`.
   This is the channel where everything lands. Details in `playbook.md`.
2. **For each of the five finder bots** (open its file under `bots/`):
   1. Grok → Workspaces → New. Name: `Logbook · <bot name>`.
   2. Custom instructions → paste section 1 of the bot file.
   3. Upload `product-brief.md` to the Workspace.
   4. Run the kickoff prompts in section 2, one at a time. Paste each CSV
      block into the tracker. Expect 10–20 groups per prompt, with overlap.
   5. Grok → Automations → New. Paste section 3. Schedule weekly, Monday
      07:00 your time. Deliver by email + app notification.
3. **Verifier.** Create its Workspace from `bots/verifier.md` section 1.
   No Automation; you run it by hand on new rows.
4. **Gmail filter** for the digests (see `playbook.md`).

After the kickoff runs you should have 60–120 candidate groups across the
five bots before dedup, and a first shortlist within the hour.

## How the bots work

- Every answer is a CSV block with a fixed header, so it pastes straight
  into the sheet. Columns: name, url, privacy, members, region, audience,
  fit (1–5), promo_policy, activity, confidence, sources, notes.
- The fit rubric is in `product-brief.md` and repeated in every prompt:
  5 = independent coaches with their own roster talking client management
  and business, down to 1 = poor fit.
- Bots are told never to invent URLs (they write `NONE`), to stay US-only,
  to skip enthusiast and find-a-trainer groups, and to skip anything in
  `groups-seen.csv` (your tracker export, re-uploaded every two weeks).
- Weekly Automations rotate through 12 regions by ISO week number, so all
  five bots cover the same metro in the same week (`regions.md`). Any
  region can also be run by hand: `Run your search for Texas.`

## Files

```
marketing/grok-bots/
├── README.md                 this file
├── playbook.md               channel setup, weekly cadence, posting rules, post templates
├── product-brief.md          upload to every Workspace
├── regions.md                the 12-week region rotation (+ second lap)
├── lead-tracker-template.csv header for the Google Sheet
└── bots/
    ├── pt-independent.md
    ├── online-coaching.md
    ├── strength-coaches.md
    ├── nutrition-hybrid.md
    ├── gym-studio-owners.md
    └── verifier.md
```

## Tuning

- Bot returns enthusiast groups: tighten the TARGET line in its
  instructions and add "skip groups whose name mentions weight loss,
  challenge, or accountability buddies".
- Bot keeps returning the same groups: re-upload a fresh `groups-seen.csv`.
- Too few results for a metro: that is real; most coach communities are
  national. Let the rotation move on.
- Custom instructions are capped at about 4,000 characters in Grok; every
  bot file stays under that.

## Guardrails

The bots only research the public web. Nothing here logs into Facebook,
joins groups, scrapes members, or posts. Automating a Facebook account is
against Meta's terms and gets accounts banned; the playbook keeps the
human parts human. Grok can hallucinate: the Verifier and your own eyes
are the last check before you invest time in a group.

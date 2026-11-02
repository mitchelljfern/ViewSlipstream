"""
Build the review-phase data files (src/data/*.json) from a cache of the live
WordPress site. This is a one-way snapshot used until Supabase holds the real
data; re-run it to refresh.

Cache layout (see scripts/README.md for the curl commands that fill it):
  home.html, prev.html, slugmap.json, previous.json,
  conversations-full.json, shows-scraped.json

Usage: python3 scripts/build_data_from_wordpress.py <cache_dir> src/data
"""
import json, os, re, sys
from datetime import datetime
from zoneinfo import ZoneInfo

PT = ZoneInfo("America/Los_Angeles")
CACHE, OUT = sys.argv[1], sys.argv[2]
load = lambda n: json.load(open(os.path.join(CACHE, n), encoding="utf-8"))

ACRONYMS = {"USA", "AI", "LFG", "F1", "LALIFF", "LACMA", "MGM", "TV", "II", "III", "IV", "DJ", "NYC", "LA", "UK", "US", "HBO", "FX", "AMC", "BBC", "SNL", "VR", "OK"}
SMALL = {"a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "nor", "of", "on", "or", "the", "to", "vs", "with"}
TITLE_FIX = {
    "ha-chan-shake-your-booty": "Ha-Chan, Shake Your Booty!",
    "youre-killing-me": "You're Killing Me",
    "jury-duty-presents-company-retreat": "Jury Duty Presents: Company Retreat",
    "the-boys-season-5": "The Boys, Season 5",
    "wicked-one-wonderful-night": "Wicked: One Wonderful Night",
    "john-candy-i-like-me": "John Candy: I Like Me",
    "the-ai-doc-or-how-i-became-an-apocaloptimist": "The AI Doc: Or How I Became an Apocaloptimist",
    "traitors": "The Traitors",
}

def smart_title(t):
    t = t.replace("’", "'").replace("&#038;", "&").strip()
    if t != t.upper():
        return t
    words = re.split(r"(\s+)", t)
    out, first = [], True
    for w in words:
        if not w.strip():
            out.append(w); continue
        core = re.sub(r"[^\w#]", "", w)
        if core.upper() in ACRONYMS or re.search(r"\d", core):
            out.append(w)
        elif not first and core.lower() in SMALL:
            out.append(w.lower())
        else:
            out.append("-".join(p[:1].upper() + p[1:].lower() for p in w.split("-")))
        first = w.endswith(":")
        if first is False and out and len(out) == 1:
            first = False
    s = "".join(out)
    return re.sub(r"(:\s+)(\w)", lambda m: m.group(1) + m.group(2).upper(), s)

MONTHS = "JANUARY FEBRUARY MARCH APRIL MAY JUNE JULY AUGUST SEPTEMBER OCTOBER NOVEMBER DECEMBER".split()

def pt(y, mo, d, h=0, mi=0):
    return datetime(y, mo, d, h, mi, tzinfo=PT).isoformat()

def parse_time(s):
    s = s.strip().lower().replace(" ", "")
    if s.startswith("midnight"):
        return (23, 59)
    m = re.match(r"(\d{1,2})(?::(\d{2}))?(am|pm)", s)
    if not m:
        return (19, 0)
    h, mi = int(m.group(1)) % 12, int(m.group(2) or 0)
    return (h + (12 if m.group(3) == "pm" else 0), mi)

def parse_window(line, year):
    # "NOVEMBER 5, 2026 | 7pm - NOVEMBER 11, 2026 | MIDNIGHT"
    m = re.match(r"(\w+) (\d+), (\d{4}) \| ([\w:]+) - (\w+) (\d+), (\d{4}) \| ([\w:]+)", line or "", re.I)
    if m:
        a = pt(int(m.group(3)), MONTHS.index(m.group(1).upper()) + 1, int(m.group(2)), *parse_time(m.group(4)))
        b = pt(int(m.group(7)), MONTHS.index(m.group(5).upper()) + 1, int(m.group(6)), *parse_time(m.group(8)))
        return a, b
    # "Sunday, October 18, 3:00pm at Harmony Gold Theater, ..." / "Thursday, September 17 - 7:00pm at ..."
    m = re.match(r"\w+, (\w+) (\d+)(?:,| -) ([\d:]+[ap]m)", line or "", re.I)
    if m:
        a = pt(year, MONTHS.index(m.group(1).upper()) + 1, int(m.group(2)), *parse_time(m.group(3)))
        return a, None
    return None, None

def split_venue(v):
    if not v:
        return None
    v = v.replace(" - ", ", ", 1)
    name, _, addr = v.partition(", ")
    return {"name": name.strip(), "address": addr.strip()}

scraped = load("shows-scraped.json")
slugmap = load("slugmap.json")
convs = load("conversations-full.json")

# The newest conversations sit on the homepage as DaCast VOD embeds (account
# 54752beb-...), in this order, captioned in the homepage text.
DACAST_ACCOUNT = "54752beb-77ac-05c9-ca8d-0e34951e73ed"
DACAST_CONVS = [
    ("944edac9-49a3-4c57-8257-45c67efd3290", "widows-bay", "Widow's Bay: creator and executive producer Katie Dippold, director and executive producer Hiro Murai, featured cast and executive producer Matthew Rhys, and featured cast Stephen Root"),
    ("be7cb10a-7d69-4596-8070-e0ecbb679f00", "the-boys-season-5", "The Boys: supervising stunt coordinator and second unit director John Koyama, costume designer Michael Ground, and specialty costume designer Laura Jean (LJ) Shannon. Moderated by Coy Jandreau"),
    ("e7cee77f-7c18-4aca-b1bf-a9b555a331dc", "jury-duty-presents-company-retreat", "Jury Duty: Company Retreat with executive producer and writer Anthony King"),
    ("710b94cf-6ad8-4457-af9e-2ee1ce392fb5", "spider-noir", "Spider-Noir: cinematographer Darran Tiernan, production designer Warren Alan Young, and co-showrunner, executive producer and writer Oren Uziel"),
]

def norm(t):
    return re.sub(r"[^a-z0-9]", "", t.lower())

def conv_for(title, slug=None):
    for cid, sl, _ in DACAST_CONVS:
        if slug and sl == slug:
            return cid
    key = norm(title)
    if len(key) < 3:
        return None
    for c in convs:
        if key in norm(c["title"]):
            return c["vimeoId"]
    return None

PARTNERS = {"lacma-logo": {"name": "LACMA", "logo": None}, "the-last-bookstore-logo": {"name": "The Last Bookstore", "logo": None}}

shows, seen = [], set()
for g in scraped["groups"]:
    for slug in g["slugs"]:
        if slug in seen:
            continue
        seen.add(slug)
        s = scraped["shows"][slug]
        year = int((slugmap.get(slug) or {}).get("date", "2026")[:4])
        title = TITLE_FIX.get(slug) or smart_title(s["title"])
        start, end = parse_window(s["dateLine"], year)
        venue = split_venue(s.get("venue"))
        about = [p for p in s["about"] if not p.lower().startswith(("viewing instructions", "this show is taking place", "this screening is taking place"))]
        partner, title_art = None, None
        for img in s["images"]:
            if not img:
                continue
            for k, v in PARTNERS.items():
                if k in img:
                    partner = {"name": v["name"], "logo": img}
            if re.search(r"(_TT|TT1|/1-1\.png|ezgif)", img):
                title_art = img
        kind = "giveaway" if slug == "klara-and-the-sun" else ("in-person" if venue else "streaming")
        shows.append({
            "slug": slug, "title": title, "series": g["title"], "kind": kind,
            "startsAt": start, "endsAt": end,
            "venue": venue, "about": about, "conversationLine": s.get("conversationLine"),
            "trailerYoutubeId": s.get("trailerYoutubeId"), "heroImage": s.get("heroImage"),
            "poster": s["poster"], "posterRatio": round(s["posterW"] / s["posterH"], 3) if s["posterH"] else 0.667,
            "partner": partner, "titleArt": title_art,
            "atCapacity": s["state"] == "full",
            "conversationId": conv_for(title, slug),
            "maxSeats": 2 if kind == "in-person" else 1,
        })

# Klara: giveaway copy comes from a different page layout.
for s in shows:
    if s["slug"] == "klara-and-the-sun":
        s.update({
            "startsAt": pt(2026, 10, 13, 9), "endsAt": pt(2026, 10, 30, 12),
            "about": ["Based on the bestselling novel from Nobel Prize-winner Kazuo Ishiguro and written and directed by Academy Award winner Taika Waititi (Jojo Rabbit), Klara and the Sun introduces audiences to Klara (Jenna Ortega), an Artificial Friend who wants nothing more than to find the perfect home.",
                      "Klara and the Sun is in theaters October 23."],
            "giveaway": {"prize": "One of 5 exclusive Klara and the Sun prize packs: a hat, tote bag, sunglasses, pin, book and bookmarks (items may vary).",
                         "winners": 5, "drawOn": "Friday, October 30", "rules": "One entry per email address. Five winners are selected at random and notified by email on Friday, October 30."},
        })
    if s["slug"] == "john-candy-i-like-me" and not s["about"]:
        s["about"] = ["From director Colin Hanks and lifelong John Candy fan Ryan Reynolds comes John Candy: I Like Me, an exploration of the life of the Canadian comedic icon. The film documents his on- and off-camera existence, featuring never-before-seen home videos, intimate access to his family and candid recollections from collaborators."]
        s["conversationLine"] = "The screening will be followed by a conversation with director, producer Colin Hanks; producer Ryan Reynolds; co-executive producers Chris Candy and Jennifer Candy-Sullivan; and editor, producer Shane Reid."

featured_slugs = {s["slug"] for s in shows}
groups = [{"title": g["title"], "slugs": g["slugs"]} for g in scraped["groups"]]

archive_groups = []
for g in load("previous.json"):
    items = []
    for it in g["items"]:
        slug = it["href"].rstrip("/").split("/")[-1]
        meta = slugmap.get(slug, {})
        t = TITLE_FIX.get(slug) or smart_title(meta.get("title") or slug.replace("-", " ").upper())
        items.append({"slug": slug, "title": t, "poster": it["poster"], "conversationId": conv_for(t, slug)})
    archive_groups.append({"title": g["title"], "items": items})

def clean_conv_title(t):
    t = re.sub(r"\s+", " ", t).strip()
    t = re.sub(r"^in conversation with\s+", "", t, flags=re.I)
    # Vimeo titles shout the show name ("TWO PEOPLE EXCHANGING SALIVA filmmakers").
    run = r"[A-Z0-9][A-Z0-9'’:&!.,\-]*(?:\s+[A-Z0-9][A-Z0-9'’:&!.,\-]*)*"
    return re.sub(run, lambda m: smart_title(m.group(0)) if len(m.group(0)) > 3 else m.group(0), t)

hero_by_slug = {sh["slug"]: sh.get("heroImage") or sh["poster"] for sh in shows}
conversations = [{"id": cid, "provider": "dacast", "embed": f"https://iframe.dacast.com/vod/{DACAST_ACCOUNT}/{cid}",
                  "title": cap, "durationSec": None, "thumbnail": hero_by_slug.get(sl), "date": "2026-08-27", "showSlug": sl}
                 for cid, sl, cap in DACAST_CONVS]
conversations += sorted(
    [{"id": c["vimeoId"], "provider": "vimeo",
      "embed": f"https://player.vimeo.com/video/{c['vimeoId']}" + (f"?h={c['hash']}" if c["hash"] else ""),
      "title": clean_conv_title(c["title"]), "durationSec": c["duration"],
      "thumbnail": c["thumb"], "date": c["uploaded"], "showSlug": None} for c in convs],
    key=lambda c: c["date"] or "", reverse=True)

os.makedirs(OUT, exist_ok=True)
for name, data in [("shows.json", shows), ("featured-groups.json", groups),
                   ("archive.json", archive_groups), ("conversations.json", conversations)]:
    json.dump(data, open(os.path.join(OUT, name), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(len(shows), "shows,", sum(len(g["items"]) for g in archive_groups), "archive items,", len(conversations), "conversations")
for s in shows:
    print(f'{s["slug"][:34]:34} {s["kind"]:9} {str(s["startsAt"])[:16]:16} {str(s["endsAt"])[:16]:16} conv={s["conversationId"]} {s["title"]}')

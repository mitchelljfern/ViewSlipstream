"""
Turn every past show page in a WordPress export (Tools > Export > All content,
a WXR .xml file) into a full show record, so old titles get a real page on the
new site: dates, about text, trailer, venue, the conversation line, images.

Writes src/data/history.json. The 19 current shows in shows.json are left
alone; anything already there is skipped here.

Usage: python3 scripts/import_wordpress_export.py <export.xml> src/data

Read-only on the export. Nothing here talks to the live WordPress site.
"""
import base64, json, os, re, sys, urllib.parse
import xml.etree.ElementTree as ET
from datetime import datetime
from html import unescape
from zoneinfo import ZoneInfo

PT = ZoneInfo("America/Los_Angeles")
NS = {"wp": "http://wordpress.org/export/1.2/", "content": "http://purl.org/rss/1.0/modules/content/"}
SRC, OUT = sys.argv[1], sys.argv[2]

# Pages that use the show layout but aren't a show (tests, booklets, helpers).
NOT_SHOWS = {"sample-page", "rsvp-test-page", "test-event", "page-for-dacast", "all-quiet-digital-booklet", "satiated-productions",
             "previous-titles", "in-conversations", "newsletter", "faqs", "events", "upcoming-events"}
# Old address -> the page it duplicates (second screenings, venue variants).
TITLE_FIX = {
    "dont-look-up": "Don't Look Up", "is-that-black-enough-for-you": "Is That Black Enough for You?!?",
    "the-hot-zone-antrax": "The Hot Zone: Anthrax", "1-happy-family-usa": "#1 Happy Family USA",
    "mr-mrs-smith": "Mr. & Mrs. Smith", "obi-wan-kenobi": "Obi-Wan Kenobi", "pen15": "PEN15",
    "tar": "TÁR", "spider-man-across-the-spider-verse": "Spider-Man: Across the Spider-Verse",
    "the-sheep-detectives-the-last-bookstore": "The Sheep Detectives",
    "the-love-hypothesis-the-last-bookstore": "The Love Hypothesis", "hedda-screening": "Hedda",
    "the-great-3": "The Great", "short-film-showcase-2": "Short Film Showcase", "short-film-showcase-3": "Short Film Showcase",
    "academy-award-nominated-short-film-showcase-2": "Academy Award-Nominated Short Film Showcase",
    "academy-awards-contender-short-film-showcase": "Academy Awards-Contender Short Film Showcase",
    "im-a-virgo": "I'm a Virgo", "red-white-royal-blue": "Red, White & Royal Blue",
    "genius-mlk-x": "Genius: MLK/X", "cirque-du-soleil-without-a-net": "Cirque du Soleil: Without a Net",
    "lead-me-home-and-found": "Lead Me Home and Found", "plastic-kills-horror-short-film-contest": "Plastic Kills! Horror Short Film Contest",
    "genius-aretha": "Genius: Aretha", "the-boy-the-mole-the-fox-and-the-horse": "The Boy, the Mole, the Fox and the Horse",
    "f1": "F1", "swarm": "Swarm", "upload": "Upload", "air": "Air", "queens": "Queens", "expats": "Expats",
    "fallout": "Fallout", "bottoms": "Bottoms", "saltburn": "Saltburn", "rustin": "Rustin", "cassandro": "Cassandro",
}
ACRONYMS = {"USA", "AI", "LFG", "F1", "LALIFF", "LACMA", "MGM", "TV", "II", "III", "IV", "DJ", "NYC", "LA", "UK", "US", "HBO", "FX", "MLK/X", "PEN15", "OK"}
SMALL = {"a", "an", "and", "as", "at", "but", "by", "for", "from", "in", "nor", "of", "on", "or", "the", "to", "vs", "with"}
MONTHS = "JANUARY FEBRUARY MARCH APRIL MAY JUNE JULY AUGUST SEPTEMBER OCTOBER NOVEMBER DECEMBER".split()
SKIP_PARA = ("viewing instructions", "to learn about more", "this show is taking place", "this screening is taking place",
             "scroll down", "rsvp", "please note", "sign up for our newsletter", "for more screening events")


def smart_title(t):
    t = unescape(t).replace("’", "'").replace("®", "").strip()
    if t != t.upper():
        return t
    out, first = [], True
    for w in re.split(r"(\s+)", t):
        if not w.strip():
            out.append(w); continue
        core = re.sub(r"[^\w#/]", "", w)
        if core.upper() in ACRONYMS or re.search(r"\d", core):
            out.append(w)
        elif not first and core.lower() in SMALL:
            out.append(w.lower())
        else:
            out.append("-".join(p[:1].upper() + p[1:].lower() for p in w.split("-")))
        first = w.endswith(":")
    return re.sub(r"(:\s+)(\w)", lambda m: m.group(1) + m.group(2).upper(), "".join(out))


def pt(y, mo, d, h=0, mi=0):
    return datetime(y, mo, d, h, mi, tzinfo=PT).isoformat()


def parse_time(s):
    s = s.strip().lower().replace(" ", "").replace(".", "")
    if s.startswith(("midnight", "11:59")):
        return (23, 59)
    if s.startswith("noon"):
        return (12, 0)
    m = re.match(r"(\d{1,2})(?::(\d{2}))?(am|pm)", s)
    if not m:
        return (19, 0)
    h, mi = int(m.group(1)) % 12, int(m.group(2) or 0)
    return (h + (12 if m.group(3) == "pm" else 0), mi)


MON = r"(JAN(?:UARY)?|FEB(?:RUARY)?|MAR(?:CH)?|APR(?:IL)?|MAY|JUNE?|JULY?|AUG(?:UST)?|SEPT?(?:EMBER)?|OCT(?:OBER)?|NOV(?:EMBER)?|DEC(?:EMBER)?)\.?"


def month(s):
    s = s.upper()[:3]
    return [m[:3] for m in MONTHS].index(s) + 1


WEEKDAY = r"(?:mon|tues|wednes|thurs|fri|satur|sun)day"
TIME = r"(\d{1,2}(?::\d{2})?\s?[ap]\.?m\.?|noon|midnight)"


def parse_when(line, created):
    """(startsAt, endsAt, venueText) from the page's date heading, e.g.
    "MAY 21, 2026 | 7pm - MAY 27, 2026 | MIDNIGHT" or
    "Thursday, June 13 - 7pm at the DGA Theater Complex- 7920 Sunset Blvd, ..."."""
    line = unescape(line or "").replace("–", "-").replace("—", "-").strip()
    dates = list(re.finditer(r"\b" + MON + r" (\d{1,2})(?:st|nd|rd|th)?\b(?:,? (\d{4}))?", line, re.I))
    if not dates:
        return None, None, None
    def when(i):
        m = dates[i]
        stop = dates[i + 1].start() if i + 1 < len(dates) else len(line)
        seg = line[m.end():stop]
        t = re.search(TIME, seg, re.I)
        y = int(m.group(3)) if m.group(3) else created.year
        d = datetime(y, month(m.group(1)), int(m.group(2)), tzinfo=PT)
        # No year, or a stale one copied from an older page: it can't be long before the page was made.
        while (created - d.replace(tzinfo=None)).days > 45:
            d = d.replace(year=d.year + 1)
        h, mi = parse_time(t.group(1)) if t else (19, 0)
        return d.replace(hour=h, minute=mi).isoformat(), seg, t
    start, seg, t = when(0)
    end, venue = None, None
    if len(dates) > 1:
        end = when(1)[0]
    else:
        times = re.findall(TIME, seg, re.I)
        if len(times) > 1:  # "September 25 | 6:30pm - 11:30pm"
            h, mi = parse_time(times[1])
            end = datetime.fromisoformat(start).replace(hour=h, minute=mi).isoformat()
        elif t:
            rest = seg[t.end():].strip(" ,-|")
            rest = re.sub(r"^(?:PT|PST|PDT)\b", "", rest).strip(" ,-|")
            if re.match(r"at\s", rest, re.I) or (rest and not re.match(WEEKDAY, rest, re.I)):
                venue = re.sub(r"^at\s+", "", rest, flags=re.I) or None
    return start, end, venue


def split_venue(v):
    if not v or not re.search(r"[a-z]{3}", v):
        return None
    v = re.sub(r"^(?:at\s+)?(?:the\s+)+", "", v.strip(), flags=re.I)
    # name, then a street address ("AMC Century City 15 - 10250 Santa Monica Blvd.")
    m = re.match(r"(.+?)\s+-\s+(\d+ .*)$", v) or re.match(r"(.+?)(?:\s*-\s*|,\s*|\s+)(\d{3,} .*)$", v)
    name, addr = (m.group(1), m.group(2)) if m else (v.partition(", ")[0], v.partition(", ")[2])
    return {"name": name.strip(" ,-"), "address": addr.strip(" ,-")}


def tidy(t):
    """Mixed-case titles from the old site: lower-case the small words ("Puss In Boots" -> "Puss in Boots")."""
    words = t.split(" ")
    return " ".join(w.lower() if n and w.lower() in SMALL and not words[n - 1].endswith(":") else w for n, w in enumerate(words))


def attr(sc, name):
    m = re.search(name + r'="([^"]*)"', sc)
    return m.group(1) if m else None


def text_of(html):
    t = re.sub(r"<br\s*/?>", " ", html or "")
    t = re.sub(r"<[^>]+>", "", t)
    return re.sub(r"\s+", " ", unescape(t)).strip()


def youtube_id(s):
    m = re.search(r"(?:youtube(?:-nocookie)?\.com/(?:embed/|watch\?v=)|youtu\.be/)([\w-]{11})", s or "")
    return m.group(1) if m else None


root = ET.parse(SRC).getroot()
items = root.findall("./channel/item")
attachments = {i.findtext("wp:post_id", namespaces=NS): i.findtext("wp:attachment_url", namespaces=NS)
               for i in items if i.findtext("wp:post_type", namespaces=NS) == "attachment"}
img = lambda aid: attachments.get((aid or "").split("|")[0].strip())
LOGOS = ("slipstream", "logo", "lacma", "laliff", "bookstore", "presents", "white-s")

existing = {s["slug"] for s in json.load(open(os.path.join(OUT, "shows.json"), encoding="utf-8"))}
archive = json.load(open(os.path.join(OUT, "archive.json"), encoding="utf-8"))
in_archive = {it["slug"]: (g["title"], it) for g in archive for it in g["items"]}

history, skipped = [], []
for it in items:
    if it.findtext("wp:post_type", namespaces=NS) != "page" or it.findtext("wp:status", namespaces=NS) != "publish":
        continue
    slug = it.findtext("wp:post_name", namespaces=NS)
    body = it.findtext("content:encoded", namespaces=NS) or ""
    if slug in existing or slug in NOT_SHOWS or not slug:
        continue
    if not re.search(r'text="ABOUT THE', body) and slug not in in_archive:
        skipped.append(slug); continue
    created = datetime.fromisoformat(it.findtext("wp:post_date", namespaces=NS))
    year = created.year

    hero = img(attr(body, "bg_image"))
    title_art, partner = None, None
    for sc in re.findall(r"\[image_with_animation[^\]]*\]", body):
        u = img(attr(sc, "image_url"))
        if not u:
            continue
        low = u.lower()
        if "lacma" in low:
            partner = {"name": "LACMA", "logo": u}
        elif "bookstore" in low:
            partner = {"name": "The Last Bookstore", "logo": u}
        elif not any(k in low.rsplit("/", 1)[-1] for k in LOGOS) and not title_art:
            title_art = u

    trailer = None
    for raw in re.findall(r"\[vc_raw_html[^\]]*\](.*?)\[/vc_raw_html\]", body, re.S):
        try:
            trailer = youtube_id(urllib.parse.unquote(base64.b64decode(raw.strip()).decode("utf-8", "ignore")))
        except ValueError:
            pass
        if trailer:
            break
    trailer = trailer or youtube_id(body)

    # Headings in page order: the date line, "ABOUT THE SHOW", then one paragraph each.
    texts = [(m.group(1), text_of(urllib.parse.unquote(m.group(2)) if "%" in m.group(2) and " " not in m.group(2) else m.group(2)))
             for m in re.finditer(r'\[(vc_custom_heading)[^\]]*?text="([^"]*)"', body)]
    col = [text_of(c) for c in re.findall(r"\[vc_column_text[^\]]*\](.*?)\[/vc_column_text\]", body, re.S)]
    date_line = next((t for _, t in texts if re.search(r"\b" + MON + r" \d", t, re.I) and len(t) < 200), None)
    starts, ends, venue_txt = parse_when(date_line, created)

    about, conv_line, after = [], None, False
    for _, t in texts:
        if t.upper().startswith("ABOUT THE"):
            after = True; continue
        if not after or not t or t == date_line:
            continue
        low = t.lower()
        if low.startswith(SKIP_PARA) or "newsletter" in low:
            continue
        if not conv_line and len(t) < 500 and (re.search(r"(followed by|includes?|featuring) (a |an )?(live |post-screening |pre-recorded |q&a |in-person )*(conversation|q&a|discussion|panel)", low)
                                                or re.match(r"(pre-screening |post-screening )?(conversation|q&a) with", low)):
            conv_line = t; continue
        about.append(t)
    # Showcases list each short film as a "team member" card: name plus a short bio.
    for name, bio in re.findall(r'\[team_member[^\]]*?name="([^"]*)"[^\]]*\](.*?)\[/team_member\]', body, re.S):
        bio = text_of(bio)
        if name.strip() and bio:
            about.append(f"{tidy(smart_title(name))}: {bio}")
    if not about:  # some pages keep the about text in a plain text block
        for c in col:
            if len(c) > 120 and not c.lower().startswith(SKIP_PARA) and "[" not in c:
                about.append(c)
    if not venue_txt:
        vm = re.search(r"(?:taking place|will take place|screening is) (?:at|in) (?:the )?([^.]+)", " ".join(col + [t for _, t in texts]), re.I)
        venue_txt = vm.group(1) if vm and re.search(r"theat|cinema|lacma|museum|bookstore|hall|center|studio|amc", vm.group(1), re.I) else None

    series, arch = in_archive.get(slug, (None, None))
    venue = split_venue(venue_txt)
    title = TITLE_FIX.get(slug) or tidy(arch["title"] if arch else smart_title(it.findtext("title") or slug))
    if arch:
        arch["title"] = title  # keep the Previous Titles grid in step
    poster = arch["poster"] if arch else (hero or title_art)
    if not poster:
        skipped.append(slug); continue
    history.append({
        "slug": slug, "title": title, "series": series or (f"{year} Screenings"),
        "kind": "in-person" if venue else "streaming",
        "startsAt": starts, "endsAt": ends, "venue": venue,
        "about": about, "conversationLine": conv_line, "trailerYoutubeId": trailer,
        "heroImage": hero, "poster": poster, "posterRatio": (arch or {}).get("ratio") or 0.667,
        "partner": partner, "titleArt": title_art, "atCapacity": False,
        "conversationId": (arch or {}).get("conversationId"),
        "maxSeats": 2 if venue else 1,
        "wpDate": it.findtext("wp:post_date", namespaces=NS)[:10],
        "listed": bool(arch),
    })

history.sort(key=lambda s: s["startsAt"] or s["wpDate"], reverse=True)
listed = sum(h.pop("listed") for h in history)
for h in history:
    h.pop("wpDate")
json.dump(archive, open(os.path.join(OUT, "archive.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
json.dump(history, open(os.path.join(OUT, "history.json"), "w", encoding="utf-8"), indent=1, ensure_ascii=False)
missing = sorted(set(in_archive) - {h["slug"] for h in history} - existing)
print(f"{len(history)} past shows written ({listed} on Previous Titles, {len(history) - listed} only reachable by URL)")
print(f"  no date: {sum(not h['startsAt'] for h in history)}, no about: {sum(not h['about'] for h in history)}, no trailer: {sum(not h['trailerYoutubeId'] for h in history)}")
print(f"  skipped pages (not shows): {len(skipped)}")
print(f"  Previous Titles entries with no page in the export: {missing}")

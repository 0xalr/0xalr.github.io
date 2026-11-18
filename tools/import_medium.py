#!/usr/bin/env python3
"""
Import articles from a Medium RSS feed into the site's `_writeups/` collection.

    python3 tools/import_medium.py                 # uses https://medium.com/feed/@0xalr
    python3 tools/import_medium.py --feed feed.xml # or a saved copy of the feed

For every article in the feed it:
  * creates `_writeups/<slug>.html` with front matter + the full article HTML, or
    refreshes the article body of an existing file (matched by `medium_url`) while
    keeping the front matter you edited by hand (summary, tags, cover, ...);
  * downloads the article's images to `assets/img/writeups/<slug>/` so the site does
    not depend on Medium's CDN;
  * sanitises the HTML down to a small whitelist of tags/attributes.

Standard library only. Medium's RSS feed only contains the 10 most recent posts.
"""
import argparse
import html
import json
import os
import re
import sys
import urllib.request
import xml.etree.ElementTree as ET
from html.parser import HTMLParser

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
COLL = os.path.join(ROOT, "_writeups")
IMG_ROOT = os.path.join(ROOT, "assets", "img", "writeups")
DEFAULT_FEED = "https://medium.com/feed/@0xalr"
UA = {"User-Agent": "Mozilla/5.0 (site importer)"}
NS = {"content": "http://purl.org/rss/1.0/modules/content/"}

ALLOWED = {
    "p": [], "br": [], "strong": [], "b": [], "em": [], "i": [], "code": [], "pre": [],
    "h3": [], "h4": [], "ul": [], "ol": [], "li": [], "blockquote": [], "hr": [],
    "figure": [], "figcaption": [], "img": ["src", "alt"], "a": ["href"],
}
VOID = {"br", "hr", "img"}
DIR_AUTO = {"p", "h3", "h4", "li", "blockquote", "figcaption"}


def fetch(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def norm(s):
    return re.sub(r"[^a-z0-9]+", "", html.unescape(s).lower())


class Sanitiser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=False)
        self.out = []
        self.images = []   # (index in out, src)
        self.stack = []

    def handle_starttag(self, tag, attrs):
        if tag not in ALLOWED:
            return
        a = dict(attrs)
        if tag == "img":
            src = a.get("src", "")
            if not src or "medium.com/_/stat" in src:
                return
            self.images.append((len(self.out), src))
            alt = html.escape(a.get("alt") or "", quote=True)
            self.out.append(f'<img src="{html.escape(src, quote=True)}" alt="{alt}" loading="lazy" decoding="async">')
            return
        parts = [tag]
        if tag == "a":
            href = a.get("href", "")
            if not re.match(r"^(https?:|mailto:|#)", href or ""):
                href = ""
            parts.append(f'href="{html.escape(href, quote=True)}"')
            if href.startswith("http"):
                parts.append('target="_blank" rel="noopener"')
        if tag in DIR_AUTO:
            parts.append('dir="auto"')
        self.out.append("<" + " ".join(parts) + ">")
        if tag not in VOID:
            self.stack.append(tag)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)
        if tag in self.stack and tag not in VOID:
            self.handle_endtag(tag)

    def handle_endtag(self, tag):
        if tag not in ALLOWED or tag in VOID or tag not in self.stack:
            return
        while self.stack:
            t = self.stack.pop()
            self.out.append(f"</{t}>")
            if t == tag:
                break

    def handle_data(self, data):
        self.out.append(html.escape(html.unescape(data), quote=False))

    def handle_entityref(self, name):
        self.out.append(f"&{name};")

    def handle_charref(self, name):
        self.out.append(f"&#{name};")

    def close(self):
        super().close()
        while self.stack:
            self.out.append(f"</{self.stack.pop()}>")


def read_front_matter(path):
    text = open(path, encoding="utf-8").read()
    m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
    return (m.group(1) if m else ""), text


def fm_value(fm, key):
    m = re.search(rf"^{key}:\s*(.+)$", fm, re.M)
    if not m:
        return None
    v = m.group(1).strip()
    try:
        return json.loads(v)
    except Exception:
        return v.strip("'\"")


def existing_by_medium_url():
    found = {}
    if os.path.isdir(COLL):
        for f in os.listdir(COLL):
            if f.endswith(".html"):
                fm, _ = read_front_matter(os.path.join(COLL, f))
                u = fm_value(fm, "medium_url")
                if u:
                    found[u] = f[:-5]
    return found


def make_slug(url):
    last = url.rstrip("/").rsplit("/", 1)[-1]
    last = re.sub(r"-[0-9a-f]{8,}$", "", last)
    words = [w for w in last.split("-") if w][:8]
    return "-".join(words) or "writeup"


def download_images(slug, images, sanitiser, dry):
    folder = os.path.join(IMG_ROOT, slug)
    os.makedirs(folder, exist_ok=True)
    first = None
    for n, (idx, src) in enumerate(images, 1):
        hq = re.sub(r"/max/\d+/", "/max/1400/", src)
        ext = os.path.splitext(src.split("?")[0])[1].lower() or ".png"
        if ext not in (".png", ".jpg", ".jpeg", ".gif", ".webp"):
            ext = ".png"
        name = f"{n:02d}{ext}"
        dest = os.path.join(folder, name)
        if not dry and not os.path.exists(dest):
            try:
                data = fetch(hq)
            except Exception:
                data = fetch(src)
            open(dest, "wb").write(data)
        local = f"/assets/img/writeups/{slug}/{name}"
        sanitiser.out[idx] = sanitiser.out[idx].replace(
            f'src="{html.escape(src, quote=True)}"', f'src="{{{{ \'{local}\' | relative_url }}}}"', 1)
        first = first or local
    return first


def strip_title_heading(body, title):
    m = re.match(r"\s*<h[34][^>]*>(.*?)</h[34]>", body, re.S)
    if m:
        h = norm(re.sub(r"<[^>]+>", "", m.group(1)))
        t = norm(title)
        if h and (h in t or t in h or (len(h) > 20 and h[:-1] in t) or (len(h) > 20 and h in t[1:])):
            return body[m.end():]
    return body


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--feed", default=DEFAULT_FEED, help="feed URL or local XML file")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    raw = open(args.feed, "rb").read() if os.path.exists(args.feed) else fetch(args.feed)
    channel = ET.fromstring(raw).find("channel")
    known = existing_by_medium_url()
    os.makedirs(COLL, exist_ok=True)

    for item in channel.findall("item"):
        title = (item.findtext("title") or "").strip()
        url = (item.findtext("link") or "").split("?")[0]
        pub = item.findtext("pubDate") or ""
        date = None
        m = re.search(r"(\d{1,2}) (\w{3}) (\d{4})", pub)
        if m:
            months = "Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec".split()
            date = f"{m.group(3)}-{months.index(m.group(2)) + 1:02d}-{int(m.group(1)):02d}"
        cats = [c.text for c in item.findall("category") if c.text]
        content = item.findtext("content:encoded", namespaces=NS) or ""

        slug = known.get(url) or make_slug(url)
        san = Sanitiser()
        san.feed(content)
        san.close()
        cover = download_images(slug, san.images, san, args.dry_run)
        body = strip_title_heading("".join(san.out), title)
        body = re.sub(r"<p dir=\"auto\">\s*</p>", "", body)
        body = body.replace("</p><", "</p>\n<").replace("</h3><", "</h3>\n<").replace("</figure><", "</figure>\n<").replace("</pre><", "</pre>\n<")

        path = os.path.join(COLL, slug + ".html")
        if os.path.exists(path):
            fm, _ = read_front_matter(path)
            action = "updated"
        else:
            text = re.sub(r"<[^>]+>", " ", body)
            first_p = re.sub(r"\s+", " ", html.unescape(text)).strip()[:220].rsplit(" ", 1)[0] + "…"
            fm = "\n".join([
                f"title: {json.dumps(title, ensure_ascii=False)}",
                f"date: {date}",
                f"medium_url: {url}",
                f"cover: {cover or ''}",
                'cover_alt: ""',
                "cover_fit: cover",
                f"summary: {json.dumps(first_p, ensure_ascii=False)}",
                f"tags: {json.dumps([c.replace('-', ' ').title() for c in cats[:3]], ensure_ascii=False)}",
            ])
            action = "created"
        # Article bodies may contain "{{" or "{%" (payloads, templates): keep Liquid off
        # them except for the image tags we inserted above.
        body = protect_liquid(body)
        if not args.dry_run:
            with open(path, "w", encoding="utf-8") as f:
                f.write(f"---\n{fm}\n---\n{body}\n")
        print(f"{action:8} _writeups/{slug}.html  ({len(san.images)} images)  {title}")


def protect_liquid(body):
    """Wrap everything except our `{{ '/assets/..' | relative_url }}` tags in raw blocks."""
    pat = re.compile(r"\{\{ '/assets/img/writeups/[^']+' \| relative_url \}\}")
    out, last = [], 0
    for m in pat.finditer(body):
        out.append("{% raw %}" + body[last:m.start()] + "{% endraw %}")
        out.append(m.group(0))
        last = m.end()
    out.append("{% raw %}" + body[last:] + "{% endraw %}")
    return "".join(out)


if __name__ == "__main__":
    sys.exit(main())

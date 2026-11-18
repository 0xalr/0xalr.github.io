# ALR — 0xalr.github.io

Personal site and write-up portfolio of Abdalkreem (ALR), a security researcher and bug bounty hunter.
Live at **https://0xalr.github.io**.

It is a plain Jekyll site that GitHub Pages builds automatically on every push to `main`.
No local tooling is required.

## Add a new writeup

Each writeup is a full article page on this site, stored as one file in `_writeups/` and
published at `/writeups/<file-name>/`.

**From Medium (easiest).** Publish on Medium first, then run:

```sh
python3 tools/import_medium.py
```

The script reads your Medium RSS feed. If Pillow is installed (`pip install pillow`), it also
converts images to WebP so pages load faster. It creates a `_writeups/` file for every article that isn't on
the site yet, and downloads that article's images to `assets/img/writeups/<name>/`. Then:

1. Open the new file and review its front matter: `summary`, `tags`, `cover`, `cover_alt`.
   The script fills these in automatically, so tidy them up.
2. Commit and push. Pages rebuilds in a minute or two.

Re-running the script refreshes the article text of existing writeups. It keeps any front matter you
edited, and matches files by `medium_url`.

**By hand.** Create `_writeups/my-new-writeup.html`:

```html
---
title: "Exact title"
date: 2027-01-15
medium_url: https://medium.com/@0xalr/...   # optional
cover: /assets/img/covers/my-cover.webp      # image used on cards and link previews
cover_alt: "What the cover shows"
cover_fit: cover                             # or "contain" for very wide/tall screenshots
summary: "One to three sentences for the card."
tags: ["IDOR", "API"]
---
<p>Article HTML goes here…</p>
```

Writeups are sorted by `date`, newest first. The newest one is featured on the homepage, and the
Writeups page lists them all with topic filters built from `tags`.

## Add certifications

Put the certificate image in `assets/img/certs/` and add an entry to `_data/certifications.yml`
(`name`, `short`, `issuer`, `date`, `expires`, `image`, `url`, `credential`). The image and the
"Verify credential" link both open `url`.

## Contact

The Contact page shows your email address, with an "Email me" button and a "Copy address" button.
Change the address in `_config.yml` → `contact.email`.

## Edit other content

| What | Where |
| --- | --- |
| Name, tagline, site description, social links | `_config.yml` |
| Homepage hero and sections | `index.html` |
| About page text | `about/index.html` |
| Colors, fonts, spacing | `assets/css/main.css` (tokens at the top) |
| Social preview image | `assets/img/og-image.png` (1200×630) |
| Logo | `_includes/logo.html` and `assets/img/favicon.svg` |
| Background orbit lines | `assets/img/orbits-dark.svg`, `assets/img/orbits-light.svg` |

## Preview locally (optional)

```sh
gem install jekyll jekyll-sitemap webrick
jekyll serve
```

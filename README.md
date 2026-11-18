# ALR — abdalkreem-alt.github.io

Personal site and write-up portfolio of Abdalkreem (ALR), a security researcher and bug bounty hunter.
Live at **https://abdalkreem-alt.github.io**.

It is a plain Jekyll site that GitHub Pages builds automatically on every push to `main`.
No local tooling is required.

## Add a new article

1. Add the cover image to `assets/img/covers/`. A WebP or JPEG about 1200px wide works well.
   You can also skip the upload and use the Medium image URL directly.
2. Open `_data/articles.yml`, copy an existing entry, and fill in its fields:

   ```yaml
   - title: "Exact Medium title"
     url: https://medium.com/@0xalr/your-article-slug-123abc
     date: 2027-01-15
     cover: /assets/img/covers/2027-01-your-article.webp
     cover_alt: What the cover image shows
     cover_fit: cover        # or "contain" for very wide/tall screenshots
     summary: >-
       One to three sentences. `backticks` render as inline code.
     tags: [IDOR, API]
   ```

3. Commit and push. Pages rebuilds within a minute or two.

Articles are sorted by `date`, newest first. The newest one is featured on the homepage. The homepage
shows the latest five, and the Blog page lists them all with topic filters built from `tags`.

## Edit other content

| What | Where |
| --- | --- |
| Name, tagline, site description, social links | `_config.yml` |
| Homepage intro and focus areas | `index.html` |
| About page text | `about/index.html` |
| Colors, fonts, spacing | `assets/css/main.css` (tokens at the top) |
| Social preview image | `assets/img/og-image.png` (1200×630) |

## Preview locally (optional)

```sh
gem install jekyll jekyll-sitemap webrick
jekyll serve
```

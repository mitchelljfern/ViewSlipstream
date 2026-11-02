# Scripts

## deploy_staging.py (Social Upgrades sessions only)

Normally you deploy by pushing to the `staging` branch and Netlify builds it. If the repo isn't linked to Netlify yet, or you can't push, a Social Upgrades Claude session with the Netlify MCP connected can upload the working copy as a **staging branch deploy**:

1. Ask the Netlify MCP for a deploy command for site `30688486-79a1-4b9f-bbf2-820f59e9f75d` (operation `deploy-site`). It returns a command containing a `--proxy-path` URL. **Do not run that command**: it makes a production deploy.
2. Pass the proxy URL to this script instead:

```bash
python3 scripts/deploy_staging.py "<proxy-path URL>"
```

The script zips the repo (no node_modules, .git, .next or out) and asks Netlify for a build on the `staging` branch. It refuses any other branch. The result is the branch deploy at https://staging--viewslipstream.netlify.app.

Now that the repo is linked to Netlify, prefer a plain `git push` to `staging`. Use this script only when you can't push.

## build_data_from_wordpress.py

Rebuilds `src/data/*.json` from a cache of the live WordPress site. Fill the cache first (any empty folder):

```bash
C=/path/to/cache; mkdir -p $C/pages
curl -s -o $C/home.html https://viewslipstream.com/
curl -s -o $C/prev.html https://viewslipstream.com/previous-titles/
curl -s -o $C/conv.html https://viewslipstream.com/in-conversations/
for p in 1 2 3 4; do curl -s -o $C/allpages$p.json "https://viewslipstream.com/wp-json/wp/v2/pages?per_page=100&page=$p&_fields=slug,title,date"; done
```

Then the parsing steps (show pages, Vimeo oEmbed for each conversation, previous-titles groups) produce `shows-scraped.json`, `slugmap.json`, `previous.json` and `conversations-full.json` in the cache, and:

```bash
python3 scripts/build_data_from_wordpress.py $C src/data
```

This is a review-phase tool. Phase 2 moves shows into the database and this script retires.

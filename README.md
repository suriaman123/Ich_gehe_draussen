# Ich gehe draußen

A log of me going outside — one folder per outing, rendered as a trail of waypoints.

**Live site:** `https://suriaman123.github.io/Ichgehedraußen/` 


## How it works

This is a static site so it runs directly on GitHub Pages. Because static hosting can't "read" a folder's contents live, each outing is registered in one small file, `outing_data/events.json`, which points at that outing's folder.

```
AmanOutside/
├── index.html
├── package.json 
├── css/styles.css
├── js/
│   ├── app.js                           # loads events.json, renders the trail + detail view, router
│   └── theme.js                         # theme switcher (signal / editorial / adventure)
├── scripts/
│   └── generate-manifest.js
├── outing_data/
│   └── excursion_details_js.json        # the manifest — one entry per outing
└── excursion_details/
    └── 5k-marathon_2024-09-01/
        ├── cover.svg                    # the outing's display photo (any image name works)
        ├── README.md                    # notes, rendered on the detail page
        ├── photo2.jpg
        └── clip.mp4
```

## Adding a new outing

After adding the folder uner `excursion_details/`  with  Run the generator from the project root:

```bash
node scripts/generate-manifest.js
```

it scans every folder in `excursion_details/`, works out the title and date from the folder name, sorts photos from videos automatically, and writes `outing_data/excursion_details_js.json`. You never hand-edit that file.

**Folder naming pattern:**eiht `<Title>_<DD.MM.YYYY>`- e.g. `excursion_details/Sunset Hike_02.11.2024/`, or  `<Title>_<YYYY-MM-DD>` works. The script is strict about `<Title>_<Date>` so it can reliably extract both pieces. If a folder doesn't match, it's skipped with a warning printed to the terminal — nothing breaks, that folder just won't appear on the site yet.

**Cover photo:** Name the  chosen cover/profile photo so it starts with `cover`, `profile`, or `display` (e.g. `cover.jpg`) — the script finds it automatically. If nothing matches, it just uses the first image alphabetically. 

**Marking something as a highlight:** open `excursion_details.json` and flip that outing's `"featured"` to `true`.


## Versioning

Commits are tagged as **Waypoints** — each one marks a point further along the trail:

```
Waypoint 0.1 — Trailhead              first working version: trail, detail view, themes
Waypoint 0.2 — Signal Boost           highlights carousel + the manifest generator script
Waypoint 0.3 — Umbenennung + Polish

```


### Alternate Project Names
- AmanOutside
- Touching Grass
- Beyond My Room
- Socializing.exe
- Human Interaction
[https://junwooweb.github.io/](https://junwooweb.github.io/)

Run `npm run build` after editing source files, then `npm run check` to verify the generated pages and links.

The homepage's scrollable Research Updates list includes accepted/published papers from `data/publications.json` and patent announcements from `data/research-updates.json`. Submitted manuscripts from `data/ongoing.json` appear separately under Ongoing Work. Paper status and author roles come from those records. `data/research-updates.json` supplies sourced dates; dates identify publication, journal issue, or conference periods, not acceptance dates. Undated patent filing announcements appear first, followed by dated entries from newest to oldest. First-author papers and co-inventor patent contributions have distinct color accents. Edit the template in `templates/home.html` and styles in `assets/publication-tools.css`, then commit the generated HTML together with the sources.

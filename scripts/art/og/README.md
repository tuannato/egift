# The share card (`public/og.png`)

`card.svg` is the source. It shows three wrappers' closed stills; to render it again:

1. Put `card.svg` and the three crops it names in `public/_og/` (crop the closed stills of the wrappers to 1000×1100).
2. `node scripts/shot.mjs "/_og/card.svg" .shots/og-2x.png 1200 630 2000 calm`
3. `sips -z 630 1200 .shots/og-2x.png --out public/og.png`
4. Remove `public/_og/` again: nothing in it ships.

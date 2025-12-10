# CruciCore Layout (Astro only)

Layout-Only Scaffold for Destiny 2 PvP/Trials tracker:
- Startseite mit Suche, Info-Karten (Trials Map/Loot, PvP Rotator), 24h-Stats-Platzhalter
- Profilseite mit Trials- und PvP/Comp-Sektionen, RankBar & SocialIcons
- Dark-Theme, responsive Grid

## Start
1) npm install
2) npm run dev
→ http://localhost:5200

## Integration mit deiner API
- Ersetze Platzhalter in `index.astro` und `profile/[player].astro`
- Typische Endpunkte:
    - http://localhost:5100/stats/:player
    - http://localhost:5100/trials/weekly
    - http://localhost:5100/rotator
- CORS auf API-Seite aktiv halten.

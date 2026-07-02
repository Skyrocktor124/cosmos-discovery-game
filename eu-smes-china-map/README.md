# EU SMEs in China — presence map

A self-contained, interactive dashboard mapping the documented presence of
European small and medium-sized enterprises across mainland China.

**Open `index.html` in any browser** — no build step, no network access and no
dependencies required. Everything (basemap geometry, data, styles, scripts) is
embedded. Light and dark mode follow the OS preference.

## What it shows

- **City map** — ten cities with documented European SME activity, tiered by
  presence (major cluster / secondary cluster / chamber office presence), with
  per-city detail on hover, keyboard focus, and in a table view.
- **Chamber networks** — relative size of the EU-wide (EUCCC), German (AHK),
  French (CCIFC) and Italian (CICC) chamber networks in China.
- **Challenges** — share of SME respondents citing each issue in the
  EU SME Centre / European Chamber 2025/26 Inter-Chamber SME survey.
- **Sectors** — the five most represented sectors among surveyed companies.

## Scope and honesty note

No public registry enumerates every EU SME operating in China — neither Chinese
corporate registries nor EU bodies publish a complete, company-level list. This
dashboard therefore maps what *is* documented: survey-reported city clusters and
published chamber-network figures. For firm-by-firm lookup, use the chamber
member directories linked in the dashboard's sources section.

## Data sources

- EU SME Centre / European Union Chamber of Commerce in China,
  [2025/26 Inter-Chamber SME survey key findings](https://www.eusmecentre.org.cn/publications/survey-findings-2025-2026-information-gathering-sme-position-paper/)
  (95 responses, 53% SMEs; conducted March–May 2025)
- [European Union Chamber of Commerce in China](https://www.europeanchamber.com.cn/en/european-chamber-background) — 1,700+ members, 7 chapters in 9 cities
- [AHK Greater China](https://china.ahk.de/en) — 2,700+ members
- [CCI France Chine](https://www.ccifc.org/) — ≈2,100 French subsidiaries in China
- [China-Italy Chamber of Commerce](https://www.cameraitacina.com/) — 850+ company network
- Basemap: Natural Earth via the `world-atlas` npm package (Mercator projection)

Data retrieved July 2026. Figures are the latest published by each source and
indicate scale, not a census.

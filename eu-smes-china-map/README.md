# EU SMEs in China — presence map

A self-contained, interactive dashboard mapping the documented presence of
European small and medium-sized enterprises across mainland China, at the
most granular level the public record supports.

**Open `index.html` in any browser** — no build step, no network access and no
dependencies required. Everything (basemap geometry, data, styles, scripts) is
embedded. Light and dark mode follow the OS preference.

## What it shows

- **City map** — eleven cities with documented European SME activity, tiered by
  presence (major cluster / secondary cluster / chamber office presence), with
  per-city detail of which chamber networks operate there on hover, keyboard
  focus, and in a table view. A zoomed **Yangtze River Delta inset** separates
  the dense Nanjing–Suzhou–Taicang–Shanghai cluster.
- **Taicang** — the one Chinese city with an official European company count:
  550+ German enterprises (mostly Mittelstand SMEs), the densest documented
  EU SME cluster in China and sole Sino-German Enterprise Cooperation Base.
- **Country-of-origin networks** — latest published network size for nine EU
  origins: Germany (AHK 2,700+), France (≈2,100 subsidiaries), Italy (850+),
  Austria (650+), Sweden (600+), Spain (400+), Benelux (≈350), Finland (≈250),
  Denmark (178, the only census-style count).
- **Challenges** — share of SME respondents citing each issue in the
  EU SME Centre / European Chamber 2025/26 Inter-Chamber SME survey.
- **Sectors** — the five most represented sectors among surveyed companies.
- **Company lookup** — links to the nine chamber member directories that serve
  as the closest thing to a firm-level register, plus CSV downloads of the
  dashboard's own city and country datasets.

## Scope and honesty note

No public registry enumerates every EU SME operating in China — neither Chinese
corporate registries nor EU bodies publish a complete, company-level list. This
dashboard therefore maps what *is* documented: survey-reported city clusters,
published chamber-network figures, Taicang's official count, and the directories
for firm-by-firm identification. Definitions differ between sources (chamber
members vs. registered subsidiaries vs. firms operating), and no comparable
counts were found for the remaining 18 EU member states.

## Data sources

- EU SME Centre / European Union Chamber of Commerce in China,
  [2025/26 Inter-Chamber SME survey key findings](https://www.eusmecentre.org.cn/publications/survey-findings-2025-2026-information-gathering-sme-position-paper/)
  (95 responses, 53% SMEs; conducted March–May 2025)
- Taicang: [Xinhua](https://english.news.cn/20240404/9bf5754461c943fdbb964b1d22d59b80/c.html),
  [People's Daily](https://en.people.cn/n3/2025/0521/c90000-20317596.html)
  (550+ German enterprises; 500th arrived January 2024; ≈US$6bn cumulative investment)
- [European Union Chamber of Commerce in China](https://www.europeanchamber.com.cn/en/european-chamber-background) — 1,700+ members, 7 chapters in 9 cities
- [AHK Greater China](https://china.ahk.de/en) — 2,700+ members (incl. Hong Kong & Taipei)
- [CCI France Chine](https://www.ccifc.org/) — ≈2,100 French subsidiaries in China
- [China-Italy Chamber of Commerce](https://www.cameraitacina.com/) — 850+ company network
- [Advantage Austria](https://www.advantageaustria.org/cn/news/WKO_Executive_Mission_2025.10.en.html) — 650+ Austrian subsidiaries
- [Embassy of Sweden](https://www.swedenabroad.se/en/embassies/china-shanghai/how-we-support-swedish-companies/swedish-companies-in-china/) — 600+ Sweden-affiliated firms
- [China Briefing](https://www.china-briefing.com/news/spain-china-relations-sanchezs-visit-trade-investment/) — 400+ Spanish companies
- [Benelux Chamber of Commerce](https://shanghai.bencham.org/about-chamber) — ≈350 member organisations
- [China Office of Finnish Industries](https://chinaoffice.fi/) / [China Briefing](https://www.china-briefing.com/news/china-finland-economic-ties-trade-and-investment-highlights/) — ≈250 Finnish firms
- [Danish Trade Council survey 2024](https://um.dk/media/gmxfwjrf/survey-of-danish-companies-in-china-2024.pdf) — 178 Danish companies identified
- Basemap: Natural Earth via the `world-atlas` npm package (Mercator projection)

Data retrieved July 2026. Figures are the latest published by each source and
indicate scale, not a census.

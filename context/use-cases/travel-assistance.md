# Domestic voice calls

Pre-tour, in-tour, and tour completion are one Thomas Cook domestic proof of concept. The full notes are in `domestic-voice-bot.md`.

Ravi here is the domestic tour agent. Forex Ravi is a different bot. These pages do not chase visas, reissue tickets, or close expense packs. Those were an earlier sketch and are not this use case.

| Module | When he calls |
|---|---|
| `/prebook` | Two days before departure |
| `/during` | Day 2 if the tour is up to 3 days. Second-last day if it is 4 days or more |
| `/post` | Last day: thank-you, feedback form, NPS from 0 to 10 |

Demo packages are Exotic Kashmir With Gulmarg Stay (group, PKG011485) and Colours of Kerala (customised, PKG009251). Booking facts are hardcoded. Raahi is not connected. On 8 October 2026 neither package has a call due, because both are long tours and both are only on day 2.

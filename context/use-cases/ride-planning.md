# Ride planning assistance

Source: the community demo at https://re-community-ruby.vercel.app/

That site separates two things, and the suite keeps the split.

- **CX Assistant** (`/support` on that site) helps a visitor with motorcycles, test rides, dealers, finance, and ownership.
- **iRide portal** holds community group rides, maps, and Motocaptain. Sign-in is separate. The suite does not pretend to be that portal.

Public copy on the site: a ride such as the Aravallis Sunday Scramble (Sunday, 6:30 AM, Gurugram, about 90 km) is joined on the iRide portal. Ex-showroom prices are indicative and the dealership confirms the on-road price. This suite does not store those prices.

The demo is labeled as community inspiration. It is not an official Royal Enfield storefront. The Travel Suite module follows that boundary.

## Voice, then workers

Voice: CX Rider takes the planning conversation — who is riding, start point, distance, experience, and whether this is a solo loop or a group ride.

Workers:

- Route Clerk — drafts start, stops, distance, and duration for the rider to confirm
- Group Ride Clerk — prepares the ride note a Motocaptain would publish on iRide
- Dealer Handoff — routes a test-ride or service ask to a dealer. It does not confirm stock
- Weather Watch — flags a condition only when a weather source is connected. Until then it stays pending

## Golden path

`RD-0907`. A first group ride for new riders out of Gurugram, forest-edge loop, morning start. CX Rider collects the brief. Route Clerk drafts the note. Publishing to iRide waits for the ride lead.

## Human gate

Publishing a group ride, or promising a test ride, waits for a person. The assistant can plan. The portal and the dealer confirm.

## Ride planner (built)

The `/rides/queue` tab is the **Ride planner**. Left: the rider chats with CX Rider. Right: the case file the desk sees, filled in by the agents as the chat goes. Logic lives in `src/data/ride-planner.ts`; it is deterministic slot-filling with FAQ answers, not an LLM.

CX Rider asks, in order, only what is still missing: group or solo, start city, length, riders (group only), experience, and when. A detailed first message ("20 of us, weekend ride from Bangalore") fills several answers at once. Off-topic questions get a one-line decline and the question again. A test-ride ask goes to Dealer Handoff (city, then motorcycle); the dealer confirms slot, stock, and on-road price.

### Demo values (made up for the demo, keep them configurable)

- Crew rule: 1 lead and 1 sweep per group ride, plus 1 marshal for every 8 riders after the first 8.
- Daily comfort cap by experience: new owners 150 km, mixed 250 km, experienced 350 km. A longer day is flagged for the ride lead. It is not a safety standard.
- Flag-off: half day 6:30 AM with a 6:00 AM briefing; longer rides 6:00 AM with a 5:30 AM briefing.
- Saved route drafts, distances approximate. A city outside this list gets no route; the ride lead drafts it.

| Start | Half day | One day | Weekend | 3 days or more |
|---|---|---|---|---|
| Gurugram (Cyber Hub) | Aravallis Sunday Scramble, ~90 km (from the community site) | Neemrana Fort run, ~240 km | Alwar and Sariska, ~160 + ~170 km | Kasauli hills, ~270 + ~60 + ~320 km |
| Pune | Sinhagad sunrise loop, ~70 km | Tamhini Ghat run, ~140 km | Mahabaleshwar, ~120 + ~120 km | Konkan coast, ~190 + ~120 + ~320 km |
| Bengaluru | Nandi Hills sunrise, ~120 km | Shivanasamudra falls, ~280 km | Chikmagalur, ~245 + ~245 km | Coorg, ~265 + ~80 + ~265 km |

The golden path `RD-0907` is a Gurugram half-day group ride. "Replay RD-0907 demo" plays it in the chat. Every other plan gets a case code from its brief.

# Trip planning

Top of funnel for any travel company: a traveller chats about a holiday, the agents suggest places with photos, build a day-by-day plan, and give an indicative budget. When the traveller asks for a quote, a voice agent calls back and a holiday expert confirms live prices. This replaces the earlier ride-planning module, which was too specific to one client.

It is written for the shape of a full-line travel company (holidays, forex, flights, hotels, visa, insurance, MICE), not for one brand. Thomas Cook India is the reference player; nothing in the module is specific to it.

## Chat, then workers, then a workflow

Chat: Trip Planner asks only what is missing: who is travelling, the departure city, the month, the number of days, and the stay type. If no destination was named, it asks India or abroad and what would make it a great trip. A detailed first message fills several answers at once.

Workers:

- Destination Matcher: ranks places by interest, season, travellers, and stay type, and shows three with a photo, a season badge, and a from-price per person
- Itinerary Builder: drafts the days from the destination's building blocks; longer trips get free days for the expert to fill
- Estimate Engine: a budget range for flights, stay, transfers and sightseeing, meals, and (abroad) visa and insurance
- Lead Sync: creates the lead with the brief, plan, and add-ons. The CRM is not connected, so leads are queued

Workflow `wf-trip-enquiry`: quote requested → Lead Sync → Holiday Advisor voice call within 10 minutes → retry once if unanswered → WhatsApp plan summary → holiday expert. Add-ons on the lead: visa desk check (always for international), forex card, travel insurance.

## Human gate

Only a holiday expert confirms flights, hotels, and the final price, and only a person sends a quote. The planner never books, holds, or promises a price.

## Estimates, not prices

The budget is a range from demo cost bands in `src/data/destinations.ts`, always labelled as an estimate. It is not a fare, a room rate, or a quote. Replace the bands with the client's own costing before showing real customers.

Demo values:

- Per destination: return flight per person from an Indian metro (low to high), stay per room per night by budget / comfort / luxury, transfers and sightseeing per person per day, meals per person per day
- Style multiplier on local costs and meals: budget 0.75, comfort 1, luxury 1.8
- Stay range: 0.9x to 1.15x. Visa and insurance abroad: ₹3,000 to ₹9,000 per person
- Rooms are travellers divided by 2, rounded up. Default party: couple 2, family 4, friends 4, solo 1
- Callback promise: 10 minutes

Destinations (13): Kashmir, Kerala, Goa, Rajasthan, Himachal, Andaman, Bali, Dubai, Phuket and Krabi, Singapore, Switzerland, Maldives, Vietnam. Each has best months and an off-season note; an off-season month is flagged, not hidden. Photos are hot-linked from Unsplash (free licence); the production CSP allows `images.unsplash.com`.

## Golden path

`HL-2611`: a couple from Mumbai, Bali, 6 days, November, comfort stay. November is Bali's wet season, so the plan says so. They ask for a quote and add forex; the visa desk check is added automatically. "Replay HL-2611 demo" plays it.

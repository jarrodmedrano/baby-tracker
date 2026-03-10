# NAP/SLEEP Multi-Hour Duration

## Summary
NAP and SLEEP entries can span multiple hours, stored as `durationMinutes` and rendered as a tall block in the timeline.

## Data Layer
- Add `durationMinutes Int?` to `Entry` model (nullable; unused by FEEDING/CHANGING/MEDICINE)
- Derive end time as `occurredAt + durationMinutes` — no separate field
- Run prisma migration

## API (`/api/entries`)
- POST: accept `durationMinutes` in body, pass to `prisma.entry.create`
- GET: include `durationMinutes` in returned fields

## AddEntryModal
- When type is NAP or SLEEP, show duration row below time picker:
  - Hours select (0–23) + minutes select (0, 5, 10, … 55)
  - Default: 0h 30m
- `durationMinutes = hours * 60 + minutes` sent on save
- Other types: no duration field

## Timeline
Rewrite as CSS Grid, 24 rows × 3 columns:

| Column | Width | Content |
|--------|-------|---------|
| 1 | 48px | Hour labels |
| 2 | flex-1 | Instant event pills (FEEDING, CHANGING, MEDICINE, and NAP/SLEEP without duration) |
| 3 | 56px | Spanning NAP/SLEEP blocks |

- Each row: `minmax(40px, auto)`
- Spanning block: `gridRow: startHour+1 / startHour+1+Math.ceil(durationMinutes/60)`, capped at row 25
- Spanning block shows: icon + "Nap · 2h 30m"
- Clicking hour row → add modal (same as today)
- Clicking spanning block → entry detail sheet (stopPropagation)

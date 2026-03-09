import { render, screen, fireEvent } from '@testing-library/react'
import { Timeline } from '../Timeline'

jest.mock('lucide-react', () => ({
  Milk: () => <span>Milk</span>,
  ShoppingBag: () => <span>ShoppingBag</span>,
  Moon: () => <span>Moon</span>,
  BedDouble: () => <span>BedDouble</span>,
  Pill: () => <span>Pill</span>,
  Plus: () => <span>Plus</span>,
}))

// All entries placed at UTC hour 8 so they consistently land in the same bucket
// across test runs (Timeline uses new Date(occurredAt).getHours()).
// We pin them to an explicit local-time string so they are predictable.
const makeEntry = (
  id: string,
  type: 'FEEDING' | 'CHANGING' | 'NAP' | 'SLEEP' | 'MEDICINE',
  amount: number | null = null,
  unit: 'ML' | 'OZ' | null = null
) => ({
  id,
  type,
  occurredAt: new Date('2026-03-09T08:00:00'), // local midnight+8
  amount,
  unit,
  notes: null,
})

const mockEntries = [
  {
    id: 'e1',
    type: 'FEEDING' as const,
    occurredAt: new Date('2026-03-09T08:30:00Z'),
    amount: 90,
    unit: 'ML' as const,
    notes: null,
  },
  {
    id: 'e2',
    type: 'CHANGING' as const,
    occurredAt: new Date('2026-03-09T10:00:00Z'),
    amount: null,
    unit: null,
    notes: null,
  },
]

describe('Timeline', () => {
  // ── Existing tests ──────────────────────────────────────────────────────────

  it('renders 24 hour rows', () => {
    render(<Timeline entries={[]} onAddEntry={jest.fn()} />)
    expect(screen.getByText('12 AM')).toBeInTheDocument()
    expect(screen.getByText('12 PM')).toBeInTheDocument()
  })

  it('shows feeding entry with amount', () => {
    render(<Timeline entries={mockEntries} onAddEntry={jest.fn()} />)
    expect(screen.getByText(/90 ML/i)).toBeInTheDocument()
  })

  it('shows changing entry pill', () => {
    render(<Timeline entries={mockEntries} onAddEntry={jest.fn()} />)
    expect(screen.getByText(/Changing/i)).toBeInTheDocument()
  })

  // ── New tests ───────────────────────────────────────────────────────────────

  it('calls onEntryClick with the entry data when an entry pill is clicked', () => {
    const onEntryClick = jest.fn()
    const onAddEntry = jest.fn()
    render(
      <Timeline
        entries={mockEntries}
        onAddEntry={onAddEntry}
        onEntryClick={onEntryClick}
      />
    )

    // Click on the feeding pill (contains "Feeding: 90 ML")
    const feedingPill = screen.getByText(/Feeding: 90 ML/i)
    fireEvent.click(feedingPill)

    expect(onEntryClick).toHaveBeenCalledTimes(1)
    expect(onEntryClick).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'e1', type: 'FEEDING' })
    )
  })

  it('clicking an entry pill does NOT call onAddEntry (stopPropagation works)', () => {
    const onEntryClick = jest.fn()
    const onAddEntry = jest.fn()
    render(
      <Timeline
        entries={mockEntries}
        onAddEntry={onAddEntry}
        onEntryClick={onEntryClick}
      />
    )

    const feedingPill = screen.getByText(/Feeding: 90 ML/i)
    fireEvent.click(feedingPill)

    expect(onEntryClick).toHaveBeenCalledTimes(1)
    expect(onAddEntry).not.toHaveBeenCalled()
  })

  it('entry pills have cursor-pointer class when onEntryClick is provided', () => {
    const onEntryClick = jest.fn()
    render(
      <Timeline
        entries={mockEntries}
        onAddEntry={jest.fn()}
        onEntryClick={onEntryClick}
      />
    )

    const feedingPill = screen.getByText(/Feeding: 90 ML/i)
    expect(feedingPill.className).toContain('cursor-pointer')
  })

  it('entry pills do NOT have cursor-pointer class when onEntryClick is not provided', () => {
    render(<Timeline entries={mockEntries} onAddEntry={jest.fn()} />)

    const feedingPill = screen.getByText(/Feeding: 90 ML/i)
    expect(feedingPill.className).not.toContain('cursor-pointer')
  })

  it('FEEDING entry type renders label "Feeding" in pill', () => {
    const entry = makeEntry('f1', 'FEEDING')
    render(<Timeline entries={[entry]} onAddEntry={jest.fn()} />)
    expect(screen.getByText('Feeding')).toBeInTheDocument()
  })

  it('NAP entry type renders label "Nap" in pill', () => {
    const entry = makeEntry('n1', 'NAP')
    render(<Timeline entries={[entry]} onAddEntry={jest.fn()} />)
    expect(screen.getByText('Nap')).toBeInTheDocument()
  })

  it('SLEEP entry type renders label "Sleep" in pill', () => {
    const entry = makeEntry('s1', 'SLEEP')
    render(<Timeline entries={[entry]} onAddEntry={jest.fn()} />)
    expect(screen.getByText('Sleep')).toBeInTheDocument()
  })

  it('MEDICINE entry type renders label "Medicine" in pill', () => {
    const entry = makeEntry('m1', 'MEDICINE')
    render(<Timeline entries={[entry]} onAddEntry={jest.fn()} />)
    expect(screen.getByText('Medicine')).toBeInTheDocument()
  })

  it('CHANGING entry type renders label "Changing" in pill', () => {
    const entry = makeEntry('c1', 'CHANGING')
    render(<Timeline entries={[entry]} onAddEntry={jest.fn()} />)
    expect(screen.getByText('Changing')).toBeInTheDocument()
  })

  it('Feeding with amount shows "Feeding: 90 ML" format', () => {
    const entry = makeEntry('f2', 'FEEDING', 90, 'ML')
    render(<Timeline entries={[entry]} onAddEntry={jest.fn()} />)
    expect(screen.getByText('Feeding: 90 ML')).toBeInTheDocument()
  })
})

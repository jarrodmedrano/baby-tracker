import { render, screen } from '@testing-library/react'
import { Timeline } from '../Timeline'

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
})

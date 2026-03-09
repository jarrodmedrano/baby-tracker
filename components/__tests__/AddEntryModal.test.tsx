import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { AddEntryModal } from '../AddEntryModal'

jest.mock('lucide-react', () => ({
  X: () => <span>X</span>,
  Milk: () => <span>Milk</span>,
  ShoppingBag: () => <span>ShoppingBag</span>,
  Moon: () => <span>Moon</span>,
  BedDouble: () => <span>BedDouble</span>,
  Pill: () => <span>Pill</span>,
}))

describe('AddEntryModal', () => {
  const defaultProps = {
    babyId: 'baby-1',
    defaultHour: 8,
    onClose: jest.fn(),
    onSave: jest.fn().mockResolvedValue(undefined),
  }

  beforeEach(() => {
    jest.clearAllMocks()
    defaultProps.onSave = jest.fn().mockResolvedValue(undefined)
    defaultProps.onClose = jest.fn()
  })

  // ── Existing tests ──────────────────────────────────────────────────────────

  it('renders all 5 entry type buttons', () => {
    render(<AddEntryModal {...defaultProps} />)
    expect(screen.getByRole('button', { name: /feeding/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /changing/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /nap/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sleep/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /medicine/i })).toBeInTheDocument()
  })

  it('shows amount and unit fields when Feeding is selected', () => {
    render(<AddEntryModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /feeding/i }))
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('does not show amount fields for Changing', () => {
    render(<AddEntryModal {...defaultProps} />)
    fireEvent.click(screen.getByRole('button', { name: /changing/i }))
    expect(screen.queryByLabelText(/amount/i)).not.toBeInTheDocument()
  })

  // ── New tests ───────────────────────────────────────────────────────────────

  it('FEEDING is selected by default and Amount field is visible without clicking', () => {
    render(<AddEntryModal {...defaultProps} />)
    // The Amount field should be visible immediately — no click needed
    expect(screen.getByLabelText(/amount/i)).toBeInTheDocument()
    // The Feeding button should carry the selected border class
    const feedingBtn = screen.getByRole('button', { name: /feeding/i })
    expect(feedingBtn.className).toContain('border-blue-500')
  })

  it('time input is pre-populated with defaultHour in local time format (defaultHour=14 → "14:00")', () => {
    render(<AddEntryModal {...defaultProps} defaultHour={14} />)
    const timeInput = screen.getByLabelText(/time/i) as HTMLInputElement
    // The datetime-local value is formatted as YYYY-MM-DDTHH:00
    expect(timeInput.value).toContain('14:00')
  })

  it('shows "Also add for" section with baby name buttons when otherBabies is provided', () => {
    const otherBabies = [
      { id: 'baby-2', name: 'Emma' },
      { id: 'baby-3', name: 'Oliver' },
    ]
    render(<AddEntryModal {...defaultProps} otherBabies={otherBabies} />)
    expect(screen.getByText(/also add for/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /emma/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /oliver/i })).toBeInTheDocument()
  })

  it('does NOT show "Also add for" section when otherBabies is not provided', () => {
    render(<AddEntryModal {...defaultProps} />)
    expect(screen.queryByText(/also add for/i)).not.toBeInTheDocument()
  })

  it('does NOT show "Also add for" section when otherBabies is empty array', () => {
    render(<AddEntryModal {...defaultProps} otherBabies={[]} />)
    expect(screen.queryByText(/also add for/i)).not.toBeInTheDocument()
  })

  it('clicking a baby name button in "Also add for" toggles selection (adds then removes)', () => {
    const otherBabies = [{ id: 'baby-2', name: 'Emma' }]
    render(<AddEntryModal {...defaultProps} otherBabies={otherBabies} />)

    const emmaBtn = screen.getByRole('button', { name: /emma/i })

    // Initially not selected → should not have the active border class
    expect(emmaBtn.className).not.toContain('border-blue-500')

    // First click → selected
    fireEvent.click(emmaBtn)
    expect(emmaBtn.className).toContain('border-blue-500')

    // Second click → deselected
    fireEvent.click(emmaBtn)
    expect(emmaBtn.className).not.toContain('border-blue-500')
  })

  it('calls onSave for primary baby AND each selected "Also add for" baby when saving', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined)
    const onClose = jest.fn()
    const otherBabies = [
      { id: 'baby-2', name: 'Emma' },
      { id: 'baby-3', name: 'Oliver' },
    ]
    render(
      <AddEntryModal
        babyId="baby-1"
        defaultHour={8}
        otherBabies={otherBabies}
        onClose={onClose}
        onSave={onSave}
      />
    )

    // Select both other babies
    fireEvent.click(screen.getByRole('button', { name: /emma/i }))
    fireEvent.click(screen.getByRole('button', { name: /oliver/i }))

    // Click Save
    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      // onSave called once for primary baby + once for each selected baby = 3 total
      expect(onSave).toHaveBeenCalledTimes(3)
    })

    const calledBabyIds = onSave.mock.calls.map((call: [{ babyId: string }]) => call[0].babyId)
    expect(calledBabyIds).toContain('baby-1')
    expect(calledBabyIds).toContain('baby-2')
    expect(calledBabyIds).toContain('baby-3')
  })

  it('clicking only the primary save (no duplicates selected) calls onSave once', async () => {
    const onSave = jest.fn().mockResolvedValue(undefined)
    const onClose = jest.fn()
    render(
      <AddEntryModal
        babyId="baby-1"
        defaultHour={8}
        onClose={onClose}
        onSave={onSave}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: /^save$/i }))

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledTimes(1)
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ babyId: 'baby-1' })
      )
    })
  })

  it('clicking the backdrop (outer div) calls onClose', () => {
    const onClose = jest.fn()
    const { container } = render(
      <AddEntryModal {...defaultProps} onClose={onClose} />
    )
    // The outermost div is the backdrop
    const backdrop = container.firstChild as HTMLElement
    fireEvent.click(backdrop)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Save button is enabled by default (FEEDING selected means type is set)', () => {
    render(<AddEntryModal {...defaultProps} />)
    const saveBtn = screen.getByRole('button', { name: /^save$/i })
    expect(saveBtn).not.toBeDisabled()
  })

  it('clicking the X button calls onClose', () => {
    const onClose = jest.fn()
    render(<AddEntryModal {...defaultProps} onClose={onClose} />)
    // The X button is the one that contains the X icon text
    const xButton = screen.getByText('X').closest('button') as HTMLElement
    fireEvent.click(xButton)
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

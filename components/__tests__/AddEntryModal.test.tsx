import { render, screen, fireEvent } from '@testing-library/react'
import { AddEntryModal } from '../AddEntryModal'

describe('AddEntryModal', () => {
  const defaultProps = {
    babyId: 'baby-1',
    defaultHour: 8,
    onClose: jest.fn(),
    onSave: jest.fn().mockResolvedValue(undefined),
  }

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
})

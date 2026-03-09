import { render, screen } from '@testing-library/react'
import RegisterPage from '../page'

jest.mock('@/lib/auth-client', () => ({
  signUp: { email: jest.fn() },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

describe('RegisterPage', () => {
  it('renders name, email, and password fields', () => {
    render(<RegisterPage />)
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create account/i })).toBeInTheDocument()
  })

  it('renders link to login', () => {
    render(<RegisterPage />)
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument()
  })
})

import { render, screen } from '@testing-library/react'
import LoginPage from '../page'

jest.mock('@/lib/auth-client', () => ({
  signIn: { email: jest.fn() },
}))

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
}))

describe('LoginPage', () => {
  it('renders email and password fields', () => {
    render(<LoginPage />)
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('renders link to register', () => {
    render(<LoginPage />)
    expect(screen.getByRole('link', { name: /create account/i })).toBeInTheDocument()
  })
})

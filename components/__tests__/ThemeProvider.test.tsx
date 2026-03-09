import { render, screen, act, fireEvent } from '@testing-library/react'
import { ThemeProvider, useTheme } from '../ThemeProvider'

// ── matchMedia mock (no system preference by default) ──────────────────────────
const mockMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      addListener: jest.fn(),
      removeListener: jest.fn(),
    })),
  })
}

// ── Helper consumer that lets us read and toggle theme ─────────────────────────
function ThemeConsumer() {
  const { theme, toggle } = useTheme()
  return (
    <>
      <span data-testid="theme">{theme}</span>
      <button onClick={toggle}>Toggle</button>
    </>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    // Reset localStorage and html class before every test
    localStorage.clear()
    document.documentElement.classList.remove('dark')
    // Default: no system dark preference
    mockMatchMedia(false)
  })

  // ── Renders children ─────────────────────────────────────────────────────────

  it('renders children', () => {
    render(
      <ThemeProvider>
        <p>Hello world</p>
      </ThemeProvider>
    )
    expect(screen.getByText('Hello world')).toBeInTheDocument()
  })

  // ── Initial theme resolution ─────────────────────────────────────────────────

  it('defaults to "light" when no localStorage and no system dark preference', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )
    })
    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('reads "dark" from localStorage and adds "dark" class to documentElement', async () => {
    localStorage.setItem('theme', 'dark')
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )
    })
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('reads "light" from localStorage and does NOT add "dark" class', async () => {
    localStorage.setItem('theme', 'light')
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )
    })
    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('adds "dark" class when system prefers dark and no localStorage value', async () => {
    mockMatchMedia(true) // system prefers dark
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )
    })
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  // ── toggle() behaviour ───────────────────────────────────────────────────────

  it('toggle() switches from light to dark: adds "dark" class to html and saves to localStorage', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )
    })

    // Start in light mode
    expect(screen.getByTestId('theme').textContent).toBe('light')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /toggle/i }))
    })

    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('toggle() switches from dark to light: removes "dark" class and updates localStorage', async () => {
    localStorage.setItem('theme', 'dark')

    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )
    })

    // Start in dark mode
    expect(screen.getByTestId('theme').textContent).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /toggle/i }))
    })

    expect(screen.getByTestId('theme').textContent).toBe('light')
    expect(document.documentElement.classList.contains('dark')).toBe(false)
    expect(localStorage.getItem('theme')).toBe('light')
  })

  // ── useTheme hook ────────────────────────────────────────────────────────────

  it('useTheme returns theme and toggle', async () => {
    let capturedTheme: string | undefined
    let capturedToggle: (() => void) | undefined

    function Inspector() {
      const { theme, toggle } = useTheme()
      capturedTheme = theme
      capturedToggle = toggle
      return null
    }

    await act(async () => {
      render(
        <ThemeProvider>
          <Inspector />
        </ThemeProvider>
      )
    })

    expect(capturedTheme).toBe('light')
    expect(typeof capturedToggle).toBe('function')
  })

  it('useTheme toggle function changes the theme when called', async () => {
    await act(async () => {
      render(
        <ThemeProvider>
          <ThemeConsumer />
        </ThemeProvider>
      )
    })

    expect(screen.getByTestId('theme').textContent).toBe('light')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /toggle/i }))
    })

    expect(screen.getByTestId('theme').textContent).toBe('dark')
  })
})

import { useEffect, useState } from 'react'
import './App.css'

const API_URL = 'http://127.0.0.1:8000/api'

function formatPrice(price) {
  return Number(price).toLocaleString('en-PH', {
    maximumFractionDigits: 0,
  })
}

function App() {
  const [properties, setProperties] = useState([])
  const [search, setSearch] = useState('')
  const [type, setType] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedProperty, setSelectedProperty] = useState(null)

  const [authMode, setAuthMode] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState('')
  const [authSuccess, setAuthSuccess] = useState('')

  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('puyanan_user')
      return savedUser ? JSON.parse(savedUser) : null
    } catch {
      return null
    }
  })

  const [authForm, setAuthForm] = useState({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  })

  const [inquiryForm, setInquiryForm] = useState({ message: '' })
  const [inquiryLoading, setInquiryLoading] = useState(false)
  const [inquiryError, setInquiryError] = useState('')
  const [inquirySuccess, setInquirySuccess] = useState('')

  async function loadProperties(filters = {}) {
    setLoading(true)
    setError('')

    const params = new URLSearchParams()

    if (filters.search) params.set('search', filters.search)
    if (filters.type) params.set('type', filters.type)
    if (filters.minPrice !== '') params.set('min_price', filters.minPrice)
    if (filters.maxPrice !== '') params.set('max_price', filters.maxPrice)

    try {
      const response = await fetch(
        `${API_URL}/properties?${params.toString()}`,
        {
          headers: {
            Accept: 'application/json',
          },
        },
      )

      if (!response.ok) {
        throw new Error('Unable to load listings. Please check your filters.')
      }

      const result = await response.json()
      setProperties(result.data || [])
    } catch (err) {
      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to the server. Make sure Laravel is running.'
          : err.message,
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()

    async function fetchProperties() {
      try {
        const response = await fetch(`${API_URL}/properties`, {
          headers: {
            Accept: 'application/json',
          },
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Unable to load property listings.')
        }

        const result = await response.json()
        setProperties(result.data || [])
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(
            err.message === 'Failed to fetch'
              ? 'Cannot connect to the server. Make sure Laravel is running.'
              : err.message,
          )
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchProperties()

    return () => controller.abort()
  }, [])

  function handleSearch(event) {
    event.preventDefault()

    if (
      minPrice !== '' &&
      maxPrice !== '' &&
      Number(minPrice) > Number(maxPrice)
    ) {
      setError('Minimum price cannot be greater than maximum price.')
      return
    }

    loadProperties({ search, type, minPrice, maxPrice })
  }

  function resetFilters() {
    setSearch('')
    setType('')
    setMinPrice('')
    setMaxPrice('')
    loadProperties()
  }

  function openAuth(mode) {
    setAuthMode(mode)
    setAuthError('')
    setAuthSuccess('')
    setAuthForm({
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
    })
  }

  function closeAuth() {
    setAuthMode('')
    setAuthError('')
  }

  async function handleAuthSubmit(event) {
    event.preventDefault()
    setAuthError('')
    setAuthSuccess('')

    if (
      authMode === 'register' &&
      authForm.password !== authForm.password_confirmation
    ) {
      setAuthError('Passwords do not match.')
      return
    }

    setAuthLoading(true)

    try {
      const response = await fetch(`${API_URL}/${authMode}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(
          authMode === 'register'
            ? authForm
            : {
                email: authForm.email,
                password: authForm.password,
              },
        ),
      })

      const result = await response.json()

      if (!response.ok) {
        const validationMessages = result.errors
          ? Object.values(result.errors).flat().join(' ')
          : result.message

        throw new Error(validationMessages || 'Authentication failed.')
      }

      localStorage.setItem('puyanan_token', result.token)
      localStorage.setItem('puyanan_user', JSON.stringify(result.user))

      setCurrentUser(result.user)
      setAuthMode('')
      setAuthSuccess(result.message || 'Successfully signed in!')

      setAuthForm({
        name: '',
        email: '',
        password: '',
        password_confirmation: '',
      })
    } catch (err) {
      setAuthError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to Laravel. Make sure the backend server is running.'
          : err.message,
      )
    } finally {
      setAuthLoading(false)
    }
  }

  async function handleLogout() {
    const token = localStorage.getItem('puyanan_token')

    try {
      if (token) {
        await fetch(`${API_URL}/logout`, {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })
      }
    } catch {
      // Clear the local session even if the server is unavailable.
    } finally {
      localStorage.removeItem('puyanan_token')
      localStorage.removeItem('puyanan_user')
      setCurrentUser(null)
      setAuthSuccess('You have been logged out.')
      setAuthError('')
      setAuthMode('')
      setInquiryError('')
      setInquirySuccess('')
    }
  }

  function openProperty(property) {
    setSelectedProperty(property)
    setInquiryForm({ message: '' })
    setInquiryError('')
    setInquirySuccess('')
  }

  async function handleInquirySubmit(event) {
    event.preventDefault()
    setInquiryError('')
    setInquirySuccess('')

    if (!currentUser) {
      openAuth('login')
      return
    }

    if (currentUser.role !== 'customer') {
      setInquiryError(
        'Only customer accounts can send rental inquiries. Please log in with a customer account.',
      )
      return
    }

    const token = localStorage.getItem('puyanan_token')

    if (!token) {
      setInquiryError('Your session has expired. Please log in again.')
      return
    }

    setInquiryLoading(true)

    try {
      const response = await fetch(`${API_URL}/inquiries`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          property_id: selectedProperty.id,
          message: inquiryForm.message.trim(),
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('puyanan_token')
          localStorage.removeItem('puyanan_user')
          setCurrentUser(null)
        }

        const validationMessages = result.errors
          ? Object.values(result.errors).flat().join(' ')
          : result.message

        throw new Error(
          validationMessages || 'Unable to send your rental inquiry.',
        )
      }

      setInquiryForm({ message: '' })
      setInquirySuccess(
        result.message ||
          'Your rental inquiry has been sent successfully! Its status is Pending.',
      )
    } catch (err) {
      setInquiryError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to Laravel. Please check your connection and try again.'
          : err.message,
      )
    } finally {
      setInquiryLoading(false)
    }
  }

  return (
    <div className="app">
      <header className="navbar">
        <a className="brand" href="#" aria-label="Puy-anan home">
          <span className="brand-icon">P</span>
          <span>
            <strong>puy-anan</strong>
            <small>YOUR PLACE IN TUBIGON</small>
          </span>
        </a>

        <nav className="nav-links">
          <a className="active" href="#listings">Find a place</a>
          <a href="#about">About</a>
        </nav>

        <div className="nav-account">
          {currentUser ? (
            <>
              <span className="account-name">
                Hi, {currentUser.name.split(' ')[0]}
              </span>
              <button
                className="account-button"
                type="button"
                onClick={handleLogout}
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <button
                className="account-button"
                type="button"
                onClick={() => openAuth('login')}
              >
                Log in
              </button>
              <button
                className="nav-cta"
                type="button"
                onClick={() => openAuth('register')}
              >
                Create account
              </button>
            </>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="live-dot" />
              YOUR NEXT CHAPTER STARTS HERE
            </div>

            <h1>
              Find a place
              <br />
              to call <em>home.</em>
            </h1>

            <p className="hero-description">
              Discover boarding houses, apartments, and rooms for rent
              around Tubigon, Bohol. A little closer to where life happens.
            </p>

            <a className="hero-button" href="#listings">
              Find your space <span>↓</span>
            </a>

            <div className="hero-note">
              <span className="note-icon">⌂</span>
              <span>Made for students, couples, and families.</span>
            </div>
          </div>

          <div className="hero-art" aria-label="Illustration of a cozy home">
            <div className="sun" />
            <div className="art-label">A PLACE THAT FEELS RIGHT.</div>
            <div className="plant plant-left">♧</div>
            <div className="house">
              <div className="roof" />
              <div className="house-body">
                <div className="upper-window">
                  <span />
                  <span />
                </div>
                <div className="door">
                  <i />
                </div>
                <div className="lower-window">
                  <span />
                  <span />
                </div>
              </div>
            </div>
            <div className="ground" />
            <div className="plant plant-right">♧</div>
            <div className="art-caption">
              <span className="caption-mark">✳</span>
              <span>
                <strong>New beginnings</strong>
                <small>Start right here.</small>
              </span>
            </div>
          </div>
        </section>

        <section className="trust-strip">
          <div>
            <span className="trust-icon">⌂</span>
            <span>
              <strong>Local listings</strong>
              <small>Focused on Tubigon</small>
            </span>
          </div>
          <div>
            <span className="trust-icon">⌕</span>
            <span>
              <strong>Easy discovery</strong>
              <small>Search your way</small>
            </span>
          </div>
          <div>
            <span className="trust-icon">♡</span>
            <span>
              <strong>Your next home</strong>
              <small>One step at a time</small>
            </span>
          </div>
        </section>

        <section className="listing-section" id="listings">
          <div className="section-heading">
            <div>
              <span className="section-kicker">THE SEARCH STARTS HERE</span>
              <h2>Spaces for <em>your life.</em></h2>
              <p>Explore available places and find one that fits your needs.</p>
            </div>
            <span className="location-pill">⌖ Tubigon, Bohol</span>
          </div>

          <form className="search-panel" onSubmit={handleSearch}>
            <div className="filter-field search-field">
              <label htmlFor="search">SEARCH LISTINGS</label>
              <div className="input-wrap">
                <span>⌕</span>
                <input
                  id="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Location, name, or keyword"
                />
              </div>
            </div>

            <div className="filter-field">
              <label htmlFor="type">PROPERTY TYPE</label>
              <select
                id="type"
                value={type}
                onChange={(event) => setType(event.target.value)}
              >
                <option value="">All types</option>
                <option value="Boarding House">Boarding house</option>
                <option value="Apartment">Apartment</option>
                <option value="Room">Room for rent</option>
              </select>
            </div>

            <div className="filter-field price-field">
              <label htmlFor="minPrice">MIN. MONTHLY (₱)</label>
              <input
                id="minPrice"
                type="number"
                min="0"
                value={minPrice}
                onChange={(event) => setMinPrice(event.target.value)}
                placeholder="Any"
              />
            </div>

            <div className="filter-field price-field">
              <label htmlFor="maxPrice">MAX. MONTHLY (₱)</label>
              <input
                id="maxPrice"
                type="number"
                min="0"
                value={maxPrice}
                onChange={(event) => setMaxPrice(event.target.value)}
                placeholder="Any"
              />
            </div>

            <button className="search-button" type="submit">Search ↗</button>
            <button className="reset-button" type="button" onClick={resetFilters}>
              Reset
            </button>
          </form>

          <div className="results-bar">
            <div>
              <h3>Available spaces</h3>
              <p>
                {loading
                  ? 'Finding places for you...'
                  : `${properties.length} listing${properties.length === 1 ? '' : 's'} on this page`}
              </p>
            </div>
            <span className="availability-label">
              <span className="live-dot" /> UPDATED FROM LISTINGS
            </span>
          </div>

          {error && (
            <div className="message error-message" role="alert">
              <strong>Something went wrong</strong>
              <span>{error}</span>
              <button type="button" onClick={() => loadProperties()}>
                Try again
              </button>
            </div>
          )}

          {loading && (
            <div className="loading-grid" aria-label="Loading listings">
              {[1, 2, 3].map((item) => (
                <div className="skeleton-card" key={item}>
                  <div className="skeleton-image" />
                  <div className="skeleton-line" />
                  <div className="skeleton-line short" />
                </div>
              ))}
            </div>
          )}

          {!loading && !error && properties.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">⌂</span>
              <h3>No matching spaces yet</h3>
              <p>
                Try a different keyword or clear your filters to see more listings.
              </p>
              <button className="search-button" type="button" onClick={resetFilters}>
                Clear filters
              </button>
            </div>
          )}

          {!loading && !error && properties.length > 0 && (
            <div className="property-grid">
              {properties.map((property, index) => (
                <article className="property-card" key={property.id}>
                  <div className={`property-image illustration-${index % 3}`}>
                    {property.image ? (
                      <img src={property.image} alt={property.title} />
                    ) : (
                      <div className="property-illustration">
                        <span className="illustration-sun" />
                        <span className="illustration-roof" />
                        <span className="illustration-house">
                          <i />
                          <i />
                          <b />
                        </span>
                        <span className="illustration-plant">♧</span>
                      </div>
                    )}
                    <span className="property-type">{property.type}</span>
                    <span className="available-badge">
                      <span className="live-dot" /> {property.status || 'Available'}
                    </span>
                  </div>

                  <div className="property-info">
                    <div className="property-location">⌖ {property.location}</div>
                    <h3>{property.title}</h3>
                    <p className="property-description">
                      {property.description || 'Contact the property owner for more details.'}
                    </p>
                    <div className="property-footer">
                      <div className="price">
                        <strong>₱{formatPrice(property.price)}</strong>
                        <span>/ month</span>
                      </div>
                      <button
                        className="details-button"
                        type="button"
                        onClick={() => openProperty(property)}
                      >
                        View details <span>↗</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}

          <p className="demo-note">
            Listings are provided by the system database. Always confirm details
            with the property owner before making rental arrangements.
          </p>
        </section>

        <section className="about-section" id="about">
          <div className="about-symbol">⌂</div>
          <div>
            <span className="section-kicker">A LITTLE CLOSER TO HOME</span>
            <h2>Finding a place should feel <em>simple.</em></h2>
            <p>
              Puy-anan helps people explore rental options around Tubigon,
              Bohol, so they can spend less time searching and more time
              settling into their next chapter.
            </p>
          </div>
          <a href="#listings" className="about-link">Explore listings ↗</a>
        </section>
      </main>

      <footer className="footer">
        <a className="brand footer-brand" href="#">
          <span className="brand-icon">P</span>
          <span>
            <strong>puy-anan</strong>
            <small>YOUR PLACE IN TUBIGON</small>
          </span>
        </a>
        <span>Find your space. Feel at home.</span>
        <span>© 2026 Puy-anan Rental Listings</span>
      </footer>

      {selectedProperty && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setSelectedProperty(null)}
        >
          <section
            className="property-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close details"
              onClick={() => setSelectedProperty(null)}
            >
              ×
            </button>

            <span className="section-kicker">PROPERTY DETAILS</span>
            <h2 id="modal-title">{selectedProperty.title}</h2>
            <p className="modal-location">⌖ {selectedProperty.location}</p>
            <div className="modal-price">
              ₱{formatPrice(selectedProperty.price)}
              <span> / month</span>
            </div>
            <div className="modal-divider" />
            <p className="modal-description">
              {selectedProperty.description || 'No additional description provided.'}
            </p>
            <div className="modal-detail-row">
              <span>Property type</span>
              <strong>{selectedProperty.type}</strong>
            </div>
            <div className="modal-detail-row">
              <span>Availability</span>
              <strong className="status-available">
                {selectedProperty.status || 'Available'}
              </strong>
            </div>

            {selectedProperty.status === 'Unavailable' ? (
              <div className="inquiry-notice">
                This property is currently unavailable for rental inquiries.
              </div>
            ) : currentUser?.role === 'customer' ? (
              <div className="inquiry-section">
                <div className="modal-divider" />
                <span className="section-kicker">INTERESTED IN THIS PLACE?</span>
                <h3>Send a rental inquiry</h3>
                <p className="inquiry-description">
                  Introduce yourself and let the property owner know you are interested.
                </p>

                {inquiryError && (
                  <div className="message error-message" role="alert">
                    {inquiryError}
                  </div>
                )}

                {inquirySuccess && (
                  <div className="message inquiry-success" role="status">
                    <strong>Inquiry sent!</strong>
                    <span>{inquirySuccess}</span>
                  </div>
                )}

                <form className="inquiry-form" onSubmit={handleInquirySubmit}>
                  <div className="filter-field">
                    <label htmlFor="inquiry-message">YOUR MESSAGE</label>
                    <textarea
                      id="inquiry-message"
                      rows={4}
                      minLength={10}
                      maxLength={2000}
                      required
                      value={inquiryForm.message}
                      onChange={(event) =>
                        setInquiryForm({ message: event.target.value })
                      }
                      placeholder="Hello, I am interested in this property. May I know if it is still available?"
                    />
                    <small className="inquiry-counter">
                      {inquiryForm.message.length}/2000 characters (minimum 10)
                    </small>
                  </div>

                  <button
                    className="search-button inquiry-submit"
                    type="submit"
                    disabled={inquiryLoading}
                  >
                    {inquiryLoading ? 'Sending inquiry...' : 'Send inquiry ↗'}
                  </button>
                </form>
              </div>
            ) : currentUser ? (
              <div className="inquiry-notice">
                You are logged in as a {currentUser.role}. Rental inquiries can only be sent from a customer account.
              </div>
            ) : (
              <div className="inquiry-guest">
                <p className="inquiry-description">
                  Interested in this property? Log in or create a customer account to contact the owner.
                </p>
                <div className="inquiry-auth-actions">
                  <button
                    className="search-button"
                    type="button"
                    onClick={() => openAuth('login')}
                  >
                    Log in to inquire
                  </button>
                  <button
                    className="reset-button"
                    type="button"
                    onClick={() => openAuth('register')}
                  >
                    Create account
                  </button>
                </div>
              </div>
            )}

            <button
              className="search-button modal-done"
              type="button"
              onClick={() => setSelectedProperty(null)}
            >
              Back to listings
            </button>
          </section>
        </div>
      )}

      {authMode && (
        <div
          className="modal-backdrop auth-backdrop"
          role="presentation"
          onClick={closeAuth}
        >
          <section
            className="property-modal auth-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-title"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="modal-close"
              type="button"
              aria-label="Close authentication"
              onClick={closeAuth}
            >
              ×
            </button>

            <span className="section-kicker">WELCOME TO PUY-ANAN</span>
            <h2 id="auth-title">
              {authMode === 'register' ? 'Create your account' : 'Welcome back'}
            </h2>
            <p className="auth-description">
              {authMode === 'register'
                ? 'Create an account to start exploring rental opportunities.'
                : 'Log in to continue to your account.'}
            </p>

            {authError && (
              <div className="message error-message" role="alert">
                {authError}
              </div>
            )}

            <form className="auth-form" onSubmit={handleAuthSubmit}>
              {authMode === 'register' && (
                <div className="filter-field">
                  <label htmlFor="auth-name">FULL NAME</label>
                  <input
                    id="auth-name"
                    type="text"
                    autoComplete="name"
                    maxLength={255}
                    required
                    value={authForm.name}
                    onChange={(event) =>
                      setAuthForm({ ...authForm, name: event.target.value })
                    }
                    placeholder="Enter your full name"
                  />
                </div>
              )}

              <div className="filter-field">
                <label htmlFor="auth-email">EMAIL ADDRESS</label>
                <input
                  id="auth-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={authForm.email}
                  onChange={(event) =>
                    setAuthForm({ ...authForm, email: event.target.value })
                  }
                  placeholder="you@example.com"
                />
              </div>

              <div className="filter-field">
                <label htmlFor="auth-password">PASSWORD</label>
                <input
                  id="auth-password"
                  type="password"
                  autoComplete={
                    authMode === 'register' ? 'new-password' : 'current-password'
                  }
                  minLength={8}
                  required
                  value={authForm.password}
                  onChange={(event) =>
                    setAuthForm({ ...authForm, password: event.target.value })
                  }
                  placeholder="At least 8 characters"
                />
              </div>

              {authMode === 'register' && (
                <div className="filter-field">
                  <label htmlFor="auth-confirm-password">CONFIRM PASSWORD</label>
                  <input
                    id="auth-confirm-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={8}
                    required
                    value={authForm.password_confirmation}
                    onChange={(event) =>
                      setAuthForm({
                        ...authForm,
                        password_confirmation: event.target.value,
                      })
                    }
                    placeholder="Enter your password again"
                  />
                </div>
              )}

              <button
                className="search-button auth-submit"
                type="submit"
                disabled={authLoading}
              >
                {authLoading
                  ? 'Please wait...'
                  : authMode === 'register'
                    ? 'Create account'
                    : 'Log in'}
              </button>
            </form>

            <p className="auth-switch">
              {authMode === 'register'
                ? 'Already have an account?'
                : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() =>
                  openAuth(authMode === 'register' ? 'login' : 'register')
                }
              >
                {authMode === 'register' ? 'Log in' : 'Register'}
              </button>
            </p>
          </section>
        </div>
      )}

      {authSuccess && (
        <div className="auth-toast" role="status">
          {authSuccess}
          <button
            type="button"
            aria-label="Dismiss message"
            onClick={() => setAuthSuccess('')}
          >
            ×
          </button>
        </div>
      )}
    </div>
  )
}

export default App
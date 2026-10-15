
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
    setLoading(true)
    setError('')

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

        <a className="nav-cta" href="#listings">Explore rentals <span>↗</span></a>
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
            <span><strong>Local listings</strong><small>Focused on Tubigon</small></span>
          </div>
          <div>
            <span className="trust-icon">⌕</span>
            <span><strong>Easy discovery</strong><small>Search your way</small></span>
          </div>
          <div>
            <span className="trust-icon">♡</span>
            <span><strong>Your next home</strong><small>One step at a time</small></span>
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
              <p>Try a different keyword or clear your filters to see more listings.</p>
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
                      <span className="live-dot" /> Available
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
                        onClick={() => setSelectedProperty(property)}
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
          <span><strong>puy-anan</strong><small>YOUR PLACE IN TUBIGON</small></span>
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
              <strong className="status-available">{selectedProperty.status}</strong>
            </div>
            <p className="modal-notice">
              Rental inquiries will be available once customer accounts are connected.
            </p>
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
    </div>
  )
}

export default App

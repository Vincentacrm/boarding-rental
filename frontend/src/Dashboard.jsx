
import { useCallback, useEffect, useState } from 'react'
import './Dashboard.css'

const API_URL = 'http://127.0.0.1:8000/api'

const numberFormat = new Intl.NumberFormat('en-PH')
const moneyFormat = new Intl.NumberFormat('en-PH', {
  style: 'currency',
  currency: 'PHP',
  maximumFractionDigits: 0,
})

function formatMoney(value) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? moneyFormat.format(amount) : '₱0'
}

function formatNumber(value) {
  const amount = Number(value ?? 0)
  return numberFormat.format(Number.isFinite(amount) ? amount : 0)
}

function formatDate(value) {
  if (!value) return 'Date unavailable'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) return 'Date unavailable'

  return date.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getInitials(name) {
  return (name || 'Tenant')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

function getStatus(value) {
  const status = String(value || 'Pending').toLowerCase()

  if (status === 'approved') {
    return { label: 'Approved', className: 'approved' }
  }

  if (status === 'completed') {
    return { label: 'Completed', className: 'completed' }
  }

  if (status === 'unavailable' || status === 'inactive') {
    return { label: 'Unavailable', className: 'unavailable' }
  }

  if (status === 'rejected') {
    return { label: 'Rejected', className: 'rejected' }
  }

  return {
    label: status.charAt(0).toUpperCase() + status.slice(1),
    className: status === 'available' ? 'available' : 'pending',
  }
}

function getPropertyImage(property) {
  const image = property?.image_url || property?.image

  if (typeof image === 'string' && /^https?:\/\//i.test(image)) {
    return image
  }

  return ''
}

function getPropertyTitle(property) {
  return property?.title || property?.name || 'Untitled property'
}

function getPropertyLocation(property) {
  return property?.location || 'Tubigon, Bohol'
}

function getInquiryCustomer(inquiry) {
  return inquiry?.user?.name ||
    inquiry?.customer?.name ||
    inquiry?.customer_name ||
    'Prospective tenant'
}

function getInquiryProperty(inquiry) {
  return inquiry?.property?.title ||
    inquiry?.property_title ||
    'Rental property'
}

function StatCard({ label, value, description, icon, tone }) {
  return (
    <article className={`dashboard-stat-card ${tone}`}>
      <div className="dashboard-stat-top">
        <span className="dashboard-stat-label">{label}</span>
        <span className="dashboard-stat-icon" aria-hidden="true">
          {icon}
        </span>
      </div>

      <strong className="dashboard-stat-value">
        {formatNumber(value)}
      </strong>

      <span className="dashboard-stat-description">{description}</span>
    </article>
  )
}

function PropertySkeleton() {
  return (
    <div className="dashboard-property-skeleton" aria-hidden="true">
      <div className="dashboard-skeleton dashboard-skeleton-image" />
      <div className="dashboard-skeleton-content">
        <div className="dashboard-skeleton dashboard-skeleton-line" />
        <div className="dashboard-skeleton dashboard-skeleton-short" />
        <div className="dashboard-skeleton dashboard-skeleton-price" />
      </div>
    </div>
  )
}

function Dashboard({
  currentUser,
  onBack = () => {},
}) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const userName = currentUser?.name?.trim()?.split(/\s+/)[0] || 'there'
  const role = String(currentUser?.role || '').toLowerCase()

  const isOwner = role === 'owner'
  const isAdmin = role === 'admin' || role === 'superadmin'

  const loadDashboard = useCallback(async (signal) => {
    const token = localStorage.getItem('puyanan_token')

    if (!token) {
      setError('Your login session could not be found. Please log in again.')
      setDashboard(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`${API_URL}/dashboard`, {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${token}`,
        },
        signal,
      })

      const result = await response.json().catch(() => ({}))

      if (!response.ok) {
        if (response.status === 401) {
          localStorage.removeItem('puyanan_token')
          localStorage.removeItem('puyanan_user')
          throw new Error('Your session has expired. Please log in again.')
        }

        if (response.status === 403) {
          throw new Error(
            'Your account does not have permission to access this dashboard.',
          )
        }

        throw new Error(
          result.message || 'Unable to load dashboard information.',
        )
      }

      if (signal?.aborted) return

      const data = result.data ?? result
      setDashboard(data)
    } catch (err) {
      if (signal?.aborted || err.name === 'AbortError') return

      setError(
        err.message === 'Failed to fetch'
          ? 'Cannot connect to Laravel. Make sure the backend server is running.'
          : err.message || 'Something went wrong while loading your dashboard.',
      )
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()

    loadDashboard(controller.signal)

    return () => controller.abort()
  }, [loadDashboard])

  const stats = dashboard?.stats || {}
  const properties = Array.isArray(dashboard?.recent_properties)
    ? dashboard.recent_properties
    : Array.isArray(dashboard?.properties?.data)
      ? dashboard.properties.data
      : Array.isArray(dashboard?.properties)
        ? dashboard.properties
        : []

  const inquiries = Array.isArray(dashboard?.recent_inquiries)
    ? dashboard.recent_inquiries
    : Array.isArray(dashboard?.inquiries?.data)
      ? dashboard.inquiries.data
      : Array.isArray(dashboard?.inquiries)
        ? dashboard.inquiries
        : []

  const totalProperties =
    stats.total_properties ?? stats.properties_count ?? properties.length

  const availableProperties =
    stats.available_properties ??
    stats.available_listings ??
    stats.available ??
    0

  const unavailableProperties =
    stats.unavailable_properties ??
    stats.unavailable_listings ??
    stats.unavailable ??
    0

  const totalInquiries =
    stats.total_inquiries ?? stats.inquiries_count ?? inquiries.length

  const pendingInquiries = stats.pending_inquiries ?? stats.pending ?? 0
  const approvedInquiries = stats.approved_inquiries ?? stats.approved ?? 0
  const completedInquiries = stats.completed_inquiries ?? stats.completed ?? 0

  const statCards = isAdmin
    ? [
        {
          label: 'Total properties',
          value: totalProperties,
          description: 'Properties in the system',
          icon: '⌂',
          tone: 'green',
        },
        {
          label: 'Available listings',
          value: availableProperties,
          description: 'Ready for new tenants',
          icon: '✓',
          tone: 'blue',
        },
        {
          label: 'Total inquiries',
          value: totalInquiries,
          description: 'Rental requests received',
          icon: '↗',
          tone: 'purple',
        },
        {
          label: 'Pending inquiries',
          value: pendingInquiries,
          description: 'Waiting for review',
          icon: '◷',
          tone: 'orange',
        },
      ]
    : [
        {
          label: 'My properties',
          value: totalProperties,
          description: 'Your rental listings',
          icon: '⌂',
          tone: 'green',
        },
        {
          label: 'Available listings',
          value: availableProperties,
          description: 'Open for new tenants',
          icon: '✓',
          tone: 'blue',
        },
        {
          label: 'Pending inquiries',
          value: pendingInquiries,
          description: 'Need your attention',
          icon: '◷',
          tone: 'orange',
        },
        {
          label: 'Total inquiries',
          value: totalInquiries,
          description: 'Interest in your properties',
          icon: '↗',
          tone: 'purple',
        },
      ]

  return (
    <main className="dashboard-page">
      <div className="dashboard-container">
        <div className="dashboard-breadcrumb">
          <button
            className="dashboard-back-link"
            type="button"
            onClick={onBack}
          >
            <span aria-hidden="true">←</span> Back to listings
          </button>

          <span className="dashboard-breadcrumb-divider">/</span>
          <span>Dashboard</span>
        </div>

        <section className="dashboard-welcome">
          <div className="dashboard-welcome-copy">
            <span className="dashboard-eyebrow">
              {isAdmin ? 'SYSTEM OVERVIEW' : 'OWNER WORKSPACE'}
            </span>

            <h1>
              Good day, {userName}!
            </h1>

            <p>
              {isAdmin
                ? 'Here is an overview of rental listings and inquiries across Puy-anan.'
                : 'Manage your rental properties and keep track of prospective tenants.'}
            </p>
          </div>

          <div className="dashboard-welcome-mark" aria-hidden="true">
            <span>⌂</span>
          </div>
        </section>

        {error && (
          <section className="dashboard-error" role="alert">
            <div className="dashboard-error-icon" aria-hidden="true">!</div>

            <div className="dashboard-error-copy">
              <h2>We couldn't load your dashboard</h2>
              <p>{error}</p>
            </div>

            <button
              className="dashboard-retry-button"
              type="button"
              onClick={() => loadDashboard()}
              disabled={loading}
            >
              {loading ? 'Loading…' : 'Try again'}
            </button>
          </section>
        )}

        <section className="dashboard-section">
          <div className="dashboard-section-heading">
            <div>
              <h2>Overview</h2>
              <p>Your rental activity at a glance</p>
            </div>

            <span className="dashboard-live-label">
              <span className="dashboard-live-dot" />
              Live data
            </span>
          </div>

          <div className="dashboard-stats">
            {statCards.map((card) => (
              <StatCard key={card.label} {...card} value={loading ? '—' : card.value} />
            ))}
          </div>
        </section>

        {isOwner && (
          <section className="dashboard-section dashboard-quick-summary">
            <div className="dashboard-section-heading">
              <div>
                <h2>Inquiry progress</h2>
                <p>See where your rental requests stand</p>
              </div>
            </div>

            <div className="dashboard-progress-grid">
              <div className="dashboard-progress-item">
                <span className="dashboard-progress-dot pending" />
                <span>Pending</span>
                <strong>{loading ? '—' : formatNumber(pendingInquiries)}</strong>
              </div>

              <div className="dashboard-progress-item">
                <span className="dashboard-progress-dot approved" />
                <span>Approved</span>
                <strong>{loading ? '—' : formatNumber(approvedInquiries)}</strong>
              </div>

              <div className="dashboard-progress-item">
                <span className="dashboard-progress-dot completed" />
                <span>Completed</span>
                <strong>{loading ? '—' : formatNumber(completedInquiries)}</strong>
              </div>

              <div className="dashboard-progress-item">
                <span className="dashboard-progress-dot unavailable" />
                <span>Unavailable listings</span>
                <strong>{loading ? '—' : formatNumber(unavailableProperties)}</strong>
              </div>
            </div>
          </section>
        )}

        <div className="dashboard-content-grid">
          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2>{isAdmin ? 'Recent properties' : 'My properties'}</h2>
                <p>
                  {isAdmin
                    ? 'Recently added rental listings'
                    : 'Your latest rental listings'}
                </p>
              </div>

              <button
                className="dashboard-text-button"
                type="button"
                onClick={onBack}
              >
                Browse listings <span aria-hidden="true">→</span>
              </button>
            </div>

            {loading ? (
              <div className="dashboard-property-list">
                <PropertySkeleton />
                <PropertySkeleton />
              </div>
            ) : properties.length > 0 ? (
              <div className="dashboard-property-list">
                {properties.slice(0, 5).map((property) => {
                  const status = getStatus(property.status)
                  const image = getPropertyImage(property)

                  return (
                    <article
                      className="dashboard-property-item"
                      key={property.id ?? `${getPropertyTitle(property)}-${getPropertyLocation(property)}`}
                    >
                      <div className="dashboard-property-image">
                        {image ? (
                          <img
                            src={image}
                            alt={getPropertyTitle(property)}
                            loading="lazy"
                          />
                        ) : (
                          <div
                            className="dashboard-property-placeholder"
                            aria-label="No property photo available"
                          >
                            <span aria-hidden="true">⌂</span>
                            <small>PUY-ANAN</small>
                          </div>
                        )}
                      </div>

                      <div className="dashboard-property-details">
                        <div className="dashboard-property-title-row">
                          <h3>{getPropertyTitle(property)}</h3>
                          <span className={`dashboard-status ${status.className}`}>
                            {status.label}
                          </span>
                        </div>

                        <p className="dashboard-property-location">
                          <span aria-hidden="true">⌖</span>
                          {getPropertyLocation(property)}
                        </p>

                        <div className="dashboard-property-bottom">
                          <strong>{formatMoney(property.price)}</strong>
                          <span>
                            {property.type || 'Rental property'}
                          </span>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="dashboard-empty-state">
                <span className="dashboard-empty-icon" aria-hidden="true">⌂</span>
                <h3>No properties to display</h3>
                <p>
                  {error
                    ? 'Property information is unavailable until the connection is restored.'
                    : 'Your property listings will appear here when available.'}
                </p>
                <button
                  className="dashboard-secondary-button"
                  type="button"
                  onClick={onBack}
                >
                  View listings
                </button>
              </div>
            )}
          </section>

          <section className="dashboard-panel">
            <div className="dashboard-panel-header">
              <div>
                <h2>Recent inquiries</h2>
                <p>Messages from prospective tenants</p>
              </div>

              <span className="dashboard-panel-count">
                {loading ? '—' : formatNumber(totalInquiries)}
              </span>
            </div>

            {loading ? (
              <div className="dashboard-inquiry-list">
                <div className="dashboard-inquiry-skeleton">
                  <div className="dashboard-skeleton dashboard-skeleton-avatar" />
                  <div className="dashboard-skeleton-lines">
                    <div className="dashboard-skeleton dashboard-skeleton-line" />
                    <div className="dashboard-skeleton dashboard-skeleton-short" />
                  </div>
                </div>
                <div className="dashboard-inquiry-skeleton">
                  <div className="dashboard-skeleton dashboard-skeleton-avatar" />
                  <div className="dashboard-skeleton-lines">
                    <div className="dashboard-skeleton dashboard-skeleton-line" />
                    <div className="dashboard-skeleton dashboard-skeleton-short" />
                  </div>
                </div>
              </div>
            ) : inquiries.length > 0 ? (
              <div className="dashboard-inquiry-list">
                {inquiries.slice(0, 6).map((inquiry) => {
                  const status = getStatus(inquiry.status)

                  return (
                    <article
                      className="dashboard-inquiry-item"
                      key={inquiry.id ?? `${getInquiryCustomer(inquiry)}-${inquiry.created_at}`}
                    >
                      <div className="dashboard-inquiry-avatar">
                        {getInitials(getInquiryCustomer(inquiry))}
                      </div>

                      <div className="dashboard-inquiry-content">
                        <div className="dashboard-inquiry-title-row">
                          <h3>{getInquiryCustomer(inquiry)}</h3>
                          <span className={`dashboard-status ${status.className}`}>
                            {status.label}
                          </span>
                        </div>

                        <p className="dashboard-inquiry-property">
                          {getInquiryProperty(inquiry)}
                        </p>

                        {inquiry.message && (
                          <p className="dashboard-inquiry-message">
                            {inquiry.message}
                          </p>
                        )}

                        <span className="dashboard-inquiry-date">
                          {formatDate(inquiry.created_at)}
                        </span>
                      </div>
                    </article>
                  )
                })}
              </div>
            ) : (
              <div className="dashboard-empty-state dashboard-empty-compact">
                <span className="dashboard-empty-icon" aria-hidden="true">✉</span>
                <h3>No inquiries yet</h3>
                <p>New rental inquiries will appear here.</p>
              </div>
            )}
          </section>
        </div>

        <footer className="dashboard-footer">
          <span>PUY-ANAN</span>
          <span>Find your place in Tubigon.</span>
        </footer>
      </div>
    </main>
  )
}

export default Dashboard

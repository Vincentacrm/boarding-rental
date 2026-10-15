import { useEffect, useState } from 'react'
import './Dashboard.css'

const API_URL = 'http://127.0.0.1:8000/api'

function Dashboard({ currentUser, onBack }) {
  const [dashboard, setDashboard] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [retryCount, setRetryCount] = useState(0)

  useEffect(() => {
    let cancelled = false

    async function loadDashboard() {
      setLoading(true)
      setError('')

      const token = localStorage.getItem('puyanan_token')

      if (!token) {
        if (!cancelled) {
          setError('Your login session has expired. Please log in again.')
          setLoading(false)
        }
        return
      }

      try {
        const response = await fetch(`${API_URL}/dashboard`, {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            Authorization: `Bearer ${token}`,
          },
        })

        const result = await response.json().catch(() => ({}))

        if (response.status === 401) {
          localStorage.removeItem('puyanan_token')
          localStorage.removeItem('puyanan_user')

          if (!cancelled) {
            setError('Your login session has expired. Please log in again.')
          }
          return
        }

        if (!response.ok) {
          throw new Error(
            result.message || `Unable to load dashboard (HTTP ${response.status}).`,
          )
        }

        if (!cancelled) {
          setDashboard({
            user: result.user || {},
            stats: result.stats || {},
            recent_properties: Array.isArray(result.recent_properties)
              ? result.recent_properties
              : [],
            recent_inquiries: Array.isArray(result.recent_inquiries)
              ? result.recent_inquiries
              : [],
          })
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message === 'Failed to fetch'
              ? 'Cannot connect to Laravel. Make sure the backend server is running at http://127.0.0.1:8000.'
              : err.message || 'Something went wrong while loading your dashboard.',
          )
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadDashboard()

    return () => {
      cancelled = true
    }
  }, [retryCount])

  const stats = dashboard?.stats || {}
  const role = currentUser?.role || dashboard?.user?.role || 'customer'
  const isAdmin = ['admin', 'superadmin'].includes(role)
  const isOwner = role === 'owner'

  const statCards = isOwner || isAdmin
    ? [
        { label: 'Total properties', value: stats.total_properties ?? 0 },
        { label: 'Available properties', value: stats.available_properties ?? 0 },
        { label: 'Total inquiries', value: stats.total_inquiries ?? 0 },
        { label: 'Pending inquiries', value: stats.pending_inquiries ?? 0 },
      ]
    : [
        { label: 'Available properties', value: stats.available_properties ?? 0 },
        { label: 'My inquiries', value: stats.total_inquiries ?? 0 },
        { label: 'Pending inquiries', value: stats.pending_inquiries ?? 0 },
        { label: 'Approved inquiries', value: stats.approved_inquiries ?? 0 },
      ]

  function formatPrice(price) {
    const amount = Number(price)

    if (!Number.isFinite(amount)) {
      return '0'
    }

    return amount.toLocaleString('en-PH', {
      maximumFractionDigits: 2,
    })
  }

  function retryLoading() {
    setRetryCount((count) => count + 1)
  }

  return (
    <section className="dashboard-page">
      <div className="dashboard-heading">
        <div>
          <span className="section-kicker">YOUR PUY-ANAN ACCOUNT</span>
          <h1>
            Welcome back,{' '}
            <em>
              {(currentUser?.name || dashboard?.user?.name || 'there').split(' ')[0]}
            </em>
          </h1>
          <p>
            Your {role} dashboard for managing your rental activity.
          </p>
        </div>

        <button
          className="dashboard-back-button"
          type="button"
          onClick={onBack}
        >
          ← Back to listings
        </button>
      </div>

      {loading && (
        <div className="dashboard-loading" role="status">
          <span>Loading your dashboard...</span>
        </div>
      )}

      {!loading && error && (
        <div className="dashboard-error" role="alert">
          <p>{error}</p>

          <div className="dashboard-error-actions">
            {error.includes('session has expired') ? (
              <button
                className="dashboard-back-button"
                type="button"
                onClick={() => window.location.reload()}
              >
                Return to login
              </button>
            ) : (
              <button
                className="dashboard-back-button"
                type="button"
                onClick={retryLoading}
              >
                Try again
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && !error && dashboard && (
        <>
          <div className="dashboard-stats">
            {statCards.map((stat) => (
              <article className="dashboard-stat" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </article>
            ))}
          </div>

          <div className="dashboard-panels">
            <section className="dashboard-panel">
              <h2>
                {isOwner || isAdmin
                  ? 'Recent properties'
                  : 'Recently listed properties'}
              </h2>

              {dashboard.recent_properties.length > 0 ? (
                dashboard.recent_properties.map((property) => (
                  <article className="dashboard-record" key={property.id}>
                    <strong>{property.title || 'Untitled property'}</strong>
                    <p>{property.location || 'Location not provided'}</p>
                    <p>₱{formatPrice(property.price)} / month</p>
                    <span className="dashboard-status">
                      {property.status || 'Unknown status'}
                    </span>
                  </article>
                ))
              ) : (
                <div className="dashboard-empty">
                  No property records to display yet.
                </div>
              )}
            </section>

            <section className="dashboard-panel">
              <h2>Recent rental inquiries</h2>

              {dashboard.recent_inquiries.length > 0 ? (
                dashboard.recent_inquiries.map((inquiry) => (
                  <article className="dashboard-record" key={inquiry.id}>
                    <strong>
                      {inquiry.property?.title || `Inquiry #${inquiry.id}`}
                    </strong>
                    <p>
                      From: {inquiry.user?.name || 'Customer'}
                    </p>
                    <p>
                      {inquiry.message || 'No message provided.'}
                    </p>
                    <span className="dashboard-status">
                      {inquiry.status || 'Pending'}
                    </span>
                  </article>
                ))
              ) : (
                <div className="dashboard-empty">
                  No rental inquiries to display yet.
                </div>
              )}
            </section>
          </div>

          <p className="demo-note">
            Dashboard statistics are retrieved from the Laravel API and your
            application's database.
          </p>
        </>
      )}
    </section>
  )
}

export default Dashboard

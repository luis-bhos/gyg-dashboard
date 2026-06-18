import React, { useState, useEffect } from 'react'
import { supabase } from './supabase'

const BASE_URL = window.location.origin

function generateSlug() {
  return Math.random().toString(36).substring(2, 8)
}

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : {}}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export default function App() {
  const [links, setLinks] = useState([])
  const [clicks, setClicks] = useState([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [copied, setCopied] = useState(null)
  const [form, setForm] = useState({ name: '', destination_url: '' })
  const [activeTab, setActiveTab] = useState('links')
  const [error, setError] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    setLoading(true)
    const { data: linksData } = await supabase
      .from('links')
      .select('*')
      .order('created_at', { ascending: false })

    const { data: clicksData } = await supabase
      .from('clicks')
      .select('*')
      .order('clicked_at', { ascending: false })

    setLinks(linksData || [])
    setClicks(clicksData || [])
    setLoading(false)
  }

  async function createLink() {
    setError('')
    if (!form.name.trim()) return setError('Add a name for this link')
    if (!form.destination_url.trim()) return setError('Add a destination URL')

    let dest = form.destination_url.trim()
    if (!dest.startsWith('http')) {
      dest = 'https://' + dest
    }

    setCreating(true)
    const slug = generateSlug()

    const { error: err } = await supabase.from('links').insert({
      name: form.name.trim(),
      slug,
      destination_url: dest,
      click_count: 0,
      created_at: new Date().toISOString()
    })

    if (err) {
      setError('Error creating link. Check your Supabase setup.')
      setCreating(false)
      return
    }

    setForm({ name: '', destination_url: '' })
    setShowForm(false)
    setCreating(false)
    fetchData()
  }

  async function deleteLink(id) {
    await supabase.from('clicks').delete().eq('link_id', id)
    await supabase.from('links').delete().eq('id', id)
    fetchData()
  }

  function copyLink(slug) {
    const url = `${BASE_URL}/r/${slug}`
    navigator.clipboard.writeText(url)
    setCopied(slug)
    setTimeout(() => setCopied(null), 2000)
  }

  const totalClicks = clicks.length
  const appClicks = clicks.filter(c => c.outcome === 'app').length
  const webClicks = clicks.filter(c => c.outcome === 'web').length
  const appRate = totalClicks > 0 ? Math.round((appClicks / totalClicks) * 100) : 0
  const androidClicks = clicks.filter(c => c.device === 'android').length
  const iosClicks = clicks.filter(c => c.device === 'ios').length
  const desktopClicks = clicks.filter(c => c.device === 'desktop').length

  const recentClicks = clicks.slice(0, 20).map(c => {
    const link = links.find(l => l.id === c.link_id)
    return { ...c, linkName: link?.name || 'Unknown' }
  })

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logo">
          <span className="logo-icon">✈</span>
          <span className="logo-text">LinkPilot</span>
        </div>
        <nav className="nav">
          <button className={`nav-item ${activeTab === 'links' ? 'active' : ''}`} onClick={() => setActiveTab('links')}>
            <span className="nav-icon">🔗</span> Links
          </button>
          <button className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>
            <span className="nav-icon">📊</span> Analytics
          </button>
        </nav>
        <div className="sidebar-footer">
          <div className="partner-badge">
            <span className="partner-dot"></span>
            LinkPilot v1.0
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="header">
          <div>
            <h1 className="page-title">{activeTab === 'links' ? 'Links' : 'Analytics'}</h1>
            <p className="page-sub">{activeTab === 'links' ? `${links.length} links created` : `${totalClicks} total clicks tracked`}</p>
          </div>
          {activeTab === 'links' && (
            <button className="btn-primary" onClick={() => setShowForm(!showForm)}>
              {showForm ? '✕ Cancel' : '+ New Link'}
            </button>
          )}
        </header>

        {showForm && activeTab === 'links' && (
          <div className="form-card">
            <h3 className="form-title">Create New Link</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Link Name</label>
                <input
                  className="form-input"
                  placeholder="e.g. Booking Barcelona"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="form-group form-group-wide">
                <label className="form-label">Destination URL</label>
                <input
                  className="form-input"
                  placeholder="https://www.booking.com/...?aid=YOUR_ID"
                  value={form.destination_url}
                  onChange={e => setForm({ ...form, destination_url: e.target.value })}
                />
              </div>
            </div>
            {error && <div className="form-error">{error}</div>}
            <div className="form-hint">Paste any affiliate URL — Booking, GetYourGuide, Uber, Expedia and more.</div>
            <button className="btn-primary" onClick={createLink} disabled={creating}>
              {creating ? 'Creating...' : 'Create Link'}
            </button>
          </div>
        )}

        {activeTab === 'links' && (
          <div className="content">
            {loading ? (
              <div className="empty-state">Loading...</div>
            ) : links.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔗</div>
                <p>No links yet. Create your first one.</p>
              </div>
            ) : (
              <div className="links-table">
                <div className="table-header">
                  <span>Name</span>
                  <span>Short Link</span>
                  <span>Destination</span>
                  <span>Clicks</span>
                  <span>Created</span>
                  <span></span>
                </div>
                {links.map(link => (
                  <div key={link.id} className="table-row">
                    <span className="link-name">{link.name}</span>
                    <span className="link-slug">
                      <code>{BASE_URL}/r/{link.slug}</code>
                      <button
                        className={`copy-btn ${copied === link.slug ? 'copied' : ''}`}
                        onClick={() => copyLink(link.slug)}
                      >
                        {copied === link.slug ? '✓ Copied' : 'Copy'}
                      </button>
                    </span>
                    <span className="link-dest" title={link.destination_url}>
                      {link.destination_url.substring(0, 45)}...
                    </span>
                    <span className="link-clicks">{link.click_count || 0}</span>
                    <span className="link-date">
                      {new Date(link.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                    </span>
                    <span>
                      <button className="delete-btn" onClick={() => deleteLink(link.id)}>✕</button>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="content">
            <div className="stats-grid">
              <StatCard label="Total Clicks" value={totalClicks} />
              <StatCard label="App Opens" value={appClicks} sub={`${appRate}% of clicks`} accent="#7C6FFF" />
              <StatCard label="Web Fallback" value={webClicks} sub={`${100 - appRate}% of clicks`} />
              <StatCard label="Active Links" value={links.length} />
            </div>

            <div className="section-title">Device Breakdown</div>
            <div className="stats-grid">
              <StatCard label="Android" value={androidClicks} sub={totalClicks > 0 ? `${Math.round(androidClicks/totalClicks*100)}%` : '—'} accent="#A4C639" />
              <StatCard label="iOS" value={iosClicks} sub={totalClicks > 0 ? `${Math.round(iosClicks/totalClicks*100)}%` : '—'} />
              <StatCard label="Desktop" value={desktopClicks} sub={totalClicks > 0 ? `${Math.round(desktopClicks/totalClicks*100)}%` : '—'} />
            </div>

            <div className="section-title">Clicks per Link</div>
            <div className="links-table">
              <div className="table-header analytics-header">
                <span>Link</span>
                <span>Total</span>
                <span>App</span>
                <span>Web</span>
                <span>App Rate</span>
              </div>
              {links.map(link => {
                const lClicks = clicks.filter(c => c.link_id === link.id)
                const lApp = lClicks.filter(c => c.outcome === 'app').length
                const lWeb = lClicks.filter(c => c.outcome === 'web').length
                const lRate = lClicks.length > 0 ? Math.round(lApp / lClicks.length * 100) : 0
                return (
                  <div key={link.id} className="table-row analytics-row">
                    <span className="link-name">{link.name}</span>
                    <span className="link-clicks">{lClicks.length}</span>
                    <span style={{ color: '#7C6FFF' }}>{lApp}</span>
                    <span>{lWeb}</span>
                    <span>
                      <span className={`rate-badge ${lRate > 50 ? 'rate-good' : ''}`}>{lRate}%</span>
                    </span>
                  </div>
                )
              })}
            </div>

            <div className="section-title">Recent Clicks</div>
            <div className="links-table">
              <div className="table-header recent-header">
                <span>Link</span>
                <span>Device</span>
                <span>Outcome</span>
                <span>Time</span>
              </div>
              {recentClicks.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px' }}>No clicks yet.</div>
              ) : recentClicks.map(click => (
                <div key={click.id} className="table-row recent-row">
                  <span className="link-name">{click.linkName}</span>
                  <span className="device-badge">{click.device}</span>
                  <span>
                    <span className={`outcome-badge ${click.outcome === 'app' ? 'outcome-app' : 'outcome-web'}`}>
                      {click.outcome === 'app' ? '📱 App' : click.outcome === 'web' ? '🌐 Web' : '—'}
                    </span>
                  </span>
                  <span className="link-date">
                    {new Date(click.clicked_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · {new Date(click.clicked_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

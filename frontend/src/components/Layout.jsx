import Sidebar from './Sidebar'

export default function Layout({ children }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#c8c8c8' }}>
      <Sidebar />
      <main style={{ flex: 1, marginLeft: 200, minHeight: '100vh', overflow: 'auto', padding: 20 }}>
        {children}
      </main>
    </div>
  )
}

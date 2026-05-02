import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ChatPanel from './ChatPanel'

export default function Layout() {
  return (
    <div className="h-screen flex bg-[#e8e8ed] overflow-hidden">
      {/* Sidebar */}
      <Sidebar />

      {/* Main scrollable content */}
      <main className="flex-1 overflow-y-auto">
        <Outlet />
      </main>

      {/* AI Chat panel */}
      <ChatPanel />
    </div>
  )
}

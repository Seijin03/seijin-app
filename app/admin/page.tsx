"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, Edit2, Save, X, Users, BarChart3, Target, LogOut } from "lucide-react"

const API_BASE = "https://329eb4d0-5825-4b28-88c7-a169ac1fad0e-00-1rqlr71r5qxn1.worf.replit.dev/flask-api"

type Mission = { id?: number; title: string; platform: string; reward: number; link: string; active: boolean }
type Bar = { id?: number; title: string; current_value: number; max_value: number }
type User = { celo_address: string; mini_sjn_balance: number; created_at: string }

export default function AdminPanel() {
  const [tab, setTab] = useState<"missions" | "bars" | "users">("missions")
  const [missions, setMissions] = useState<Mission[]>([])
  const [bars, setBars] = useState<Bar[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [jwt, setJwt] = useState("")
  const [authorized, setAuthorized] = useState(false)
  const [loading, setLoading] = useState(true)

  // Mission form
  const [missionForm, setMissionForm] = useState<Mission>({ title: "", platform: "telegram", reward: 50, link: "", active: true })
  const [editingMission, setEditingMission] = useState<number | null>(null)

  // Bar form
  const [barForm, setBarForm] = useState<Bar>({ title: "", current_value: 0, max_value: 100 })
  const [editingBar, setEditingBar] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("hexgate_jwt")
    if (!token) { window.location.href = "/"; return }

    try {
      const payload = JSON.parse(atob(token.split(".")[1]))
      if (!payload.is_admin) { window.location.href = "/hub"; return }
      setJwt(token)
      setAuthorized(true)
    } catch {
      window.location.href = "/"
      return
    }

    loadAll(token)
  }, [])

  const loadAll = async (token: string) => {
    const headers = { "Authorization": `Bearer ${token}` }
    try {
      const [m, b, u] = await Promise.all([
        fetch(`${API_BASE}/admin/missions`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/admin/bars`, { headers }).then(r => r.json()),
        fetch(`${API_BASE}/admin/users`, { headers }).then(r => r.json()),
      ])
      if (Array.isArray(m)) setMissions(m)
      if (Array.isArray(b)) setBars(b)
      if (Array.isArray(u)) setUsers(u)
    } catch {}
    setLoading(false)
  }

  const saveMission = async () => {
    const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${jwt}` }
    if (editingMission !== null) {
      await fetch(`${API_BASE}/admin/missions/${editingMission}`, { method: "PUT", headers, body: JSON.stringify(missionForm) })
      setEditingMission(null)
    } else {
      await fetch(`${API_BASE}/admin/missions`, { method: "POST", headers, body: JSON.stringify(missionForm) })
    }
    setMissionForm({ title: "", platform: "telegram", reward: 50, link: "", active: true })
    loadAll(jwt)
  }

  const deleteMission = async (id: number) => {
    await fetch(`${API_BASE}/admin/missions/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${jwt}` } })
    loadAll(jwt)
  }

  const saveBar = async () => {
    const headers = { "Content-Type": "application/json", "Authorization": `Bearer ${jwt}` }
    if (editingBar !== null) {
      await fetch(`${API_BASE}/admin/bars/${editingBar}`, { method: "PUT", headers, body: JSON.stringify(barForm) })
      setEditingBar(null)
    } else {
      await fetch(`${API_BASE}/admin/bars`, { method: "POST", headers, body: JSON.stringify(barForm) })
    }
    setBarForm({ title: "", current_value: 0, max_value: 100 })
    loadAll(jwt)
  }

  const deleteBar = async (id: number) => {
    await fetch(`${API_BASE}/admin/bars/${id}`, { method: "DELETE", headers: { "Authorization": `Bearer ${jwt}` } })
    loadAll(jwt)
  }

  if (!authorized) return null

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#e2e2e8]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a3a]">
        <div className="flex items-center gap-3">
          <span className="text-lg font-bold tracking-wider">SEIJIN ADMIN</span>
          <span className="px-2 py-0.5 rounded bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] text-xs">Admin Only</span>
        </div>
        <div className="flex items-center gap-3">
          <a href="/hub" className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#1a1a25] border border-[#2a2a3a] text-sm hover:border-[#3a3a4a] transition-colors">
            <LogOut className="w-4 h-4" /> Back to Hub
          </a>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Tabs */}
        <div className="flex gap-3 mb-8">
          {[
            { id: "missions", label: "Missions", icon: Target },
            { id: "bars", label: "Progress Bars", icon: BarChart3 },
            { id: "users", label: "Users", icon: Users },
          ].map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id as typeof tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border font-medium text-sm transition-all
                ${tab === id ? "bg-[#3b82f6]/20 border-[#3b82f6] text-[#3b82f6]" : "border-[#2a2a3a] text-[#6b6b7a] hover:border-[#3a3a4a]"}`}>
              <Icon className="w-4 h-4" />{label}
            </button>
          ))}
        </div>

        {loading && <div className="text-center text-[#6b6b7a] py-12">Loading...</div>}

        {/* MISSIONS TAB */}
        {!loading && tab === "missions" && (
          <div className="space-y-6">
            {/* Add/Edit Form */}
            <div className="p-6 rounded-xl bg-[#12121a] border border-[#2a2a3a]">
              <h2 className="text-lg font-semibold mb-4">{editingMission !== null ? "Edit Mission" : "Add New Mission"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-[#6b6b7a] mb-1 block">Title</label>
                  <input value={missionForm.title} onChange={e => setMissionForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Subscribe on YouTube"
                    className="w-full bg-[#1a1a25] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
                </div>
                <div>
                  <label className="text-xs text-[#6b6b7a] mb-1 block">Platform</label>
                  <select value={missionForm.platform} onChange={e => setMissionForm(p => ({ ...p, platform: e.target.value }))}
                    className="w-full bg-[#1a1a25] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]">
                    <option value="youtube">YouTube</option>
                    <option value="telegram">Telegram</option>
                    <option value="twitter">Twitter/X</option>
                    <option value="referral">Referral</option>
                    <option value="share">Share</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-[#6b6b7a] mb-1 block">Reward (Mini-SJN)</label>
                  <input type="number" value={missionForm.reward} onChange={e => setMissionForm(p => ({ ...p, reward: Number(e.target.value) }))}
                    className="w-full bg-[#1a1a25] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
                </div>
                <div>
                  <label className="text-xs text-[#6b6b7a] mb-1 block">Link (optional)</label>
                  <input value={missionForm.link} onChange={e => setMissionForm(p => ({ ...p, link: e.target.value }))}
                    placeholder="https://..."
                    className="w-full bg-[#1a1a25] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
                </div>
              </div>
              <div className="flex items-center gap-3 mt-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={missionForm.active} onChange={e => setMissionForm(p => ({ ...p, active: e.target.checked }))}
                    className="w-4 h-4" />
                  Active (visible to users)
                </label>
                <div className="ml-auto flex gap-2">
                  {editingMission !== null && (
                    <button onClick={() => { setEditingMission(null); setMissionForm({ title: "", platform: "telegram", reward: 50, link: "", active: true }) }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a2a3a] text-sm hover:bg-[#3a3a4a]">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  )}
                  <button onClick={saveMission}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4a520] text-[#0a0a0f] font-semibold text-sm hover:bg-[#e5b62c]">
                    <Save className="w-4 h-4" /> {editingMission !== null ? "Save Changes" : "Add Mission"}
                  </button>
                </div>
              </div>
            </div>

            {/* Mission List */}
            <div className="space-y-3">
              {missions.length === 0 ? (
                <div className="text-center text-[#6b6b7a] py-8">No missions yet. Add one above.</div>
              ) : missions.map(mission => (
                <div key={mission.id} className="flex items-center justify-between p-4 rounded-xl bg-[#12121a] border border-[#2a2a3a]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{mission.title}</span>
                      {!mission.active && <span className="text-xs text-[#6b6b7a] bg-[#2a2a3a] px-2 py-0.5 rounded">Hidden</span>}
                    </div>
                    <div className="text-sm text-[#6b6b7a] mt-0.5">{mission.platform} • +{mission.reward} Mini-SJN</div>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingMission(mission.id!); setMissionForm(mission) }}
                      className="p-2 rounded-lg bg-[#1a1a25] border border-[#2a2a3a] hover:border-[#3b82f6] transition-colors">
                      <Edit2 className="w-4 h-4 text-[#3b82f6]" />
                    </button>
                    <button onClick={() => deleteMission(mission.id!)}
                      className="p-2 rounded-lg bg-[#1a1a25] border border-[#2a2a3a] hover:border-[#ef4444] transition-colors">
                      <Trash2 className="w-4 h-4 text-[#ef4444]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PROGRESS BARS TAB */}
        {!loading && tab === "bars" && (
          <div className="space-y-6">
            <div className="p-6 rounded-xl bg-[#12121a] border border-[#2a2a3a]">
              <h2 className="text-lg font-semibold mb-4">{editingBar !== null ? "Edit Bar" : "Add Progress Bar"}</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <label className="text-xs text-[#6b6b7a] mb-1 block">Title</label>
                  <input value={barForm.title} onChange={e => setBarForm(p => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. YouTube Subscribers"
                    className="w-full bg-[#1a1a25] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
                </div>
                <div>
                  <label className="text-xs text-[#6b6b7a] mb-1 block">Current Value</label>
                  <input type="number" value={barForm.current_value} onChange={e => setBarForm(p => ({ ...p, current_value: Number(e.target.value) }))}
                    className="w-full bg-[#1a1a25] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
                </div>
                <div>
                  <label className="text-xs text-[#6b6b7a] mb-1 block">Max Value</label>
                  <input type="number" value={barForm.max_value} onChange={e => setBarForm(p => ({ ...p, max_value: Number(e.target.value) }))}
                    className="w-full bg-[#1a1a25] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm outline-none focus:border-[#3b82f6]" />
                </div>
              </div>
              {barForm.title && (
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-[#6b6b7a] mb-1">
                    <span>{barForm.title}</span>
                    <span>{barForm.current_value} / {barForm.max_value}</span>
                  </div>
                  <div className="h-2 bg-[#1a1a25] rounded-full overflow-hidden border border-[#2a2a3a]">
                    <div className="h-full bg-gradient-to-r from-[#d4a520] to-[#f5c542] rounded-full"
                      style={{ width: `${Math.min((barForm.current_value / barForm.max_value) * 100, 100)}%` }} />
                  </div>
                </div>
              )}
              <div className="flex justify-end gap-2 mt-4">
                {editingBar !== null && (
                  <button onClick={() => { setEditingBar(null); setBarForm({ title: "", current_value: 0, max_value: 100 }) }}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#2a2a3a] text-sm">
                    <X className="w-4 h-4" /> Cancel
                  </button>
                )}
                <button onClick={saveBar}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#d4a520] text-[#0a0a0f] font-semibold text-sm hover:bg-[#e5b62c]">
                  <Save className="w-4 h-4" /> {editingBar !== null ? "Save Changes" : "Add Bar"}
                </button>
              </div>
            </div>

            <div className="space-y-3">
              {bars.length === 0 ? (
                <div className="text-center text-[#6b6b7a] py-8">No progress bars yet.</div>
              ) : bars.map(bar => (
                <div key={bar.id} className="p-4 rounded-xl bg-[#12121a] border border-[#2a2a3a]">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium">{bar.title}</span>
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingBar(bar.id!); setBarForm(bar) }}
                        className="p-2 rounded-lg bg-[#1a1a25] border border-[#2a2a3a] hover:border-[#3b82f6]">
                        <Edit2 className="w-4 h-4 text-[#3b82f6]" />
                      </button>
                      <button onClick={() => deleteBar(bar.id!)}
                        className="p-2 rounded-lg bg-[#1a1a25] border border-[#2a2a3a] hover:border-[#ef4444]">
                        <Trash2 className="w-4 h-4 text-[#ef4444]" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-xs text-[#6b6b7a] mb-1">
                    <span>{bar.current_value.toLocaleString()} / {bar.max_value.toLocaleString()}</span>
                    <span>{Math.round((bar.current_value / bar.max_value) * 100)}%</span>
                  </div>
                  <div className="h-2 bg-[#1a1a25] rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#d4a520] to-[#f5c542] rounded-full"
                      style={{ width: `${Math.min((bar.current_value / bar.max_value) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* USERS TAB */}
        {!loading && tab === "users" && (
          <div className="rounded-xl bg-[#12121a] border border-[#2a2a3a] overflow-hidden">
            <div className="p-4 border-b border-[#2a2a3a] flex items-center justify-between">
              <h2 className="font-semibold">Registered Users ({users.length})</h2>
              <span className="text-xs text-[#6b6b7a]">Total Mini-SJN distributed: {users.reduce((a, u) => a + u.mini_sjn_balance, 0).toLocaleString()}</span>
            </div>
            {users.length === 0 ? (
              <div className="text-center text-[#6b6b7a] py-12">No users registered yet.</div>
            ) : (
              <div className="divide-y divide-[#2a2a3a]">
                {users.map((user, i) => (
                  <div key={user.celo_address} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-[#6b6b7a] w-6">{i + 1}</span>
                      <span className="font-mono text-sm">{user.celo_address.slice(0, 8)}...{user.celo_address.slice(-6)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <img src="https://i.imgur.com/FggnA4C.png" alt="" className="w-4 h-4" />
                      <span className="text-[#d4a520] font-semibold text-sm">{user.mini_sjn_balance.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  )
}

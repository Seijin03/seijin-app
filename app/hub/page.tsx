"use client"

import { useState, useEffect } from "react"
import { Lock, Youtube, MessageCircle, Users, Share2, Bell, ExternalLink } from "lucide-react"

const MINI_SJN_ICON = "https://i.imgur.com/FggnA4C.png"
const SJN_COIN = "https://i.imgur.com/NoeK2tc.png"
const API_BASE = "https://329eb4d0-5825-4b28-88c7-a169ac1fad0e-00-1rqlr71r5qxn1.worf.replit.dev/flask-api"

const PLATFORM_ICONS: Record<string, React.ElementType> = {
  youtube: Youtube,
  telegram: MessageCircle,
  referral: Users,
  share: Share2,
  announcement: Bell,
  default: ExternalLink,
}

type Mission = {
  id: number
  title: string
  platform: string
  reward: number
  link: string | null
  active: boolean
}

type ProgressBar = {
  id: number
  title: string
  current_value: number
  max_value: number
}

type MissionState = "idle" | "done" | "username_input" | "pending"

export default function SeijinHub() {
  const [activeTab, setActiveTab] = useState<"missions" | "events" | "leaderboard" | "airdrop" | null>(null)
  const [missionStates, setMissionStates] = useState<Record<number, MissionState>>({})
  const [usernameInputs, setUsernameInputs] = useState<Record<number, string>>({})
  const [miniSjnBalance, setMiniSjnBalance] = useState(0)
  const [walletAddress, setWalletAddress] = useState("")
  const [shortWallet, setShortWallet] = useState("0x????...????")
  const [missions, setMissions] = useState<Mission[]>([])
  const [progressBars, setProgressBars] = useState<ProgressBar[]>([])
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    const jwt = localStorage.getItem("hexgate_jwt")
    if (!jwt) { window.location.href = "/"; return }

    try {
      const payload = JSON.parse(atob(jwt.split(".")[1]))
      if (payload.celo_address) {
        const addr = payload.celo_address
        setWalletAddress(addr)
        setShortWallet(addr.slice(0, 6) + "..." + addr.slice(-4))
        if (payload.is_admin) setIsAdmin(true)

        fetch(`${API_BASE}/user/balance?celo_address=${addr}`)
          .then(r => r.json())
          .then(data => {
            if (data.balance !== undefined) setMiniSjnBalance(data.balance)
            if (data.completed_missions) {
              const states: Record<number, MissionState> = {}
              data.completed_missions.forEach((id: number) => { states[id] = "pending" })
              setMissionStates(states)
            }
          }).catch(() => {})
      }
    } catch {}

    fetch(`${API_BASE}/admin/missions`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMissions(data.filter((m: Mission) => m.active)) })
      .catch(() => {})

    fetch(`${API_BASE}/admin/bars`)
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setProgressBars(data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleStart = (mission: Mission) => {
    if (mission.link) window.open(mission.link, "_blank")
    setMissionStates(prev => ({ ...prev, [mission.id]: "done" }))
  }

  const handleDone = (mission: Mission) => {
    if (mission.platform === "youtube") {
      setMissionStates(prev => ({ ...prev, [mission.id]: "username_input" }))
    } else {
      submitMission(mission)
    }
  }

  const submitMission = async (mission: Mission) => {
    const jwt = localStorage.getItem("hexgate_jwt")
    try {
      const res = await fetch(`${API_BASE}/missions/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jwt}` },
        body: JSON.stringify({ celo_address: walletAddress, mission_id: mission.id, reward: mission.reward }),
      })
      const data = await res.json()
      if (res.ok && data.balance !== undefined) setMiniSjnBalance(data.balance)
    } catch {}
    setMissionStates(prev => ({ ...prev, [mission.id]: "pending" }))
  }

  const handleUsernameSubmit = async (mission: Mission) => {
    const username = usernameInputs[mission.id]
    if (!username?.trim()) return
    const jwt = localStorage.getItem("hexgate_jwt")
    try {
      await fetch(`${API_BASE}/missions/youtube/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${jwt}` },
        body: JSON.stringify({ celo_address: walletAddress, youtube_username: username }),
      })
    } catch {}
    setMissionStates(prev => ({ ...prev, [mission.id]: "pending" }))
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a3a]">
        <div className="text-lg font-bold tracking-wider text-[#e2e2e8]">SEIJIN ECOSYSTEM</div>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <a href="/admin" className="px-3 py-1.5 rounded-full bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] text-xs font-semibold">
              Admin Panel
            </a>
          )}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a25] border border-[#d4a520]/30">
            <img src={MINI_SJN_ICON} alt="Mini-SJN" className="w-5 h-5" />
            <span className="text-[#d4a520] font-semibold text-sm">{miniSjnBalance.toLocaleString()}</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-[#1a1a25] border border-[#2a2a3a] text-[#e2e2e8] text-sm font-mono">{shortWallet}</div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="flex flex-col items-center text-center mb-12">
          <div className="relative mb-6">
            <div className="absolute inset-0 blur-3xl bg-[#3b82f6]/30 rounded-full animate-pulse" />
            <img src={SJN_COIN} alt="$SJN" className="relative w-[200px] h-[200px] object-contain animate-float drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]" />
          </div>
          <h1 className="text-5xl font-bold text-[#3b82f6] mb-2">10,000 $SJN</h1>
          <p className="text-[#6b6b7a] text-lg mb-6">Maximum Supply — Ever</p>

          <div className="w-full max-w-md space-y-3">
            <div>
              <div className="flex justify-between text-sm text-[#6b6b7a] mb-2">
                <span>Airdrop Allocation</span>
                <span>0 / 4,000 Airdrop Slots</span>
              </div>
              <div className="h-3 bg-[#1a1a25] rounded-full overflow-hidden border border-[#2a2a3a]">
                <div className="h-full bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] rounded-full" style={{ width: "0%" }} />
              </div>
            </div>

            {progressBars.map(bar => (
              <div key={bar.id}>
                <div className="flex justify-between text-sm text-[#6b6b7a] mb-1">
                  <span>{bar.title}</span>
                  <span>{bar.current_value.toLocaleString()} / {bar.max_value.toLocaleString()}</span>
                </div>
                <div className="h-3 bg-[#1a1a25] rounded-full overflow-hidden border border-[#2a2a3a]">
                  <div className="h-full bg-gradient-to-r from-[#d4a520] to-[#f5c542] rounded-full transition-all duration-500"
                    style={{ width: `${Math.min((bar.current_value / bar.max_value) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>

          <div className="w-full max-w-md mt-6 p-4 rounded-xl bg-[#12121a] border border-[#2a2a3a] text-sm space-y-2.5">
            {[
              { dot: "#ef4444", label: "4,000 — Liquidity", status: "Locked Forever" },
              { dot: "#ef4444", label: "1,000 — Founder", status: "Locked" },
              { dot: "#eab308", label: "1,000 — Giveaways", status: "Coming Soon" },
              { dot: "#22c55e", label: "4,000 — Airdrop", status: "Earn via Mini-SJN" },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.dot }} />
                <span className="text-[#e2e2e8]">{row.label}</span>
                <span className="text-[#6b6b7a] ml-auto">{row.status}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center gap-3 mb-8 flex-wrap">
          {(["missions", "events"] as const).map((tab) => (
            <button key={tab} onClick={() => setActiveTab(activeTab === tab ? null : tab)}
              className={`px-4 py-2 rounded-lg border font-medium text-sm transition-all
                ${tab === "missions" ? "border-[#d4a520]/30 text-[#d4a520] hover:bg-[#d4a520]/10" : "border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6]/10"}
                ${activeTab === tab ? (tab === "missions" ? "bg-[#d4a520]/20 border-[#d4a520]" : "bg-[#3b82f6]/20 border-[#3b82f6]") : "bg-transparent"}`}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          {(["leaderboard", "airdrop"] as const).map((tab) => (
            <button key={tab} disabled className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#6b6b7a]/30 text-[#6b6b7a] text-sm cursor-not-allowed opacity-60">
              <Lock className="w-3.5 h-3.5" />{tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === "missions" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {loading ? (
              <div className="col-span-2 text-center text-[#6b6b7a] py-12">Loading missions...</div>
            ) : missions.length === 0 ? (
              <div className="col-span-2 text-center text-[#6b6b7a] py-12">No missions yet. Check back soon.</div>
            ) : missions.map((mission) => {
              const state = missionStates[mission.id] || "idle"
              const Icon = PLATFORM_ICONS[mission.platform] || PLATFORM_ICONS.default
              return (
                <div key={mission.id} className="p-4 rounded-xl bg-[#12121a] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1a1a25] border border-[#2a2a3a] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#3b82f6]" />
                      </div>
                      <div>
                        <h3 className="text-[#e2e2e8] font-medium text-sm">{mission.title}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <img src={MINI_SJN_ICON} alt="Mini-SJN" className="w-4 h-4" />
                          <span className="text-[#d4a520] text-xs font-semibold">+{mission.reward} Mini-SJN</span>
                        </div>
                      </div>
                    </div>
                    {state === "idle" && <button onClick={() => handleStart(mission)} className="px-4 py-2 rounded-lg bg-[#d4a520] text-[#0a0a0f] font-semibold text-sm hover:bg-[#e5b62c] transition-colors">Start</button>}
                    {state === "done" && <button onClick={() => handleDone(mission)} className="px-4 py-2 rounded-lg bg-[#22c55e] text-white font-semibold text-sm hover:bg-[#16a34a] transition-colors">✓ Done</button>}
                    {state === "pending" && <span className="text-xs text-[#eab308] bg-[#eab308]/10 border border-[#eab308]/30 px-2 py-1 rounded-full">⏳ Pending</span>}
                  </div>
                  {state === "username_input" && (
                    <div className="flex gap-2 mt-2">
                      <input type="text" placeholder="Your YouTube @username"
                        value={usernameInputs[mission.id] || ""}
                        onChange={(e) => setUsernameInputs(prev => ({ ...prev, [mission.id]: e.target.value }))}
                        className="flex-1 bg-[#1a1a25] border border-[#2a2a3a] text-[#e2e2e8] text-sm rounded-lg px-3 py-2 outline-none focus:border-[#3b82f6]" />
                      <button onClick={() => handleUsernameSubmit(mission)} className="px-3 py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold hover:bg-[#2563eb]">Submit</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === "events" && (
          <div className="flex flex-col items-center justify-center py-16 px-6 rounded-xl bg-[#12121a] border border-[#2a2a3a]">
            <span className="text-3xl mb-4">📅</span>
            <h3 className="text-xl font-semibold text-[#e2e2e8] mb-2">Events Coming Soon</h3>
            <p className="text-[#6b6b7a] text-center max-w-md">Stay tuned for exclusive community events and reward opportunities.</p>
          </div>
        )}
      </div>

      <style jsx global>{`
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
    </main>
  )
}

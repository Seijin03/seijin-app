"use client"

import { useState, useEffect } from "react"
import { Lock, Youtube, MessageCircle, Users, Share2, Bell } from "lucide-react"

const MINI_SJN_ICON = "https://i.imgur.com/FggnA4C.png"
const SJN_COIN = "https://i.imgur.com/NoeK2tc.png"
const API_BASE = "https://329eb4d0-5825-4b28-88c7-a169ac1fad0e-00-1rqlr71r5qxn1.worf.replit.dev/flask-api"

const missions = [
  {
    id: 1,
    name: "Subscribe on YouTube",
    platform: "youtube",
    reward: 100,
    icon: Youtube,
    link: "https://www.youtube.com/channel/UC6bdXFFDE_HgOFqrDqWZ8UA",
    requiresUsername: true,
    usernamePlaceholder: "Your YouTube @username",
  },
  {
    id: 2,
    name: "Join Seijin Global Chat",
    platform: "telegram",
    reward: 75,
    icon: MessageCircle,
    link: "https://t.me/SeijinGC",
    requiresUsername: false,
  },
  {
    id: 3,
    name: "Follow Announcements",
    platform: "telegram",
    reward: 50,
    icon: Bell,
    link: "https://t.me/ProjectSeijin",
    requiresUsername: false,
  },
  {
    id: 4,
    name: "Share Launch Post",
    platform: "share",
    reward: 100,
    icon: Share2,
    link: "https://t.me/ProjectSeijin",
    requiresUsername: false,
  },
  {
    id: 5,
    name: "Invite 3 Friends",
    platform: "referral",
    reward: 150,
    icon: Users,
    link: null,
    requiresUsername: false,
  },
]

type MissionState = "idle" | "done" | "username_input" | "pending"

export default function SeijinHub() {
  const [activeTab, setActiveTab] = useState<"missions" | "events" | "leaderboard" | "airdrop" | null>(null)
  const [missionStates, setMissionStates] = useState<Record<number, MissionState>>({})
  const [usernameInputs, setUsernameInputs] = useState<Record<number, string>>({})
  const [miniSjnBalance, setMiniSjnBalance] = useState(0)
  const [walletAddress, setWalletAddress] = useState("0x????...????")

  useEffect(() => {
    // Get wallet from JWT stored by HexGate
    const jwt = localStorage.getItem("hexgate_jwt")
    if (jwt) {
      try {
        const payload = JSON.parse(atob(jwt.split(".")[1]))
        if (payload.celo_address) {
          const addr = payload.celo_address
          setWalletAddress(addr.slice(0, 6) + "..." + addr.slice(-4))
        }
      } catch {}
    }
  }, [])

  const handleStart = (mission: typeof missions[0]) => {
    if (mission.link) window.open(mission.link, "_blank")
    setMissionStates(prev => ({ ...prev, [mission.id]: "done" }))
  }

  const handleDone = (mission: typeof missions[0]) => {
    if (mission.requiresUsername) {
      setMissionStates(prev => ({ ...prev, [mission.id]: "username_input" }))
    } else {
      setMiniSjnBalance(prev => prev + mission.reward)
      setMissionStates(prev => ({ ...prev, [mission.id]: "pending" }))
    }
  }

  const handleUsernameSubmit = async (mission: typeof missions[0]) => {
    const username = usernameInputs[mission.id]
    if (!username?.trim()) return

    try {
      await fetch(`${API_BASE}/missions/youtube/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          celo_address: walletAddress,
          youtube_username: username,
        }),
      })
    } catch {}

    setMissionStates(prev => ({ ...prev, [mission.id]: "pending" }))
  }

  return (
    <main className="min-h-screen bg-[#0a0a0f]">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a3a]">
        <div className="text-lg font-bold tracking-wider text-[#e2e2e8]">SEIJIN ECOSYSTEM</div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#1a1a25] border border-[#d4a520]/30">
            <img src={MINI_SJN_ICON} alt="Mini-SJN" className="w-5 h-5" />
            <span className="text-[#d4a520] font-semibold text-sm">{miniSjnBalance.toLocaleString()}</span>
          </div>
          <div className="px-3 py-1.5 rounded-full bg-[#1a1a25] border border-[#2a2a3a] text-[#e2e2e8] text-sm font-mono">
            {walletAddress}
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-12">
          <div className="relative mb-6">
            <div className="absolute inset-0 blur-3xl bg-[#3b82f6]/30 rounded-full animate-pulse" />
            <img src={SJN_COIN} alt="$SJN" className="relative w-[200px] h-[200px] object-contain animate-float drop-shadow-[0_0_30px_rgba(59,130,246,0.5)]" />
          </div>
          <h1 className="text-5xl font-bold text-[#3b82f6] mb-2">10,000 $SJN</h1>
          <p className="text-[#6b6b7a] text-lg mb-6">Maximum Supply — Ever</p>
          <div className="w-full max-w-md">
            <div className="flex justify-between text-sm text-[#6b6b7a] mb-2">
              <span>Airdrop Allocation</span>
              <span>0 / 4,000 Airdrop Slots</span>
            </div>
            <div className="h-3 bg-[#1a1a25] rounded-full overflow-hidden border border-[#2a2a3a]">
              <div className="h-full bg-gradient-to-r from-[#3b82f6] to-[#60a5fa] rounded-full" style={{ width: "0%" }} />
            </div>
          </div>
          {/* Breakdown */}
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

        {/* Tabs */}
        <div className="flex justify-center gap-3 mb-8 flex-wrap">
          {(["missions", "events"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(activeTab === tab ? null : tab)}
              className={`px-4 py-2 rounded-lg border font-medium text-sm transition-all capitalize
                ${tab === "missions" ? "border-[#d4a520]/30 text-[#d4a520] hover:bg-[#d4a520]/10" : "border-[#3b82f6]/30 text-[#3b82f6] hover:bg-[#3b82f6]/10"}
                ${activeTab === tab ? (tab === "missions" ? "bg-[#d4a520]/20 border-[#d4a520]" : "bg-[#3b82f6]/20 border-[#3b82f6]") : "bg-transparent"}
              `}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
          {(["leaderboard", "airdrop"] as const).map((tab) => (
            <button key={tab} disabled className="flex items-center gap-2 px-4 py-2 rounded-lg border border-[#6b6b7a]/30 text-[#6b6b7a] text-sm cursor-not-allowed opacity-60 capitalize">
              <Lock className="w-3.5 h-3.5" />{tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Missions */}
        {activeTab === "missions" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {missions.map((mission) => {
              const state = missionStates[mission.id] || "idle"
              const Icon = mission.icon
              return (
                <div key={mission.id} className="p-4 rounded-xl bg-[#12121a] border border-[#2a2a3a] hover:border-[#3a3a4a] transition-all">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[#1a1a25] border border-[#2a2a3a] flex items-center justify-center">
                        <Icon className="w-5 h-5 text-[#3b82f6]" />
                      </div>
                      <div>
                        <h3 className="text-[#e2e2e8] font-medium text-sm">{mission.name}</h3>
                        <div className="flex items-center gap-1 mt-0.5">
                          <img src={MINI_SJN_ICON} alt="Mini-SJN" className="w-4 h-4" />
                          <span className="text-[#d4a520] text-xs font-semibold">+{mission.reward} Mini-SJN</span>
                        </div>
                      </div>
                    </div>
                    {state === "idle" && (
                      <button onClick={() => handleStart(mission)} className="px-4 py-2 rounded-lg bg-[#d4a520] text-[#0a0a0f] font-semibold text-sm hover:bg-[#e5b62c] transition-colors">
                        Start
                      </button>
                    )}
                    {state === "done" && (
                      <button onClick={() => handleDone(mission)} className="px-4 py-2 rounded-lg bg-[#22c55e] text-white font-semibold text-sm hover:bg-[#16a34a] transition-colors">
                        ✓ Done
                      </button>
                    )}
                    {(state === "username_input") && (
                      <span className="text-[#6b6b7a] text-xs">See below</span>
                    )}
                    {state === "pending" && (
                      <span className="text-xs text-[#eab308] bg-[#eab308]/10 border border-[#eab308]/30 px-2 py-1 rounded-full">⏳ Pending</span>
                    )}
                  </div>
                  {state === "username_input" && (
                    <div className="flex gap-2 mt-2">
                      <input
                        type="text"
                        placeholder={mission.usernamePlaceholder}
                        value={usernameInputs[mission.id] || ""}
                        onChange={(e) => setUsernameInputs(prev => ({ ...prev, [mission.id]: e.target.value }))}
                        className="flex-1 bg-[#1a1a25] border border-[#2a2a3a] text-[#e2e2e8] text-sm rounded-lg px-3 py-2 outline-none focus:border-[#3b82f6]"
                      />
                      <button onClick={() => handleUsernameSubmit(mission)} className="px-3 py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-semibold hover:bg-[#2563eb] transition-colors">
                        Submit
                      </button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {activeTab === "events" && (
          <div className="flex flex-col items-center justify-center py-16 px-6 rounded-xl bg-[#12121a] border border-[#2a2a3a]">
            <div className="w-16 h-16 rounded-full bg-[#3b82f6]/10 border border-[#3b82f6]/30 flex items-center justify-center mb-4">
              <span className="text-3xl">📅</span>
            </div>
            <h3 className="text-xl font-semibold text-[#e2e2e8] mb-2">Events Coming Soon</h3>
            <p className="text-[#6b6b7a] text-center max-w-md">Stay tuned for exclusive community events, competitions, and reward opportunities.</p>
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

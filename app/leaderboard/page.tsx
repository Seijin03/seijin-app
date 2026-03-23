"use client"

import { useState, useEffect } from "react"

const MINI_SJN_ICON = "https://i.imgur.com/FggnA4C.png"
const API_BASE = "https://329eb4d0-5825-4b28-88c7-a169ac1fad0e-00-1rqlr71r5qxn1.worf.replit.dev/flask-api"

type User = { celo_address: string; mini_sjn_balance: number }

const MEDALS = ["🥇", "🥈", "🥉"]

export default function Leaderboard() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [myAddress, setMyAddress] = useState("")
  const [myRank, setMyRank] = useState<number | null>(null)

  useEffect(() => {
    const jwt = localStorage.getItem("hexgate_jwt")
    if (!jwt) { window.location.href = "/"; return }

    try {
      const payload = JSON.parse(atob(jwt.split(".")[1]))
      if (payload.celo_address) setMyAddress(payload.celo_address)
    } catch {}

    fetch(`${API_BASE}/leaderboard`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) {
          setUsers(data)
          const rank = data.findIndex((u: User) => u.celo_address === myAddress)
          if (rank !== -1) setMyRank(rank + 1)
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [myAddress])

  return (
    <main className="min-h-screen bg-[#0a0a0f] text-[#e2e2e8]">
      <nav className="flex items-center justify-between px-6 py-4 border-b border-[#2a2a3a]">
        <div className="text-lg font-bold tracking-wider">SEIJIN ECOSYSTEM</div>
        <a href="/hub" className="px-3 py-1.5 rounded-lg bg-[#1a1a25] border border-[#2a2a3a] text-sm hover:border-[#3a3a4a] transition-colors">
          ← Hub
        </a>
      </nav>

      <div className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-[#d4a520] mb-2">Leaderboard</h1>
          <p className="text-[#6b6b7a]">Top Mini-SJN earners — updated live</p>
          {myRank && (
            <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#d4a520]/10 border border-[#d4a520]/30">
              <img src={MINI_SJN_ICON} alt="" className="w-4 h-4" />
              <span className="text-[#d4a520] text-sm font-semibold">Your rank: #{myRank}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-center text-[#6b6b7a] py-12">Loading leaderboard...</div>
        ) : users.length === 0 ? (
          <div className="text-center text-[#6b6b7a] py-12">No users yet. Be the first to earn Mini-SJN.</div>
        ) : (
          <div className="space-y-3">
            {users.map((user, i) => {
              const isMe = user.celo_address === myAddress
              return (
                <div key={user.celo_address}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition-all
                    ${isMe ? "bg-[#d4a520]/10 border-[#d4a520]/40" : "bg-[#12121a] border-[#2a2a3a]"}
                    ${i === 0 ? "border-[#f5c542]/50" : ""}
                  `}>
                  {/* Rank */}
                  <div className="w-8 text-center">
                    {i < 3 ? (
                      <span className="text-2xl">{MEDALS[i]}</span>
                    ) : (
                      <span className="text-[#6b6b7a] font-mono text-sm">#{i + 1}</span>
                    )}
                  </div>

                  {/* Address */}
                  <div className="flex-1">
                    <span className={`font-mono text-sm ${isMe ? "text-[#d4a520]" : "text-[#e2e2e8]"}`}>
                      {user.celo_address.slice(0, 6)}...{user.celo_address.slice(-4)}
                    </span>
                    {isMe && <span className="ml-2 text-xs text-[#d4a520] bg-[#d4a520]/10 px-2 py-0.5 rounded-full">You</span>}
                  </div>

                  {/* Balance */}
                  <div className="flex items-center gap-2">
                    <img src={MINI_SJN_ICON} alt="" className="w-5 h-5" />
                    <span className={`font-bold ${i === 0 ? "text-[#f5c542]" : "text-[#d4a520]"}`}>
                      {user.mini_sjn_balance.toLocaleString()}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </main>
  )
}

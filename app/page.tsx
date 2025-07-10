'use client'

import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500 flex items-center justify-center p-4">
      <button
        className="flex items-center cursor-pointer"
        onClick={() => router.push('/uno')}
      >
        <div className="bg-black text-yellow-400 px-4 py-2 rounded-lg font-bold text-4xl border-2 border-yellow-400 shadow-lg shadow-yellow-400/50 hover:shadow-yellow-400/70 transition-shadow duration-300">
          Play UNO
        </div>
      </button>
    </div>
  )
}

'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Users, Gamepad2 } from 'lucide-react'

export default function CreateGamePage() {
  const router = useRouter()
  const [roomId, setRoomId] = useState('')
  const [playerName, setPlayerName] = useState('')

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const id = roomId.trim()
    const name = playerName.trim()
    if (!id || !name) return
    // Push to /uno/[roomId] with name as query
    router.push(
      `/uno/${encodeURIComponent(id)}?name=${encodeURIComponent(name)}`
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="border-4 border-white shadow-2xl bg-white/95 backdrop-blur">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-blue-500 rounded-full flex items-center justify-center">
              <Gamepad2 className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent">
              Create UNO Game
            </CardTitle>
            <CardDescription className="text-lg text-gray-600">
              Ready to play? Create a room and invite your friends
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <form onSubmit={onSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label
                  htmlFor="room"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  Game Room ID
                </Label>
                <Input
                  id="room"
                  type="text"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  placeholder="e.g. game-room-1"
                  className="h-12 text-lg border-2 border-gray-200 focus:border-blue-500 transition-colors"
                  required
                  suppressHydrationWarning
                />
              </div>
              <div className="space-y-2">
                <Label
                  htmlFor="name"
                  className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                >
                  <Gamepad2 className="w-4 h-4" />
                  Your Player Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. Alice"
                  className="h-12 text-lg border-2 border-gray-200 focus:border-red-500 transition-colors"
                  required
                  suppressHydrationWarning
                />
              </div>
              <Button
                type="submit"
                className="w-full h-14 text-xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 hover:from-red-600 hover:via-yellow-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                disabled={!roomId.trim() || !playerName.trim()}
              >
                🎯 Create & Join Game
              </Button>
            </form>

            <div className="text-center">
              <p className="text-sm text-gray-500">
                Share the room ID with friends to play together!
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Decorative UNO cards */}
        <div className="absolute top-10 left-10 w-12 h-16 bg-red-500 rounded-lg shadow-lg transform -rotate-12 opacity-20"></div>
        <div className="absolute top-20 right-10 w-12 h-16 bg-blue-500 rounded-lg shadow-lg transform rotate-12 opacity-20"></div>
        <div className="absolute bottom-10 left-20 w-12 h-16 bg-yellow-500 rounded-lg shadow-lg transform rotate-6 opacity-20"></div>
        <div className="absolute bottom-20 right-20 w-12 h-16 bg-green-500 rounded-lg shadow-lg transform -rotate-6 opacity-20"></div>
      </div>
    </div>
  )
}

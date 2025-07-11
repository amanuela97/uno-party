/* eslint-disable @next/next/no-img-element */
'use client'

import { useState, use } from 'react'
import { useSearchParams } from 'next/navigation'
import usePartySocket from 'partysocket/react'
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
import {
  Users,
  Gamepad2,
  Copy,
  Share2,
  Crown,
  X,
  RotateCcw,
} from 'lucide-react'
import { GameState, Card as UnoCard, Color, Value } from '@/party/types'
import { ServerMessage, ClientMessage } from '@/party/index'

interface GamePageProps {
  params: Promise<{ room_id: string }>
}

export default function GamePage({ params }: GamePageProps) {
  const searchParams = useSearchParams()
  const { room_id: roomId } = use(params)
  const playerName = searchParams.get('name')

  const [gameState, setGameState] = useState<GameState | null>(null)
  const [playerNameInput, setPlayerNameInput] = useState('')
  const [isJoined, setIsJoined] = useState(false)
  const [error, setError] = useState('')
  const [copySuccess, setCopySuccess] = useState(false)
  const [currentPlayer, setCurrentPlayer] = useState<string | null>(playerName)
  const [selectedCard, setSelectedCard] = useState<string | null>(null)
  const [chosenColor, setChosenColor] = useState<Color | null>(null)
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [dealingAnimation, setDealingAnimation] = useState(false)
  const [dealingPlayerId, setDealingPlayerId] = useState<string | null>(null)
  const [flippingCard, setFlippingCard] = useState(false)
  const [animatingCards, setAnimatingCards] = useState<string[]>([])
  const [drawnCard, setDrawnCard] = useState<UnoCard | null>(null)
  const [showDrawnCardModal, setShowDrawnCardModal] = useState(false)
  const [hasJoinedSuccessfully, setHasJoinedSuccessfully] = useState(false)
  const [unoCallSuccess, setUnoCallSuccess] = useState(false)
  const [hasCalledUnoThisTurn, setHasCalledUnoThisTurn] = useState(false)
  const [drawPileAnimating, setDrawPileAnimating] = useState(false)

  const ws = usePartySocket({
    host:
      process.env.NODE_ENV === 'development'
        ? 'localhost:1999'
        : 'uno-party.amanuela97.partykit.dev',
    room: roomId,
    onOpen() {
      console.log('Connected to room:', roomId)
      if (playerName && !isJoined) {
        // Auto-join if player name is provided via URL
        ws.send(JSON.stringify({ type: 'join', name: playerName }))
        setIsJoined(true)
        setCurrentPlayer(playerName)
      }
    },
    onMessage(event) {
      const message = JSON.parse(event.data) as ServerMessage

      if (message.type === 'state') {
        const prevState = gameState
        setGameState(message.state)

        // Clear error if we successfully joined
        if (message.state.players.some((p) => p.name === currentPlayer)) {
          setError('')
          setHasJoinedSuccessfully(true)
        }

        // Reset UNO call status when turn changes
        if (
          prevState &&
          prevState.currentPlayerIndex !== message.state.currentPlayerIndex
        ) {
          setHasCalledUnoThisTurn(false)
        }

        // Trigger animations based on state changes
        if (prevState && message.state.started && !prevState.started) {
          // Game just started - flip the first card
          setFlippingCard(true)
          setTimeout(() => setFlippingCard(false), 1200)
        }

        // Check for card dealing animation
        if (prevState && message.state.started) {
          const currentPlayerData = message.state.players.find(
            (p) => p.name === currentPlayer
          )
          const prevPlayerData = prevState.players.find(
            (p) => p.name === currentPlayer
          )

          if (currentPlayerData && prevPlayerData) {
            // Reset UNO success feedback if hand count changed
            if (currentPlayerData.hand.length !== prevPlayerData.hand.length) {
              setUnoCallSuccess(false)
            }

            if (currentPlayerData.hand.length > prevPlayerData.hand.length) {
              // Player drew a card - only animate current player's hand
              setDealingAnimation(true)
              setDealingPlayerId(currentPlayerData.id)
              setTimeout(() => {
                setDealingAnimation(false)
                setDealingPlayerId(null)
              }, 1000)
            }
          }
        }
      } else if (message.type === 'error') {
        setError(message.message)
        // If joining failed, reset join state
        if (
          message.message.includes('already taken') ||
          message.message.includes('full') ||
          message.message.includes('already in') ||
          message.message.includes('already in progress')
        ) {
          setIsJoined(false)
          setCurrentPlayer(null)
          setHasJoinedSuccessfully(false)
        }
      } else if (message.type === 'drawnCard') {
        // Player drew a playable card
        setDrawnCard(message.card)
        setShowDrawnCardModal(true)
      }
    },
    onClose() {
      console.log('Connection closed')
    },
    onError(error) {
      console.error('Socket error:', error)
      setError('Connection error')
    },
  })

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault()
    const name = playerNameInput.trim()
    if (!name) return

    setError('') // Clear previous errors
    setHasJoinedSuccessfully(false)
    ws.send(JSON.stringify({ type: 'join', name }))
    setIsJoined(true)
    setCurrentPlayer(name)
    setPlayerNameInput('')
  }

  const handleStartGame = () => {
    ws.send(JSON.stringify({ type: 'startGame' }))
  }

  const handleReady = () => {
    ws.send(JSON.stringify({ type: 'ready' }))
  }

  const handleEndGame = () => {
    ws.send(JSON.stringify({ type: 'endGame' }))
  }

  const handleRestartGame = () => {
    ws.send(JSON.stringify({ type: 'restartGame' }))
  }

  const handleCopyRoom = async () => {
    try {
      const url = `${window.location.origin}/uno/${encodeURIComponent(roomId)}`
      await navigator.clipboard.writeText(url)
      setCopySuccess(true)
      setTimeout(() => setCopySuccess(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  const handlePlayCard = (cardId: string) => {
    const card = currentPlayerData?.hand.find((c) => c.id === cardId)
    if (!card) return

    // Add card to animating list
    setAnimatingCards([...animatingCards, cardId])
    setTimeout(() => {
      setAnimatingCards((prev) => prev.filter((id) => id !== cardId))
    }, 800)

    // Check if it's a wild card that needs color selection
    if (
      (card.value === Value.Wild || card.value === Value.WildDrawFour) &&
      !chosenColor
    ) {
      setSelectedCard(cardId)
      setShowColorPicker(true)
      return
    }

    const message: ClientMessage = {
      type: 'playCard',
      cardId,
      ...(chosenColor && { chosenColor }),
    }

    ws.send(JSON.stringify(message))
    setSelectedCard(null)
    setChosenColor(null)
    setShowColorPicker(false)
  }

  const handlePlayDrawnCard = (cardId: string) => {
    const card = drawnCard
    if (!card || card.id !== cardId) return

    // Check if it's a wild card that needs color selection
    if (
      (card.value === Value.Wild || card.value === Value.WildDrawFour) &&
      !chosenColor
    ) {
      setSelectedCard(cardId)
      setShowDrawnCardModal(false)
      setShowColorPicker(true)
      return
    }

    const message: ClientMessage = {
      type: 'playDrawnCard',
      cardId,
      ...(chosenColor && { chosenColor }),
    }

    ws.send(JSON.stringify(message))
    setDrawnCard(null)
    setShowDrawnCardModal(false)
    setSelectedCard(null)
    setChosenColor(null)
  }

  const handleKeepDrawnCard = () => {
    setDrawnCard(null)
    setShowDrawnCardModal(false)
  }

  const handleColorChoice = (color: Color) => {
    setChosenColor(color)
    setShowColorPicker(false)

    if (selectedCard) {
      if (drawnCard && drawnCard.id === selectedCard) {
        // Playing the drawn card
        ws.send(
          JSON.stringify({
            type: 'playDrawnCard',
            cardId: selectedCard,
            chosenColor: color,
          })
        )
        setDrawnCard(null)
        setShowDrawnCardModal(false)
      } else {
        // Playing a card from hand
        ws.send(
          JSON.stringify({
            type: 'playCard',
            cardId: selectedCard,
            chosenColor: color,
          })
        )
      }
      setSelectedCard(null)
      setChosenColor(null)
    }
  }

  const handleDrawCard = () => {
    // Trigger draw pile animation
    setDrawPileAnimating(true)
    setTimeout(() => setDrawPileAnimating(false), 1000)

    ws.send(JSON.stringify({ type: 'drawCard' }))
  }

  const handleCallUno = () => {
    ws.send(JSON.stringify({ type: 'callUno' }))
    setUnoCallSuccess(true)
    setHasCalledUnoThisTurn(true)
    setTimeout(() => setUnoCallSuccess(false), 3000) // Show success for 3 seconds
  }

  const currentPlayerData = gameState?.players.find(
    (p) => p.name === currentPlayer
  )
  const isCurrentPlayerTurn =
    gameState &&
    currentPlayerData &&
    gameState.players[gameState.currentPlayerIndex]?.id === currentPlayerData.id
  const isFirstPlayer =
    gameState?.players &&
    gameState.players.length > 0 &&
    gameState.players[0].name === currentPlayer
  const canStartGame =
    gameState &&
    gameState.players.length >= 2 &&
    gameState.players.every((p) => p.ready) &&
    !gameState.started
  const isRoomFull = Boolean(gameState && gameState.players.length >= 5)
  const winner = gameState?.players.find((p) => p.hand.length === 0)
  const hasWinner = Boolean(
    gameState &&
      !gameState.started &&
      hasJoinedSuccessfully &&
      gameState.discardPile.length > 0 && // Only show if there was actually a game played
      winner
  )

  // Show loading state when we have a player name from URL but haven't joined successfully yet
  if (playerName && !hasJoinedSuccessfully && !error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-4 border-white shadow-2xl bg-white/95 backdrop-blur">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-blue-500 rounded-full flex items-center justify-center">
                <Gamepad2 className="w-8 h-8 text-white animate-spin" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent">
                Joining Room: {roomId}
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Connecting as {playerName}...
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <div className="animate-pulse">
                <div className="h-2 bg-gradient-to-r from-red-500 to-blue-500 rounded-full"></div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  // Show join form for manual entry (when no player name in URL or join failed)
  if (!hasJoinedSuccessfully && (!playerName || error)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="border-4 border-white shadow-2xl bg-white/95 backdrop-blur">
            <CardHeader className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-red-500 to-blue-500 rounded-full flex items-center justify-center">
                <Gamepad2 className="w-8 h-8 text-white" />
              </div>
              <CardTitle className="text-3xl font-bold bg-gradient-to-r from-red-600 to-blue-600 bg-clip-text text-transparent">
                Join Room: {roomId}
              </CardTitle>
              <CardDescription className="text-lg text-gray-600">
                Enter your name to join the game! 🎮
              </CardDescription>
              {isRoomFull && (
                <div className="bg-orange-100 border border-orange-400 text-orange-700 px-4 py-3 rounded">
                  <strong>Room is full!</strong> This room already has 5
                  players.
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-6">
              <form onSubmit={handleJoin} className="space-y-6">
                <div className="space-y-2">
                  <Label
                    htmlFor="player-name"
                    className="text-sm font-semibold text-gray-700 flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Your Player Name
                  </Label>
                  <Input
                    id="player-name"
                    type="text"
                    placeholder="Enter your name"
                    value={playerNameInput}
                    onChange={(e) => setPlayerNameInput(e.target.value)}
                    className="h-12 text-lg border-2 border-gray-200 focus:border-blue-500 transition-colors"
                    required
                    disabled={isRoomFull}
                    suppressHydrationWarning
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-xl font-bold bg-gradient-to-r from-red-500 via-yellow-500 to-blue-500 hover:from-red-600 hover:via-yellow-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                  disabled={!playerNameInput.trim() || isRoomFull}
                >
                  {isRoomFull ? '❌ Room Full' : '🎯 Join Game Room'}
                </Button>
              </form>

              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                  {error}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-500 via-yellow-500 to-blue-500 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-xl p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-r from-red-500 to-blue-500 rounded-full flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-800">
                  UNO Game Room
                </h1>
                <p className="text-gray-600">Room: {roomId}</p>
                {isRoomFull && (
                  <p className="text-orange-600 font-medium">
                    ⚠️ Room is full (5/5 players)
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <Button
                onClick={handleCopyRoom}
                variant="outline"
                className="flex items-center gap-2"
              >
                {copySuccess ? (
                  <Share2 className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
                {copySuccess ? 'Copied!' : 'Share Room'}
              </Button>

              {!gameState?.started && (
                <Button
                  onClick={handleReady}
                  disabled={currentPlayerData?.ready}
                >
                  {currentPlayerData?.ready ? '✓ Ready' : 'Ready Up'}
                </Button>
              )}

              {isFirstPlayer && canStartGame && (
                <Button
                  onClick={handleStartGame}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Start Game
                </Button>
              )}

              {/* Game Control Buttons for Host */}
              {isFirstPlayer && (
                <div className="flex gap-2">
                  {gameState?.started && (
                    <Button
                      onClick={handleEndGame}
                      variant="destructive"
                      className="flex items-center gap-2"
                    >
                      <X className="w-4 h-4" />
                      End Game
                    </Button>
                  )}

                  {!gameState?.started &&
                    gameState?.players &&
                    gameState.players.length >= 2 && (
                      <Button
                        onClick={handleRestartGame}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        Reset Game
                      </Button>
                    )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Game Status Messages */}
        {hasWinner && winner && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-6 py-4 rounded-lg mb-6 text-center">
            <h2 className="text-xl font-bold">🎉 Game Over! 🎉</h2>
            <p className="text-lg font-semibold">
              🏆 {winner.name} has won the game! 🏆
            </p>
            <p className="text-sm mt-2">
              {winner.name === currentPlayer
                ? 'Congratulations! You won!'
                : `${winner.name} played all their cards first!`}
            </p>
          </div>
        )}

        {isRoomFull && (
          <div className="bg-orange-100 border border-orange-400 text-orange-700 px-6 py-4 rounded-lg mb-6 text-center">
            <strong>⚠️ Room is at maximum capacity (5 players)</strong>
            <p>No more players can join this room.</p>
          </div>
        )}

        {/* Players Status */}
        <div className="bg-white/95 backdrop-blur rounded-lg shadow-xl p-6 mb-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800">
            Players ({gameState?.players.length || 0}/5)
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gameState?.players.map((player, index) => (
              <div
                key={player.id}
                className={`p-4 rounded-lg border-2 ${
                  gameState.started && index === gameState.currentPlayerIndex
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        player.ready ? 'bg-green-500' : 'bg-gray-400'
                      }`}
                    />
                    <span className="font-medium">{player.name}</span>
                    {index === 0 && (
                      <span title="Host">
                        <Crown className="w-4 h-4 text-yellow-500" />
                      </span>
                    )}
                  </div>
                  <span className="text-sm text-gray-600">
                    {gameState.started
                      ? `${player.hand.length} cards`
                      : player.ready
                      ? 'Ready'
                      : 'Not Ready'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Other Players' Cards */}
        {gameState?.started && (
          <div className="bg-white/95 backdrop-blur rounded-lg shadow-xl p-6 mb-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Other Players
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {gameState.players
                .filter((player) => player.name !== currentPlayer)
                .map((player) => (
                  <div key={player.id} className="text-center">
                    <h3 className="font-semibold mb-2 text-gray-700">
                      {player.name}
                    </h3>
                    <div className="flex flex-wrap justify-center gap-1">
                      {Array.from({ length: player.hand.length }).map(
                        (_, cardIndex) => (
                          <div
                            key={cardIndex}
                            className="transform transition-all duration-300 card-transition"
                            data-card-dealing={
                              dealingAnimation &&
                              dealingPlayerId === player.id &&
                              cardIndex === player.hand.length - 1
                            }
                          >
                            <img
                              src="/cards/Back- 1.svg"
                              alt="Card back"
                              className="w-8 h-12 shadow-md"
                            />
                          </div>
                        )
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mt-2">
                      {player.hand.length} cards
                    </p>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Game Board */}
        {gameState?.started && (
          <div className="bg-white/95 backdrop-blur rounded-lg shadow-xl p-6 mb-6">
            <div className="flex flex-col items-center space-y-6">
              <h2 className="text-xl font-bold text-gray-800">Game Board</h2>

              {/* Current Turn */}
              <div className="text-center">
                <p className="text-lg text-gray-600">
                  Current Turn:{' '}
                  <span className="font-bold text-blue-600">
                    {gameState.players[gameState.currentPlayerIndex]?.name}
                  </span>
                </p>
                <p className="text-sm text-gray-500">
                  Direction: {gameState.direction === 1 ? '→' : '←'}
                </p>
              </div>

              {/* Game Area */}
              <div className="flex items-center justify-center gap-8">
                {/* Draw Pile */}
                <div className="text-center">
                  <p className="text-sm font-medium mb-2 text-gray-600">
                    Draw Pile
                  </p>
                  <div className="relative">
                    <img
                      src="/cards/Back- 1.svg"
                      alt="Draw pile"
                      className="w-16 h-24 shadow-lg cursor-pointer hover:shadow-xl transition-shadow card-transition"
                      onClick={isCurrentPlayerTurn ? handleDrawCard : undefined}
                      data-card-drawing={drawPileAnimating}
                    />
                    {dealingAnimation && (
                      <div className="absolute inset-0 bg-yellow-300 opacity-50 rounded-lg animate-ping"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {gameState.deck.length} cards
                  </p>
                </div>

                {/* Discard Pile */}
                {gameState.discardPile.length > 0 && (
                  <div className="text-center">
                    <p className="text-sm font-medium mb-2 text-gray-600">
                      Current Card
                    </p>
                    <div className="relative">
                      <img
                        src={getCardImagePath(
                          gameState.discardPile[
                            gameState.discardPile.length - 1
                          ]
                        )}
                        alt="Current card"
                        className="w-16 h-24 shadow-lg card-transition"
                        data-card-flipping={flippingCard}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {isCurrentPlayerTurn && (
                <div className="flex gap-4">
                  <Button onClick={handleDrawCard} variant="outline">
                    Draw Card
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* UNO Button - Show when player has 1 card and hasn't called UNO this turn */}
        {gameState?.started &&
          currentPlayerData?.hand.length === 1 &&
          !hasCalledUnoThisTurn && (
            <div className="bg-white/95 backdrop-blur rounded-lg shadow-xl p-4 mb-6">
              <div className="flex justify-center">
                {unoCallSuccess ? (
                  <div className="text-green-600 text-xl font-bold px-8 py-4 flex items-center gap-2">
                    ✅ UNO CALLED SUCCESSFULLY! ✅
                  </div>
                ) : (
                  <Button
                    onClick={handleCallUno}
                    className="bg-red-600 hover:bg-red-700 text-white text-xl font-bold px-8 py-4 animate-pulse"
                  >
                    🔔 CALL UNO! 🔔
                  </Button>
                )}
              </div>
              <p className="text-center text-sm text-gray-600 mt-2">
                {unoCallSuccess
                  ? 'Great! You called UNO in time and avoided the penalty!'
                  : 'You have 1 card left! Click to call UNO or get 2 penalty cards!'}
              </p>
            </div>
          )}

        {/* Player Hand */}
        {gameState?.started && currentPlayerData && (
          <div className="bg-white/95 backdrop-blur rounded-lg shadow-xl p-6">
            <h2 className="text-xl font-bold mb-4 text-gray-800">
              Your Hand ({currentPlayerData.hand.length} cards)
            </h2>
            <div className="flex flex-wrap gap-2 justify-center">
              {currentPlayerData.hand.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handlePlayCard(card.id)}
                  disabled={!isCurrentPlayerTurn}
                  className="transform transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 card-transition"
                  data-card-playing={animatingCards.includes(card.id)}
                >
                  <img
                    src={getCardImagePath(card)}
                    alt={`${card.color} ${card.value}`}
                    className="w-16 h-24 shadow-lg hover:shadow-xl"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Drawn Card Modal */}
        {showDrawnCardModal && drawnCard && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-2xl max-w-sm w-full mx-4">
              <h3 className="text-lg font-bold mb-4 text-center">
                Card Drawn!
              </h3>
              <div className="text-center mb-4">
                <p className="text-sm text-gray-600 mb-3">
                  You drew this card. It&apos;s playable!
                </p>
                <img
                  src={getCardImagePath(drawnCard)}
                  alt={`${drawnCard.color} ${drawnCard.value}`}
                  className="w-20 h-32 mx-auto shadow-lg card-transition"
                  data-card-dealing="true"
                />
              </div>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => handlePlayDrawnCard(drawnCard.id)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  Play Card
                </Button>
                <Button onClick={handleKeepDrawnCard} variant="outline">
                  Keep Card
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Color Picker Modal */}
        {showColorPicker && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 shadow-2xl">
              <h3 className="text-lg font-bold mb-4">Choose a Color</h3>
              <div className="flex gap-4">
                {[Color.Red, Color.Green, Color.Blue, Color.Yellow].map(
                  (color) => (
                    <button
                      key={color}
                      onClick={() => handleColorChoice(color)}
                      className={`w-16 h-16 rounded-full shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 ${
                        color === Color.Red
                          ? 'bg-red-500'
                          : color === Color.Green
                          ? 'bg-green-500'
                          : color === Color.Blue
                          ? 'bg-blue-500'
                          : 'bg-yellow-500'
                      }`}
                    />
                  )
                )}
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mt-4">
            {error}
          </div>
        )}
      </div>
    </div>
  )
}

function getCardImagePath(card: UnoCard): string {
  // Handle wild cards with chosen colors
  if (card.value === Value.Wild || card.value === Value.WildDrawFour) {
    if (card.color && card.color !== Color.Wild) {
      // Show the chosen color instead of the wild card
      const colorName = card.color.charAt(0).toUpperCase() + card.color.slice(1)
      if (card.value === Value.WildDrawFour) {
        return `/cards/${colorName} Draw2- 1.svg` // Use Draw2 as placeholder for wild draw four with color
      } else {
        return `/cards/${colorName}- 0.svg` // Use 0 card as placeholder for wild with color
      }
    } else {
      // Show original wild card
      if (card.value === Value.WildDrawFour) {
        return '/cards/Draw4- 1.svg'
      } else {
        return '/cards/Wild- 1.svg'
      }
    }
  }

  const color = card.color.charAt(0).toUpperCase() + card.color.slice(1)

  if (card.value === Value.Skip) {
    return `/cards/${color} Skip- 1.svg`
  } else if (card.value === Value.Reverse) {
    return `/cards/${color} Reverse- 1.svg`
  } else if (card.value === Value.DrawTwo) {
    return `/cards/${color} Draw2- 1.svg`
  } else {
    return `/cards/${color}- ${card.value}.svg`
  }
}

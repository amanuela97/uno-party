import type * as Party from 'partykit/server'
import { GameState, Card, Color, Value, Player } from './types'
import { generateDeck, shuffle } from './util'

// Messages from client to server
export type ClientMessage =
  | { type: 'join'; name: string }
  | { type: 'startGame' }
  | { type: 'playCard'; cardId: string; chosenColor?: Color }
  | { type: 'drawCard' }
  | { type: 'playDrawnCard'; cardId: string; chosenColor?: Color }
  | { type: 'ready' }
  | { type: 'callUno' }
  | { type: 'endGame' }
  | { type: 'restartGame' }

// Messages from server to client
export type ServerMessage =
  | { type: 'state'; state: GameState }
  | { type: 'error'; message: string }
  | { type: 'drawnCard'; card: Card }

const MAX_PLAYERS = 5
const INITIAL_HAND_SIZE = 7
const UNO_CALL_WINDOW = 10000 // 10 seconds in milliseconds

export default class Server implements Party.Server {
  constructor(readonly room: Party.Room) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async onConnect(conn: Party.Connection, ctx: Party.ConnectionContext) {
    // Initialize state when first client joins
    if (!(await this.room.storage.get('gameState'))) {
      const initial: GameState = {
        players: [],
        deck: [],
        discardPile: [],
        currentPlayerIndex: 0,
        direction: 1,
        started: false,
      }
      await this.room.storage.put('gameState', initial)
    }

    // Clean up empty rooms or stale states
    await this.cleanupRoomIfNeeded()

    // Listen for client messages
    conn.addEventListener('message', (event) => {
      if (typeof event.data === 'string') {
        this.onMessage(event.data, conn)
      }
    })

    // Sync current state
    const state = (await this.room.storage.get('gameState')) as GameState
    conn.send(JSON.stringify({ type: 'state', state }))
  }

  async onClose(conn: Party.Connection) {
    // Handle player disconnection
    const state = (await this.room.storage.get('gameState')) as GameState

    // Remove disconnected player
    const playerIndex = state.players.findIndex((p) => p.id === conn.id)
    if (playerIndex !== -1) {
      state.players.splice(playerIndex, 1)

      // If no players left, reset the room state
      if (state.players.length === 0) {
        const initial: GameState = {
          players: [],
          deck: [],
          discardPile: [],
          currentPlayerIndex: 0,
          direction: 1,
          started: false,
        }
        await this.room.storage.put('gameState', initial)
      } else {
        // Adjust current player index if needed
        if (state.started && state.currentPlayerIndex >= state.players.length) {
          state.currentPlayerIndex = 0
        } else if (state.started && playerIndex < state.currentPlayerIndex) {
          state.currentPlayerIndex = Math.max(0, state.currentPlayerIndex - 1)
        }

        // If only one player left and game was started, end the game
        if (state.started && state.players.length === 1) {
          state.started = false
          state.deck = []
          state.discardPile = []
          state.players.forEach((p) => {
            p.hand = []
            p.ready = false
          })
        }

        await this.room.storage.put('gameState', state)
      }

      this.broadcastState()
    }
  }

  private async cleanupRoomIfNeeded() {
    const state = (await this.room.storage.get('gameState')) as GameState

    // Reset room if it has stale player data but no actual connections
    if (state.players.length > 0) {
      // Check if any of the players are actually connected
      const activeConnections = Array.from(this.room.getConnections())
      const activePlayerIds = activeConnections.map((conn) => conn.id)

      // Remove players who are no longer connected
      state.players = state.players.filter((p) =>
        activePlayerIds.includes(p.id)
      )

      // If no players left after cleanup, reset the room
      if (state.players.length === 0) {
        const initial: GameState = {
          players: [],
          deck: [],
          discardPile: [],
          currentPlayerIndex: 0,
          direction: 1,
          started: false,
        }
        await this.room.storage.put('gameState', initial)
      } else {
        await this.room.storage.put('gameState', state)
      }
    }
  }

  async onMessage(message: string, sender: Party.Connection) {
    try {
      const msg = JSON.parse(message) as ClientMessage
      const state = (await this.room.storage.get('gameState')) as GameState

      switch (msg.type) {
        case 'join': {
          if (state.started) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'Game already in progress',
              })
            )
          }

          if (state.players.length >= MAX_PLAYERS) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'Room is full (maximum 5 players)',
              })
            )
          }

          // Check if player already exists by connection ID
          const existingPlayerById = state.players.find(
            (p) => p.id === sender.id
          )
          if (existingPlayerById) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'You are already in this room',
              })
            )
          }

          // Check if player name is already taken
          const existingPlayerByName = state.players.find(
            (p) => p.name === msg.name
          )
          if (existingPlayerByName) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: `Player name "${msg.name}" is already taken. Please choose a different name.`,
              })
            )
          }

          // Add player
          state.players.push({
            id: sender.id,
            name: msg.name,
            hand: [],
            ready: false,
          })
          await this.room.storage.put('gameState', state)
          return this.broadcastState()
        }

        case 'ready': {
          if (state.players.length >= MAX_PLAYERS) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'Room is full, cannot ready up',
              })
            )
          }

          const player = state.players.find((p) => p.id === sender.id)
          if (!player) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Player not found' })
            )
          }
          player.ready = true
          await this.room.storage.put('gameState', state)
          return this.broadcastState()
        }

        case 'startGame': {
          if (state.started) return
          if (state.players.length < 2) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'Need at least 2 players',
              })
            )
          }

          if (state.players.length >= MAX_PLAYERS) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'Room is full, cannot start game',
              })
            )
          }

          // Check if all players are ready
          const allReady = state.players.every((p) => p.ready)
          if (!allReady) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'All players must be ready',
              })
            )
          }

          // Setup deck and hands
          state.deck = generateDeck()

          // Deal initial hands
          for (let i = 0; i < INITIAL_HAND_SIZE; i++) {
            state.players.forEach((p) => {
              const card = state.deck.pop()!
              p.hand.push(card)
            })
          }

          // Flip first discard (make sure it's not an action card)
          let firstCard = state.deck.pop()!
          while (
            firstCard.value === Value.WildDrawFour ||
            firstCard.value === Value.Wild
          ) {
            state.deck.unshift(firstCard)
            state.deck = shuffle(state.deck)
            firstCard = state.deck.pop()!
          }

          state.discardPile.push(firstCard)
          state.started = true
          await this.room.storage.put('gameState', state)
          return this.broadcastState()
        }

        case 'endGame': {
          // Only allow first player (host) to end game
          const isFirstPlayer =
            state.players.length > 0 && state.players[0].id === sender.id
          if (!isFirstPlayer) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'Only the host can end the game',
              })
            )
          }

          // Reset game state but keep players
          state.started = false
          state.deck = []
          state.discardPile = []
          state.currentPlayerIndex = 0
          state.direction = 1
          state.players.forEach((p) => {
            p.hand = []
            p.ready = false
          })

          await this.room.storage.put('gameState', state)
          return this.broadcastState()
        }

        case 'restartGame': {
          // Only allow first player (host) to restart game
          const isFirstPlayer =
            state.players.length > 0 && state.players[0].id === sender.id
          if (!isFirstPlayer) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'Only the host can restart the game',
              })
            )
          }

          if (state.players.length < 2) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'Need at least 2 players to restart',
              })
            )
          }

          // Reset players to not ready
          state.players.forEach((p) => {
            p.ready = false
          })

          // Reset game state
          state.started = false
          state.deck = []
          state.discardPile = []
          state.currentPlayerIndex = 0
          state.direction = 1
          state.players.forEach((p) => {
            p.hand = []
          })

          await this.room.storage.put('gameState', state)
          return this.broadcastState()
        }

        case 'playCard': {
          if (!state.started) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Game not started' })
            )
          }

          // Validate turn
          const playerIndex = state.players.findIndex((p) => p.id === sender.id)
          if (playerIndex === -1) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Player not found' })
            )
          }

          if (playerIndex !== state.currentPlayerIndex) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Not your turn' })
            )
          }

          const player = state.players[playerIndex]
          const cardIndex = player.hand.findIndex((c) => c.id === msg.cardId)
          if (cardIndex === -1) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Card not in hand' })
            )
          }

          const card = player.hand[cardIndex]
          const topCard = state.discardPile[state.discardPile.length - 1]

          // Validate card is playable
          if (!this.isCardPlayable(card, topCard, player.hand)) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Invalid card play' })
            )
          }

          // Wild cards need a color choice
          if (
            (card.value === Value.Wild || card.value === Value.WildDrawFour) &&
            !msg.chosenColor
          ) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'Must choose a color for wild card',
              })
            )
          }

          // Remove from hand & add to discard
          const [playedCard] = player.hand.splice(cardIndex, 1)

          // Set chosen color for wild cards
          if (msg.chosenColor) {
            playedCard.color = msg.chosenColor
          }

          state.discardPile.push(playedCard)

          // Handle special card actions
          const turnAdvancedByCard = this.handleCardAction(playedCard, state)

          // Check if player now has one card
          if (player.hand.length === 1) {
            player.lastCardTimestamp = Date.now()
            player.calledUno = false
          }

          // Check for win condition
          if (player.hand.length === 0) {
            // Player won! End the game
            state.started = false
            // Could add winner tracking here
          }

          // Check and apply UNO penalties for all players
          await this.checkAndHandleUnoPenalties(state)

          // Advance turn (only if game is still going and card didn't handle turn advancement)
          if (state.started && !turnAdvancedByCard) {
            state.currentPlayerIndex = this.getNextIndex(state)
          }
          state.lastActionTimestamp = Date.now()

          await this.room.storage.put('gameState', state)
          return this.broadcastState()
        }

        case 'drawCard': {
          if (!state.started) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Game not started' })
            )
          }

          const playerIndex = state.players.findIndex((p) => p.id === sender.id)
          if (playerIndex === -1) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Player not found' })
            )
          }

          if (playerIndex !== state.currentPlayerIndex) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Not your turn' })
            )
          }

          const player = state.players[playerIndex]

          // Check if deck is empty
          if (state.deck.length === 0) {
            // Reshuffle discard pile
            const topCard = state.discardPile.pop()!
            state.deck = shuffle(state.discardPile)
            state.discardPile = [topCard]
          }

          if (state.deck.length > 0) {
            const drawnCard = state.deck.pop()!
            player.hand.push(drawnCard)

            // Check if the drawn card is playable
            const topCard = state.discardPile[state.discardPile.length - 1]
            const isPlayable = this.isCardPlayable(
              drawnCard,
              topCard,
              player.hand
            )

            if (isPlayable) {
              // Send the drawn card to the player so they can choose to play it
              sender.send(
                JSON.stringify({ type: 'drawnCard', card: drawnCard })
              )
              await this.room.storage.put('gameState', state)
              return this.broadcastState()
            } else {
              // Card is not playable, turn ends
              state.currentPlayerIndex = this.getNextIndex(state)
            }
          }

          await this.room.storage.put('gameState', state)
          return this.broadcastState()
        }

        case 'playDrawnCard': {
          if (!state.started) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Game not started' })
            )
          }

          const playerIndex = state.players.findIndex((p) => p.id === sender.id)
          if (playerIndex === -1) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Player not found' })
            )
          }

          if (playerIndex !== state.currentPlayerIndex) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Not your turn' })
            )
          }

          const player = state.players[playerIndex]
          const cardIndex = player.hand.findIndex((c) => c.id === msg.cardId)
          if (cardIndex === -1) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Card not in hand' })
            )
          }

          const card = player.hand[cardIndex]
          const topCard = state.discardPile[state.discardPile.length - 1]

          // Validate card is playable
          if (!this.isCardPlayable(card, topCard, player.hand)) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Invalid card play' })
            )
          }

          // Wild cards need a color choice
          if (
            (card.value === Value.Wild || card.value === Value.WildDrawFour) &&
            !msg.chosenColor
          ) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'Must choose a color for wild card',
              })
            )
          }

          // Remove from hand & add to discard
          const [playedCard] = player.hand.splice(cardIndex, 1)

          // Set chosen color for wild cards
          if (msg.chosenColor) {
            playedCard.color = msg.chosenColor
          }

          state.discardPile.push(playedCard)

          // Handle special card actions
          const turnAdvancedByCard = this.handleCardAction(playedCard, state)

          // Check if player now has one card
          if (player.hand.length === 1) {
            player.lastCardTimestamp = Date.now()
            player.calledUno = false
          }

          // Check for win condition
          if (player.hand.length === 0) {
            // Player won! End the game
            state.started = false
            // Could add winner tracking here
          }

          // Check and apply UNO penalties for all players
          await this.checkAndHandleUnoPenalties(state)

          // Advance turn (only if game is still going and card didn't handle turn advancement)
          if (state.started && !turnAdvancedByCard) {
            state.currentPlayerIndex = this.getNextIndex(state)
          }
          state.lastActionTimestamp = Date.now()

          await this.room.storage.put('gameState', state)
          return this.broadcastState()
        }

        case 'callUno': {
          const player = state.players.find((p) => p.id === sender.id)
          if (!player) {
            return sender.send(
              JSON.stringify({ type: 'error', message: 'Player not found' })
            )
          }

          if (player.hand.length !== 1) {
            return sender.send(
              JSON.stringify({
                type: 'error',
                message: 'Can only call UNO with one card',
              })
            )
          }

          player.calledUno = true
          await this.room.storage.put('gameState', state)
          return this.broadcastState()
        }

        default:
          return sender.send(
            JSON.stringify({ type: 'error', message: 'Unknown message type' })
          )
      }
    } catch (error) {
      console.error('Error processing message:', error)
      sender.send(
        JSON.stringify({ type: 'error', message: 'Invalid message format' })
      )
    }
  }

  private isCardPlayable(
    card: Card,
    topCard: Card,
    playerHand: Card[]
  ): boolean {
    // Wild cards need special handling
    if (card.value === Value.WildDrawFour) {
      // Can only play Wild Draw Four if you have no cards that match the top card's color or value
      return !playerHand.some(
        (c) =>
          c.id !== card.id && // Not the same card
          (c.color === topCard.color || c.value === topCard.value) && // Matching color or value
          c.value !== Value.Wild &&
          c.value !== Value.WildDrawFour // Not another wild card
      )
    }

    // Wild cards can always be played
    if (card.value === Value.Wild) {
      return true
    }

    // Same color or same value
    return card.color === topCard.color || card.value === topCard.value
  }

  private handleCardAction(card: Card, state: GameState): boolean {
    switch (card.value) {
      case Value.Skip:
        // In 2-player games, skip opponent and come back to current player
        if (state.players.length === 2) {
          // Advance twice to skip opponent and come back to current player
          state.currentPlayerIndex = this.getNextIndex(state)
          state.currentPlayerIndex = this.getNextIndex(state)
        } else {
          // In 3+ player games, skip next player
          state.currentPlayerIndex = this.getNextIndex(state)
        }
        return true

      case Value.Reverse:
        // For 2 players, reverse acts like skip (opponent loses turn, you play again)
        if (state.players.length === 2) {
          // Advance twice to skip opponent and come back to current player
          state.currentPlayerIndex = this.getNextIndex(state)
          state.currentPlayerIndex = this.getNextIndex(state)
        } else {
          // Reverse direction for 3+ players
          state.direction = state.direction === 1 ? -1 : 1
        }
        return true

      case Value.Wild:
        // In 2-player games, Wild card skips opponent's turn
        if (state.players.length === 2) {
          // Advance twice to skip opponent and come back to current player
          state.currentPlayerIndex = this.getNextIndex(state)
          state.currentPlayerIndex = this.getNextIndex(state)
        } else {
          // In 3+ player games, just change color (turn advances normally)
          return false
        }
        return true

      case Value.DrawTwo:
        // Next player draws 2 cards and loses their turn
        this.drawCardsToNextPlayer(2, state)
        // In 2-player games, turn comes back to current player
        if (state.players.length === 2) {
          // Advance twice to skip opponent and come back to current player
          state.currentPlayerIndex = this.getNextIndex(state)
          state.currentPlayerIndex = this.getNextIndex(state)
        } else {
          // In 3+ player games, skip the player who drew the cards
          state.currentPlayerIndex = this.getNextIndex(state)
        }
        return true

      case Value.WildDrawFour:
        // Next player draws 4 cards and loses their turn
        this.drawCardsToNextPlayer(4, state)
        // In 2-player games, turn comes back to current player
        if (state.players.length === 2) {
          // Advance twice to skip opponent and come back to current player
          state.currentPlayerIndex = this.getNextIndex(state)
          state.currentPlayerIndex = this.getNextIndex(state)
        } else {
          // In 3+ player games, skip the player who drew the cards
          state.currentPlayerIndex = this.getNextIndex(state)
        }
        return true

      // Wild color change is handled by chosenColor parameter
      default:
        // No special action for number cards
        return false
    }
  }

  private drawCardsToNextPlayer(count: number, state: GameState): void {
    const nextIndex = this.getNextIndex(state)
    const nextPlayer = state.players[nextIndex]

    for (let i = 0; i < count; i++) {
      // Check if deck is empty
      if (state.deck.length === 0) {
        // Reshuffle discard pile
        const topCard = state.discardPile.pop()!
        state.deck = shuffle(state.discardPile)
        state.discardPile = [topCard]
      }

      if (state.deck.length > 0) {
        const drawnCard = state.deck.pop()!
        nextPlayer.hand.push(drawnCard)
      }
    }
  }

  private async checkAndHandleUnoPenalties(state: GameState): Promise<void> {
    const currentTime = Date.now()

    // Check UNO penalties for all players who have 1 card
    for (const player of state.players) {
      if (
        player.hand.length === 1 &&
        player.lastCardTimestamp &&
        !player.calledUno &&
        currentTime - player.lastCardTimestamp > UNO_CALL_WINDOW
      ) {
        // Player failed to call UNO within 10 seconds - draw 2 penalty cards
        this.drawCardsToPlayer(2, player, state)
        player.lastCardTimestamp = undefined // Reset the timestamp
        player.calledUno = false // Reset UNO call status
      }
    }
  }

  private drawCardsToPlayer(
    count: number,
    player: Player,
    state: GameState
  ): void {
    for (let i = 0; i < count; i++) {
      // Check if deck is empty
      if (state.deck.length === 0) {
        // Reshuffle discard pile
        const topCard = state.discardPile.pop()!
        state.deck = shuffle(state.discardPile)
        state.discardPile = [topCard]
      }

      if (state.deck.length > 0) {
        const drawnCard = state.deck.pop()!
        player.hand.push(drawnCard)
      }
    }
  }

  private getNextIndex(state: GameState): number {
    const { players, currentPlayerIndex, direction } = state
    const next =
      (currentPlayerIndex + direction + players.length) % players.length
    return next
  }

  private async broadcastState(): Promise<void> {
    const state = (await this.room.storage.get('gameState')) as GameState
    this.room.broadcast(JSON.stringify({ type: 'state', state }))
  }
}

Server satisfies Party.Worker

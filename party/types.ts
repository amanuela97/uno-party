export enum Color {
  Red = 'red',
  Green = 'green',
  Blue = 'blue',
  Yellow = 'yellow',
  Wild = 'wild',
}

// Card values in UNO
export enum Value {
  Zero = '0',
  One = '1',
  Two = '2',
  Three = '3',
  Four = '4',
  Five = '5',
  Six = '6',
  Seven = '7',
  Eight = '8',
  Nine = '9',
  Skip = 'skip',
  Reverse = 'reverse',
  DrawTwo = 'draw_two',
  Wild = 'wild',
  WildDrawFour = 'wild_draw_four',
}

// A single UNO card
export interface Card {
  id: string // Unique identifier
  color: Color // Card color (or wild)
  value: Value // Card value/action
}

// A player in the game
export interface Player {
  id: string // Connection/session ID
  name: string // Display name
  hand: Card[] // Cards in hand
  ready: boolean // Ready to start?
  lastCardTimestamp?: number // Timestamp when player got to 1 card
  calledUno?: boolean // Whether player has called UNO
}

// The overall game state stored in PartyKit room.storage
export interface GameState {
  players: Player[] // Up to 5 players
  deck: Card[] // Draw pile
  discardPile: Card[] // Cards played
  currentPlayerIndex: number // Whose turn
  direction: 1 | -1 // Play order direction
  started: boolean // Has the game begun?
  lastActionTimestamp?: number // Timestamp of last action for UNO timing
}

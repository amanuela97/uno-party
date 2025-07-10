import { Card, Color, Value } from '@/party/types'

export function generateDeck(): Card[] {
  const cards: Card[] = []
  const colors = [Color.Red, Color.Green, Color.Blue, Color.Yellow]
  // Number & action cards
  colors.forEach((color) => {
    // One zero per color
    cards.push({ id: `${color}-0`, color, value: Value.Zero })
    // Two of each 1–9, Skip, Reverse, DrawTwo
    ;[
      Value.One,
      Value.Two,
      Value.Three,
      Value.Four,
      Value.Five,
      Value.Six,
      Value.Seven,
      Value.Eight,
      Value.Nine,
      Value.Skip,
      Value.Reverse,
      Value.DrawTwo,
    ].forEach((value) => {
      cards.push({ id: `${color}-${value}-1`, color, value })
      cards.push({ id: `${color}-${value}-2`, color, value })
    })
  })
  // Wild cards
  for (let i = 1; i <= 4; i++) {
    cards.push({ id: `wild-${i}`, color: Color.Wild, value: Value.Wild })
    cards.push({
      id: `wild-draw-${i}`,
      color: Color.Wild,
      value: Value.WildDrawFour,
    })
  }
  return shuffle(cards)
}

/** Fisher–Yates shuffle */
export function shuffle<T>(array: T[]): T[] {
  const a = array.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

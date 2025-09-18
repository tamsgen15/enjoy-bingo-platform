// Printed bingo cards - matches physical cards exactly
// Use extract-printed-cards.py to generate from database
// This ensures database and printed cards are identical

// Placeholder - will be replaced by extract-printed-cards.py
export const PRINTED_BINGO_CARDS = {
  // Cards will be populated from database
}

// Get card data by number (matches printed cards)
export const getBingoCard = (cardNumber) => {
  return PRINTED_BINGO_CARDS[cardNumber] || null
}

// Get all numbers from a card (excluding FREE space)
export const getCardNumbers = (cardNumber) => {
  const card = getBingoCard(cardNumber)
  if (!card) return []
  
  return [
    ...card.B,
    ...card.I,
    ...card.N, // N column doesn't have FREE in database
    ...card.G,
    ...card.O
  ]
}

// Convert database format to display format (adds FREE space)
export const getDisplayCard = (cardNumber) => {
  const card = getBingoCard(cardNumber)
  if (!card) return null
  
  return {
    B: card.B,
    I: card.I,
    N: [card.N[0], card.N[1], 'FREE', card.N[2], card.N[3]], // Insert FREE in middle
    G: card.G,
    O: card.O
  }
}
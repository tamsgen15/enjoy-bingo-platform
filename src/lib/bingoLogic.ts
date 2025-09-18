import { supabase } from './supabase'

// Generate a bingo card for a specific card number (1-100)
export const generateBingoCard = (cardNumber: number) => {
  // Use card number as seed for consistent generation
  const seed = cardNumber
  const random = (min: number, max: number, offset: number) => {
    const x = Math.sin(seed + offset) * 10000
    return Math.floor((x - Math.floor(x)) * (max - min + 1)) + min
  }

  const card = []
  
  // B column (1-15)
  const bNumbers: number[] = []
  for (let i = 0; i < 5; i++) {
    let num: number
    do {
      num = random(1, 15, i * 10)
    } while (bNumbers.includes(num))
    bNumbers.push(num)
  }
  
  // I column (16-30)
  const iNumbers: number[] = []
  for (let i = 0; i < 5; i++) {
    let num: number
    do {
      num = random(16, 30, i * 10 + 50)
    } while (iNumbers.includes(num))
    iNumbers.push(num)
  }
  
  // N column (31-45) - center is FREE
  const nNumbers: number[] = []
  for (let i = 0; i < 5; i++) {
    if (i === 2) {
      nNumbers.push(0) // FREE space
    } else {
      let num: number
      do {
        num = random(31, 45, i * 10 + 100)
      } while (nNumbers.includes(num))
      nNumbers.push(num)
    }
  }
  
  // G column (46-60)
  const gNumbers: number[] = []
  for (let i = 0; i < 5; i++) {
    let num: number
    do {
      num = random(46, 60, i * 10 + 150)
    } while (gNumbers.includes(num))
    gNumbers.push(num)
  }
  
  // O column (61-75)
  const oNumbers: number[] = []
  for (let i = 0; i < 5; i++) {
    let num: number
    do {
      num = random(61, 75, i * 10 + 200)
    } while (oNumbers.includes(num))
    oNumbers.push(num)
  }
  
  // Arrange in 5x5 grid
  for (let row = 0; row < 5; row++) {
    card.push([
      bNumbers[row],
      iNumbers[row], 
      nNumbers[row],
      gNumbers[row],
      oNumbers[row]
    ])
  }
  
  return card
}

// Check if a pattern is completed
export const checkPattern = (cardData: number[][], markedPositions: number[], pattern: number[]) => {
  // Convert 2D card to 1D array for position checking
  const flatCard = cardData.flat()
  
  // Check if all pattern positions are marked
  return pattern.every(pos => {
    // Position 12 (center) is always marked if it's a free space
    if (pos === 12 && flatCard[12] === 0) return true
    return markedPositions.includes(pos)
  })
}

// Mark a number on the card
export const markNumber = async (playerId: string, calledNumber: number) => {
  try {
    // Get player's card
    const { data: playerCard } = await supabase
      .from('player_cards')
      .select('*')
      .eq('player_id', playerId)
      .single()
    
    if (!playerCard) return false
    
    const cardData = playerCard.card_data
    const markedPositions = playerCard.marked_positions || []
    
    // Find position of called number
    let position = -1
    for (let i = 0; i < 5; i++) {
      for (let j = 0; j < 5; j++) {
        if (cardData[i][j] === calledNumber) {
          position = i * 5 + j
          break
        }
      }
      if (position !== -1) break
    }
    
    // Mark the position if found
    if (position !== -1 && !markedPositions.includes(position)) {
      const newMarkedPositions = [...markedPositions, position]
      
      await supabase
        .from('player_cards')
        .update({ marked_positions: newMarkedPositions })
        .eq('player_id', playerId)
      
      return true
    }
    
    return false
  } catch (error) {
    console.error('Error marking number:', error)
    return false
  }
}

// Check for winners
export const checkForWinners = async (gameId: string) => {
  try {
    // Get all players in the game
    const { data: players } = await supabase
      .from('players')
      .select(`
        *,
        player_cards(*)
      `)
      .eq('game_id', gameId)
      .eq('is_winner', false)
    
    // Get active patterns
    const { data: patterns } = await supabase
      .from('bingo_patterns')
      .select('*')
      .eq('is_active', true)
    
    if (!players || !patterns) return []
    
    const winners = []
    
    for (const player of players) {
      const playerCard = player.player_cards[0]
      if (!playerCard) continue
      
      const cardData = playerCard.card_data
      const markedPositions = playerCard.marked_positions || []
      
      // Check each pattern
      for (const pattern of patterns) {
        if (checkPattern(cardData, markedPositions, pattern.pattern)) {
          winners.push({
            player,
            pattern: pattern.name,
            cardData,
            markedPositions
          })
          
          // Mark player as winner
          await supabase
            .from('players')
            .update({ is_winner: true })
            .eq('id', player.id)
          
          break // One pattern win is enough
        }
      }
    }
    
    return winners
  } catch (error) {
    console.error('Error checking for winners:', error)
    return []
  }
}

// Create player card when joining game
export const createPlayerCard = async (playerId: string, cardNumber: number) => {
  try {
    const cardData = generateBingoCard(cardNumber)
    
    const { data } = await supabase
      .from('player_cards')
      .insert({
        player_id: playerId,
        card_number: cardNumber,
        card_data: cardData,
        marked_positions: [12] // Center is pre-marked if free
      })
      .select()
      .single()
    
    return data
  } catch (error) {
    console.error('Error creating player card:', error)
    return null
  }
}
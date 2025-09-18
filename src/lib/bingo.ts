export function checkWinningPattern(card: any, markedNumbers: number[]): boolean {
  const markedSet = new Set(markedNumbers)
  
  // Create 5x5 grid from card columns
  const grid: number[][] = []
  for (let row = 0; row < 5; row++) {
    grid[row] = []
    for (let col = 0; col < 5; col++) {
      if (col === 0) grid[row][col] = card.b[row]
      else if (col === 1) grid[row][col] = card.i[row]
      else if (col === 2) {
        if (row === 2) grid[row][col] = 0 // Free space
        else grid[row][col] = card.n[row < 2 ? row : row - 1]
      }
      else if (col === 3) grid[row][col] = card.g[row]
      else if (col === 4) grid[row][col] = card.o[row]
    }
  }

  // Check rows
  for (let row = 0; row < 5; row++) {
    let rowComplete = true
    for (let col = 0; col < 5; col++) {
      if (row === 2 && col === 2) continue // Free space
      if (!markedSet.has(grid[row][col])) {
        rowComplete = false
        break
      }
    }
    if (rowComplete) return true
  }

  // Check columns
  for (let col = 0; col < 5; col++) {
    let colComplete = true
    for (let row = 0; row < 5; row++) {
      if (row === 2 && col === 2) continue // Free space
      if (!markedSet.has(grid[row][col])) {
        colComplete = false
        break
      }
    }
    if (colComplete) return true
  }

  // Check 4 corners
  const corners = [[0,0], [0,4], [4,0], [4,4]]
  let cornersComplete = true
  for (const [row, col] of corners) {
    if (!markedSet.has(grid[row][col])) {
      cornersComplete = false
      break
    }
  }
  if (cornersComplete) return true

  // Check all edges (perimeter)
  const edges = [
    [0,0], [0,1], [0,2], [0,3], [0,4], // Top
    [4,0], [4,1], [4,2], [4,3], [4,4], // Bottom
    [1,0], [2,0], [3,0], // Left
    [1,4], [2,4], [3,4]  // Right
  ]
  let edgesComplete = true
  for (const [row, col] of edges) {
    if (row === 2 && col === 2) continue // Free space
    if (!markedSet.has(grid[row][col])) {
      edgesComplete = false
      break
    }
  }
  if (edgesComplete) return true

  // Check diagonals
  let diagonal1 = true
  let diagonal2 = true
  
  for (let i = 0; i < 5; i++) {
    if (i === 2) continue // Free space
    if (!markedSet.has(grid[i][i])) diagonal1 = false
    if (!markedSet.has(grid[i][4-i])) diagonal2 = false
  }

  return diagonal1 || diagonal2
}

export function generateRandomNumbers(): number[] {
  const numbers = Array.from({ length: 75 }, (_, i) => i + 1)
  // Fisher-Yates shuffle for proper randomization
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return numbers
}

export function formatBingoCard(dbCard: any): any {
  return {
    id: dbCard.id,
    cardNumber: dbCard.card_number,
    b: dbCard.b_column,
    i: dbCard.i_column,
    n: dbCard.n_column, // N column has 4 numbers (no free space)
    g: dbCard.g_column,
    o: dbCard.o_column
  }
}

// Validate bingo card has unique numbers in each column
export function validateBingoCard(card: any): boolean {
  const columns = [card.b, card.i, card.n, card.g, card.o]
  
  for (const column of columns) {
    const uniqueNumbers = new Set(column)
    if (uniqueNumbers.size !== column.length) {
      return false // Duplicate found
    }
  }
  
  // Check number ranges
  const ranges = [
    { col: card.b, min: 1, max: 15 },
    { col: card.i, min: 16, max: 30 },
    { col: card.n, min: 31, max: 45 },
    { col: card.g, min: 46, max: 60 },
    { col: card.o, min: 61, max: 75 }
  ]
  
  for (const range of ranges) {
    for (const num of range.col) {
      if (num < range.min || num > range.max) {
        return false
      }
    }
  }
  
  return true
}
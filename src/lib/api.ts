// API client for backend communication
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

class ApiClient {
  private async request(endpoint: string, options: RequestInit = {}) {
    const url = `${API_BASE_URL}${endpoint}`
    const config: RequestInit = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    }

    const response = await fetch(url, config)
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Network error' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  }

  // Game API
  async createGame() {
    return this.request('/game/create', { method: 'POST' })
  }

  async getGameState(gameId: string) {
    return this.request(`/game/${gameId}`)
  }

  async startGame(gameId: string) {
    return this.request(`/game/${gameId}/start`, { method: 'POST' })
  }

  async callNumber(gameId: string) {
    return this.request(`/game/${gameId}/call-number`, { method: 'POST' })
  }

  async assignCard(gameId: string, playerName: string, cardNumber: number) {
    return this.request(`/game/${gameId}/assign-card`, {
      method: 'POST',
      body: JSON.stringify({ playerName, cardNumber })
    })
  }

  async verifyWinner(gameId: string, cardNumber: number) {
    return this.request(`/game/${gameId}/verify-winner`, {
      method: 'POST',
      body: JSON.stringify({ cardNumber })
    })
  }

  // Admin API
  async adminSignIn(email: string, password: string) {
    return this.request('/admin/signin', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    })
  }

  async getGameStats() {
    return this.request('/admin/stats')
  }

  // Player API
  async getPlayers(gameId: string) {
    return this.request(`/game/${gameId}/players`)
  }

  async markCard(gameId: string, playerId: string, number: number) {
    return this.request(`/game/${gameId}/mark`, {
      method: 'POST',
      body: JSON.stringify({ playerId, number })
    })
  }
}

export const apiClient = new ApiClient()
export default apiClient
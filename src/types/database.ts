export interface Database {
  public: {
    Tables: {
      games: {
        Row: {
          id: string
          status: 'waiting' | 'active' | 'finished'
          rule_id: string | null
          host_id: string | null
          current_number: number | null
          called_numbers: number[]
          started_at: string | null
          finished_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          status?: 'waiting' | 'active' | 'finished'
          rule_id?: string | null
          host_id?: string | null
          current_number?: number | null
          called_numbers?: number[]
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          status?: 'waiting' | 'active' | 'finished'
          rule_id?: string | null
          host_id?: string | null
          current_number?: number | null
          called_numbers?: number[]
          started_at?: string | null
          finished_at?: string | null
          created_at?: string
        }
      }
      bingo_cards: {
        Row: {
          id: string
          card_number: number
          b_column: number[]
          i_column: number[]
          n_column: number[]
          g_column: number[]
          o_column: number[]
          created_at: string
        }
        Insert: {
          id?: string
          card_number: number
          b_column: number[]
          i_column: number[]
          n_column: number[]
          g_column: number[]
          o_column: number[]
          created_at?: string
        }
        Update: {
          id?: string
          card_number?: number
          b_column?: number[]
          i_column?: number[]
          n_column?: number[]
          g_column?: number[]
          o_column?: number[]
          created_at?: string
        }
      }
      players: {
        Row: {
          id: string
          game_id: string
          player_name: string
          card_number: number | null
          is_winner: boolean
          joined_at: string
        }
        Insert: {
          id?: string
          game_id: string
          player_name: string
          card_number?: number | null
          is_winner?: boolean
          joined_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          player_name?: string
          card_number?: number | null
          is_winner?: boolean
          joined_at?: string
        }
      }
      game_rules: {
        Row: {
          id: string
          name: string
          min_players: number
          max_players: number
          card_price: number
          winning_patterns: any
          number_call_interval: number
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          min_players?: number
          max_players?: number
          card_price?: number
          winning_patterns?: any
          number_call_interval?: number
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          min_players?: number
          max_players?: number
          card_price?: number
          winning_patterns?: any
          number_call_interval?: number
          created_at?: string
        }
      }
      called_numbers: {
        Row: {
          id: string
          game_id: string
          number: number
          called_at: string
        }
        Insert: {
          id?: string
          game_id: string
          number: number
          called_at?: string
        }
        Update: {
          id?: string
          game_id?: string
          number?: number
          called_at?: string
        }
      }
    }
  }
}
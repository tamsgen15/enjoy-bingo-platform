export interface Game {
  id: string;
  status: 'waiting' | 'active' | 'finished';
  admin_id: string;
  current_number?: number;
  called_numbers: number[];
  started_at?: string;
  finished_at?: string;
  created_at: string;
}

export interface Player {
  id: string;
  game_id: string;
  player_name: string;
  selected_card_number: number;
  bet_amount: number;
  is_winner: boolean;
  joined_at: string;
}

export interface PrintedCard {
  id: string;
  card_number: number;
  b_column: number[];
  i_column: number[];
  n_column: number[];
  g_column: number[];
  o_column: number[];
}

export interface CalledNumber {
  id: string;
  game_id: string;
  number: number;
  called_at: string;
}

export interface AdminAction {
  id: string;
  game_id: string;
  admin_id: string;
  player_id?: string;
  action_type: 'number_selection' | 'winner_verification';
  details?: any;
  created_at: string;
}
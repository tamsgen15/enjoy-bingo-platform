-- Bulk add multiple players at once (FAST)
CREATE OR REPLACE FUNCTION bulk_add_players_tenant(
  p_game_id UUID,
  p_tenant_id UUID,
  p_players JSONB -- Array of {player_name, card_number}
)
RETURNS JSONB AS $$
DECLARE
  v_player JSONB;
  v_inserted_count INT := 0;
BEGIN
  -- Insert all players in one transaction
  FOR v_player IN SELECT * FROM jsonb_array_elements(p_players)
  LOOP
    INSERT INTO players (game_id, tenant_id, player_name, card_number)
    VALUES (
      p_game_id,
      p_tenant_id,
      v_player->>'player_name',
      (v_player->>'card_number')::INT
    );
    v_inserted_count := v_inserted_count + 1;
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'inserted_count', v_inserted_count
  );
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql;
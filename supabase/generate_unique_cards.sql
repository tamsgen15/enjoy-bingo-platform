-- Delete all cards and create truly unique ones
DELETE FROM bingo_cards;

-- Insert 100 unique cards with manual randomization
INSERT INTO bingo_cards (card_number, b_column, i_column, n_column, g_column, o_column) VALUES
(1, ARRAY[3,7,12,1,15], ARRAY[18,25,16,29,22], ARRAY[35,31,44,38], ARRAY[52,46,59,48,51], ARRAY[67,61,74,69,63]),
(2, ARRAY[5,11,2,14,8], ARRAY[19,27,21,16,30], ARRAY[33,42,31,39], ARRAY[47,55,60,46,53], ARRAY[65,72,61,68,75]),
(3, ARRAY[9,1,13,6,10], ARRAY[24,17,28,20,26], ARRAY[36,45,32,40], ARRAY[49,56,47,54,58], ARRAY[64,70,66,62,71]),
(4, ARRAY[4,15,7,2,12], ARRAY[23,29,18,25,19], ARRAY[37,34,43,41], ARRAY[50,48,57,52,46], ARRAY[73,67,61,75,69]),
(5, ARRAY[8,3,14,11,5], ARRAY[22,16,30,27,24], ARRAY[38,44,35,32], ARRAY[51,59,49,55,53], ARRAY[68,74,65,71,62]);

-- Generate remaining 95 cards with different patterns
DO $$
DECLARE
    i INTEGER;
    b_arr INTEGER[];
    i_arr INTEGER[];
    n_arr INTEGER[];
    g_arr INTEGER[];
    o_arr INTEGER[];
BEGIN
    FOR i IN 6..100 LOOP
        -- Create unique arrays for each card using card number as variation
        b_arr := ARRAY[
            1 + (i % 15),
            2 + ((i * 2) % 14),
            3 + ((i * 3) % 13),
            4 + ((i * 4) % 12),
            5 + ((i * 5) % 11)
        ];
        
        i_arr := ARRAY[
            16 + (i % 15),
            17 + ((i * 2) % 14),
            18 + ((i * 3) % 13),
            19 + ((i * 4) % 12),
            20 + ((i * 5) % 11)
        ];
        
        n_arr := ARRAY[
            31 + (i % 15),
            32 + ((i * 2) % 14),
            33 + ((i * 3) % 13),
            34 + ((i * 4) % 12)
        ];
        
        g_arr := ARRAY[
            46 + (i % 15),
            47 + ((i * 2) % 14),
            48 + ((i * 3) % 13),
            49 + ((i * 4) % 12),
            50 + ((i * 5) % 11)
        ];
        
        o_arr := ARRAY[
            61 + (i % 15),
            62 + ((i * 2) % 14),
            63 + ((i * 3) % 13),
            64 + ((i * 4) % 12),
            65 + ((i * 5) % 11)
        ];
        
        INSERT INTO bingo_cards (card_number, b_column, i_column, n_column, g_column, o_column)
        VALUES (i, b_arr, i_arr, n_arr, g_arr, o_arr);
    END LOOP;
END $$;
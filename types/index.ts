/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/poker_program.json`.
 */
export type PokerProgram = {
  "address": "3VWxtZ5CCjG2eKH1FNQxDkCKU57QMk5SZ61Gx6pcsHne",
  "metadata": {
    "name": "poker_program",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "collect_rent",
      "docs": [
        "Collect Rent - admin może zebrać rent z pustych stołów (players = 0)",
        "Authority only: House.authority może zamknąć wszystkie puste stoły + Dealery",
        "Rent z zamkniętych stołów i Dealerów idzie do House"
      ],
      "discriminator": [
        52,
        165,
        96,
        165,
        131,
        15,
        160,
        36
      ],
      "accounts": [
        {
          "name": "table_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  98,
                  108,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "table_vault.table_id",
                "account": "table_vault"
              }
            ]
          }
        },
        {
          "name": "dealer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "table_vault.table_id",
                "account": "table_vault"
              }
            ]
          }
        },
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        }
      ],
      "args": []
    },
    {
      "name": "deposit_sol",
      "docs": [
        "Deposit SOL - wpłata do playerVault"
      ],
      "discriminator": [
        108,
        81,
        78,
        117,
        125,
        155,
        56,
        200
      ],
      "accounts": [
        {
          "name": "player_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "deposit_to_game",
      "docs": [
        "DEPOSIT TO GAME - deklaracja gotowości gracza z wpłaceniem buy-in + mintowanie tokenów",
        "Każdy gracz wywołuje gdy jest ready do gry (multiple calls możliwe - dokupywanie)",
        "Fee: 1% od buy_in_amount + buy-in amount wpłacany do TableVault",
        "NOWE: Mintuje tokeny w systemie Dealer (1 SOL = 10,000 tokenów)",
        "Max buy-in: 3 SOL (z template)"
      ],
      "discriminator": [
        250,
        164,
        120,
        131,
        56,
        191,
        133,
        137
      ],
      "accounts": [
        {
          "name": "table_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  98,
                  108,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "table_vault.table_id",
                "account": "table_vault"
              }
            ]
          }
        },
        {
          "name": "dealer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "table_vault.table_id",
                "account": "table_vault"
              }
            ]
          }
        },
        {
          "name": "player_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "buy_in_amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "initialize_challenger_template",
      "docs": [
        "Initialize Challenger Template - inicjalizacja szablonu stołu Challenger",
        "ZAKTUALIZOWANE: Max buy-in zwiększony do 3 SOL"
      ],
      "discriminator": [
        158,
        156,
        53,
        156,
        21,
        111,
        141,
        196
      ],
      "accounts": [
        {
          "name": "template",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  98,
                  108,
                  101,
                  95,
                  116,
                  101,
                  109,
                  112,
                  108,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "const",
                "value": [
                  99,
                  104,
                  97,
                  108,
                  108,
                  101,
                  110,
                  103,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initialize_house",
      "docs": [
        "Inicjalizacja House account (tylko raz)"
      ],
      "discriminator": [
        180,
        46,
        86,
        125,
        135,
        107,
        214,
        28
      ],
      "accounts": [
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "join_game",
      "docs": [
        "Join Game - dołączenie do istniejącego stołu (rezerwacja miejsca)",
        "🚫 WYMAGANIE: Stół musi mieć ≥1 gracza (nie można dołączyć do pustego)",
        "Zapewnia ekonomię creation fee - ludzie muszą otwierać nowe stoły"
      ],
      "discriminator": [
        107,
        112,
        18,
        38,
        56,
        173,
        60,
        128
      ],
      "accounts": [
        {
          "name": "table_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  98,
                  108,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "table_id"
              }
            ]
          }
        },
        {
          "name": "player_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "house",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        }
      ],
      "args": [
        {
          "name": "table_id",
          "type": "u64"
        }
      ]
    },
    {
      "name": "kick_out_player",
      "docs": [
        "Kick Out Player - usunięcie gracza z 0 tokenów (tylko House Authority)",
        "Używane przez backend gdy gracz ma 0 tokenów i nie chce się dokupić",
        "Nie wypłaca żadnych środków - gracz blokował tylko miejsce przy stole"
      ],
      "discriminator": [
        126,
        145,
        6,
        66,
        86,
        89,
        44,
        169
      ],
      "accounts": [
        {
          "name": "dealer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "table_vault.table_id",
                "account": "table_vault"
              }
            ]
          }
        },
        {
          "name": "table_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  98,
                  108,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "table_vault.table_id",
                "account": "table_vault"
              }
            ]
          }
        },
        {
          "name": "player_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "arg",
                "path": "player_vault_pda"
              }
            ]
          }
        },
        {
          "name": "house",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "player_vault_pda",
          "type": "pubkey"
        }
      ]
    },
    {
      "name": "leave_table",
      "docs": [
        "Leave Table - opuszczenie stołu z transferem środków według tokenów z Dealera",
        "NOWE: Wypłata bazuje na tokenach, nie na buy_in_amount"
      ],
      "discriminator": [
        163,
        153,
        94,
        194,
        19,
        106,
        113,
        32
      ],
      "accounts": [
        {
          "name": "table_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  98,
                  108,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "table_vault.table_id",
                "account": "table_vault"
              }
            ]
          }
        },
        {
          "name": "dealer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "table_vault.table_id",
                "account": "table_vault"
              }
            ]
          }
        },
        {
          "name": "player_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ]
          }
        },
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "open_challenger_table",
      "docs": [
        "Open Challenger Table - otwieranie nowego stołu z Challenger template + Dealer",
        "OWNER: Table należy do House Authority (nie do twórcy)",
        "Automatycznie dodaje twórcę jako pierwszego gracza",
        "Fees: 0.01 SOL creation fee → House",
        "NOWE: Inicjalizuje także Dealer account dla zarządzania tokenami"
      ],
      "discriminator": [
        116,
        219,
        229,
        244,
        123,
        65,
        94,
        105
      ],
      "accounts": [
        {
          "name": "table_counter",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  98,
                  108,
                  101,
                  95,
                  99,
                  111,
                  117,
                  110,
                  116,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "template",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  98,
                  108,
                  101,
                  95,
                  116,
                  101,
                  109,
                  112,
                  108,
                  97,
                  116,
                  101
                ]
              },
              {
                "kind": "const",
                "value": [
                  99,
                  104,
                  97,
                  108,
                  108,
                  101,
                  110,
                  103,
                  101,
                  114
                ]
              }
            ]
          }
        },
        {
          "name": "table_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  98,
                  108,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "table_counter.count",
                "account": "table_counter"
              }
            ]
          }
        },
        {
          "name": "dealer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "table_counter.count",
                "account": "table_counter"
              }
            ]
          }
        },
        {
          "name": "player_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "creator"
              }
            ]
          }
        },
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "creator",
          "writable": true,
          "signer": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "redistribute_tokens",
      "docs": [
        "Redistribute Tokens - redystrybucja tokenów po rozdaniu (tylko House Authority)",
        "Używane przez backend po każdym rozdaniu do aktualizacji balansów",
        "Zachowuje zero-sum invariant: suma tokenów musi pozostać stała"
      ],
      "discriminator": [
        198,
        34,
        62,
        25,
        253,
        46,
        197,
        223
      ],
      "accounts": [
        {
          "name": "dealer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  97,
                  108,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "table_vault.table_id",
                "account": "table_vault"
              }
            ]
          }
        },
        {
          "name": "table_vault",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  116,
                  97,
                  98,
                  108,
                  101,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "table_vault.table_id",
                "account": "table_vault"
              }
            ]
          }
        },
        {
          "name": "house",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "signer": true
        }
      ],
      "args": [
        {
          "name": "new_balances",
          "type": {
            "vec": {
              "defined": {
                "name": "player_token_balance"
              }
            }
          }
        }
      ]
    },
    {
      "name": "withdraw_from_house",
      "docs": [
        "Wypłata z House account (tylko dla authority)"
      ],
      "discriminator": [
        166,
        199,
        13,
        102,
        212,
        193,
        155,
        28
      ],
      "accounts": [
        {
          "name": "house",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  104,
                  111,
                  117,
                  115,
                  101
                ]
              }
            ]
          }
        },
        {
          "name": "authority",
          "writable": true,
          "signer": true,
          "relations": [
            "house"
          ]
        },
        {
          "name": "destination",
          "writable": true
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "withdraw_sol",
      "docs": [
        "Withdraw SOL - wypłata z playerVault"
      ],
      "discriminator": [
        145,
        131,
        74,
        136,
        65,
        137,
        42,
        38
      ],
      "accounts": [
        {
          "name": "player_vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114,
                  95,
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              },
              {
                "kind": "account",
                "path": "owner"
              }
            ]
          }
        },
        {
          "name": "owner",
          "writable": true,
          "signer": true,
          "relations": [
            "player_vault"
          ]
        },
        {
          "name": "system_program",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "dealer",
      "discriminator": [
        132,
        134,
        166,
        186,
        102,
        153,
        187,
        86
      ]
    },
    {
      "name": "house",
      "discriminator": [
        21,
        145,
        94,
        109,
        254,
        199,
        210,
        151
      ]
    },
    {
      "name": "player_vault",
      "discriminator": [
        37,
        59,
        99,
        224,
        234,
        233,
        179,
        185
      ]
    },
    {
      "name": "table_counter",
      "discriminator": [
        225,
        195,
        35,
        175,
        255,
        135,
        104,
        140
      ]
    },
    {
      "name": "table_template",
      "discriminator": [
        206,
        121,
        22,
        64,
        20,
        239,
        210,
        128
      ]
    },
    {
      "name": "table_vault",
      "discriminator": [
        7,
        14,
        145,
        251,
        151,
        162,
        15,
        125
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "table_full",
      "msg": "Table is full"
    },
    {
      "code": 6001,
      "name": "table_empty",
      "msg": "Table is empty - cannot join empty table"
    },
    {
      "code": 6002,
      "name": "player_not_at_table",
      "msg": "Player is not at this table"
    },
    {
      "code": 6003,
      "name": "player_already_at_table",
      "msg": "Player is already at this table"
    },
    {
      "code": 6004,
      "name": "player_already_ready",
      "msg": "Player is already ready"
    },
    {
      "code": 6005,
      "name": "insufficient_balance",
      "msg": "Insufficient balance"
    },
    {
      "code": 6006,
      "name": "game_already_active",
      "msg": "Game is already active"
    },
    {
      "code": 6007,
      "name": "game_not_active",
      "msg": "Game is not active"
    },
    {
      "code": 6008,
      "name": "not_enough_players",
      "msg": "Not enough players to start game (minimum 2)"
    },
    {
      "code": 6009,
      "name": "unauthorized",
      "msg": "Unauthorized action"
    },
    {
      "code": 6010,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    },
    {
      "code": 6011,
      "name": "underflow",
      "msg": "Arithmetic underflow"
    },
    {
      "code": 6012,
      "name": "minimum_deposit_not_met",
      "msg": "Minimum deposit amount not met (0.12 SOL required)"
    },
    {
      "code": 6013,
      "name": "invalid_deposit_amount",
      "msg": "Invalid deposit amount (minimum 0.12 SOL)"
    },
    {
      "code": 6014,
      "name": "invalid_buy_in_amount",
      "msg": "Invalid buy-in amount (below table minimum)"
    },
    {
      "code": 6015,
      "name": "cannot_act_during_game",
      "msg": "Cannot perform action during active game"
    },
    {
      "code": 6016,
      "name": "invalid_table_params",
      "msg": "Invalid table parameters"
    },
    {
      "code": 6017,
      "name": "house_not_initialized",
      "msg": "House account not initialized"
    },
    {
      "code": 6018,
      "name": "table_not_empty",
      "msg": "Table is not empty - cannot cleanup"
    },
    {
      "code": 6019,
      "name": "invalid_template",
      "msg": "Invalid table template"
    },
    {
      "code": 6020,
      "name": "player_already_seated",
      "msg": "Player is already seated at another table"
    },
    {
      "code": 6021,
      "name": "player_not_seated",
      "msg": "Player is not seated at any table"
    },
    {
      "code": 6022,
      "name": "player_already_in_game",
      "msg": "Player is already in an active game"
    },
    {
      "code": 6023,
      "name": "invalid_table_owner",
      "msg": "Invalid table owner - table must be owned by House Authority"
    },
    {
      "code": 6024,
      "name": "exceeds_max_buy_in",
      "msg": "Maximum buy-in exceeded"
    },
    {
      "code": 6025,
      "name": "token_sum_mismatch",
      "msg": "Token sum mismatch - total must remain constant"
    },
    {
      "code": 6026,
      "name": "token_integrity_violation",
      "msg": "Token integrity violation"
    },
    {
      "code": 6027,
      "name": "too_many_players",
      "msg": "Too many players for redistribution"
    },
    {
      "code": 6028,
      "name": "dealer_not_initialized",
      "msg": "Dealer not initialized"
    },
    {
      "code": 6029,
      "name": "invalid_token_amount",
      "msg": "Invalid token amount"
    },
    {
      "code": 6030,
      "name": "player_has_tokens",
      "msg": "Cannot kick out player - player still has tokens"
    }
  ],
  "types": [
    {
      "name": "dealer",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "table_id",
            "type": "u64"
          },
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "players_tokens",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "player_token_entry"
                  }
                },
                7
              ]
            }
          },
          {
            "name": "total_tokens_issued",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "house",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "authority",
            "type": "pubkey"
          },
          {
            "name": "total_collected",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "player_token_balance",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player_vault_pda",
            "type": "pubkey"
          },
          {
            "name": "tokens",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "player_token_entry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player_vault_pda",
            "type": {
              "option": "pubkey"
            }
          },
          {
            "name": "tokens",
            "type": "u64"
          }
        ]
      }
    },
    {
      "name": "player_vault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "is_seated",
            "type": "bool"
          },
          {
            "name": "is_ready",
            "type": "bool"
          },
          {
            "name": "current_table_id",
            "type": {
              "option": "u64"
            }
          },
          {
            "name": "buy_in_amount",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "table_counter",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "count",
            "type": "u64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "table_template",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "name",
            "type": "string"
          },
          {
            "name": "min_buy_in",
            "type": "u64"
          },
          {
            "name": "max_buy_in",
            "type": "u64"
          },
          {
            "name": "max_players",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "table_vault",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "table_id",
            "type": "u64"
          },
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "template_name",
            "type": "string"
          },
          {
            "name": "max_players",
            "type": "u8"
          },
          {
            "name": "min_buy_in",
            "type": "u64"
          },
          {
            "name": "max_buy_in",
            "type": "u64"
          },
          {
            "name": "creation_fee",
            "type": "u64"
          },
          {
            "name": "start_fee",
            "type": "u64"
          },
          {
            "name": "players",
            "type": {
              "array": [
                {
                  "option": "pubkey"
                },
                7
              ]
            }
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    }
  ]
};

// ========================================================================
// APPLICATION SPECIFIC TYPES AND UTILITIES
// ========================================================================

import { PublicKey } from '@solana/web3.js';

// UI Status types
export type StatusType = 'success' | 'warning' | 'error' | 'info';

// Application interface types for easier frontend use
export interface HouseInfo {
  exists: boolean;
  authority?: PublicKey;
  totalCollected?: number; // in SOL
  balance?: number; // in SOL
  isYourAuthority?: boolean;
}

export interface TemplateInfo {
  exists: boolean;
  name?: string;
  minBuyIn?: number; // in SOL
  maxBuyIn?: number; // in SOL
  maxPlayers?: number;
}

export interface PlayerVaultInfo {
  exists: boolean;
  owner?: PublicKey;
  isSeated?: boolean;
  ready?: boolean; // corresponds to isReady
  currentTableId?: number | null;
  buyInAmount?: number; // in SOL
  totalBalance?: number; // in SOL
  availableBalance?: number; // in SOL (total - buyInAmount if seated)
}

export interface TableInfo {
  id: number;
  owner: PublicKey;
  templateName: string;
  maxPlayers: number;
  minBuyIn: number; // in SOL
  maxBuyIn: number; // in SOL
  creationFee: number; // in SOL
  startFee: number; // in SOL
  players: number; // count of non-null players
  balance: number; // in SOL
  isEmpty: boolean;
}

export interface PlayerTokenEntry {
  playerVaultPda: PublicKey | null;
  tokens: number;
}

export interface DealerInfo {
  exists: boolean;
  tableId: number;
  authority?: PublicKey;
  playersTokens?: PlayerTokenEntry[];
  totalTokensIssued?: number;
  isYourAuthority?: boolean;
}

// Re-export for compatibility
export interface PlayerTokenBalance {
  playerVaultPda: PublicKey;
  tokens: number;
}

// Conversion utilities from blockchain accounts to UI types
export function convertHouseAccountToInfo(account: any, currentUser?: PublicKey): HouseInfo {
  return {
    exists: true,
    authority: account.authority,
    totalCollected: account.totalCollected ? Number(account.totalCollected) / 1e9 : 0,
    balance: 0, // Will be set separately by fetching account info
    isYourAuthority: currentUser ? account.authority.equals(currentUser) : false
  };
}

export function convertTemplateAccountToInfo(account: any): TemplateInfo {
  return {
    exists: true,
    name: account.name,
    minBuyIn: account.minBuyIn ? Number(account.minBuyIn) / 1e9 : 0,
    maxBuyIn: account.maxBuyIn ? Number(account.maxBuyIn) / 1e9 : 0,
    maxPlayers: account.maxPlayers
  };
}

export function convertPlayerVaultAccountToInfo(account: any, balance: number): PlayerVaultInfo {
  const buyInSOL = account.buyInAmount ? Number(account.buyInAmount) / 1e9 : 0;
  const totalBalance = balance;
  const availableBalance = account.isSeated ? Math.max(0, totalBalance - buyInSOL) : totalBalance;
  
  let currentTableId = null;
  if (account.currentTableId !== null && account.currentTableId !== undefined) {
    if (typeof account.currentTableId === 'object' && account.currentTableId.toNumber) {
      currentTableId = account.currentTableId.toNumber();
    } else {
      currentTableId = Number(account.currentTableId);
    }
  }
  
  const converted = {
    exists: true,
    owner: account.owner,
    isSeated: account.isSeated,
    ready: account.isReady,
    currentTableId,
    buyInAmount: buyInSOL,
    totalBalance,
    availableBalance
  };
  
  return converted;
}

export function convertTableVaultAccountToInfo(account: any): TableInfo {
  const playerCount = account.players ? account.players.filter((p: any) => p !== null).length : 0;
  
  let tableId = 0;
  if (account.tableId !== null && account.tableId !== undefined) {
    if (typeof account.tableId === 'object' && account.tableId.toNumber) {
      tableId = account.tableId.toNumber();
    } else {
      tableId = Number(account.tableId);
    }
  }
  
  const converted = {
    id: tableId,
    owner: account.owner,
    templateName: account.templateName,
    maxPlayers: account.maxPlayers,
    minBuyIn: account.minBuyIn ? Number(account.minBuyIn) / 1e9 : 0,
    maxBuyIn: account.maxBuyIn ? Number(account.maxBuyIn) / 1e9 : 0,
    creationFee: account.creationFee ? Number(account.creationFee) / 1e9 : 0,
    startFee: account.startFee ? Number(account.startFee) / 1e9 : 0,
    players: playerCount,
    balance: 0, // Will be set separately
    isEmpty: playerCount === 0
  };
  
  return converted;
}

export function convertDealerAccountToInfo(account: any, currentUser?: PublicKey): DealerInfo {
  // Prawidłowa konwersja playersTokens - obsługa opcjonalnego playerVaultPda
  const playersTokens: PlayerTokenEntry[] = account.playersTokens ? 
    account.playersTokens.map((entry: any) => ({
      playerVaultPda: entry.playerVaultPda || null, // Obsługa opcjonalnej wartości
      tokens: entry.tokens ? (typeof entry.tokens === 'object' && entry.tokens.toNumber ? entry.tokens.toNumber() : Number(entry.tokens)) : 0
    })) : [];

  // Prawidłowa konwersja tableId (BN -> number)
  let tableId = 0;
  if (account.tableId !== null && account.tableId !== undefined) {
    if (typeof account.tableId === 'object' && account.tableId.toNumber) {
      tableId = account.tableId.toNumber();
    } else {
      tableId = Number(account.tableId);
    }
  }

  // Prawidłowa konwersja totalTokensIssued (BN -> number)
  let totalTokensIssued = 0;
  if (account.totalTokensIssued !== null && account.totalTokensIssued !== undefined) {
    if (typeof account.totalTokensIssued === 'object' && account.totalTokensIssued.toNumber) {
      totalTokensIssued = account.totalTokensIssued.toNumber();
    } else {
      totalTokensIssued = Number(account.totalTokensIssued);
    }
  }

  const converted = {
    exists: true,
    tableId,
    authority: account.authority,
    playersTokens,
    totalTokensIssued,
    isYourAuthority: currentUser ? account.authority.equals(currentUser) : false
  };
  
  return converted;
}

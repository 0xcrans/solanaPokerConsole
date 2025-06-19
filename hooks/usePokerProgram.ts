import { useEffect, useState, useCallback } from 'react';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { PlayerTokenBalance } from '../types';

// Import IDL directly from the JSON file
import IDL_JSON from '../idl/poker_program.json';

const PROGRAM_ID = new PublicKey('3VWxtZ5CCjG2eKH1FNQxDkCKU57QMk5SZ61Gx6pcsHne');

export const usePokerProgram = () => {
  const wallet = useWallet();
  const { connection } = useConnection();
  const [program, setProgram] = useState<Program<Idl> | null>(null);

  useEffect(() => {
    if (wallet.connected && wallet.publicKey) {
      try {
        const provider = new AnchorProvider(
          connection,
          wallet as any,
          { commitment: 'confirmed', preflightCommitment: 'confirmed' }
        );
        
        // Validate IDL before using it
        if (!IDL_JSON || !IDL_JSON.instructions || !IDL_JSON.accounts) {
          console.error('❌ IDL is invalid or incomplete');
          return;
        }
        
        const prog = new Program(IDL_JSON as Idl, provider);
        
        // Debug: Check what methods are available
        console.log('🔍 Program methods available:', Object.keys(prog.methods || {}));
        console.log('🔍 Program account types available:', Object.keys(prog.account || {}));
        console.log('🔍 IDL instructions:', IDL_JSON.instructions?.map((i: any) => i.name));
        console.log('🔍 Program.methods object:', prog.methods);
        console.log('🔍 Program.account object:', prog.account);
        console.log('🔍 Full program object keys:', Object.keys(prog));
        
        setProgram(prog);
      } catch (error) {
        console.error('❌ Error initializing program:', error);
        setProgram(null);
      }
    } else {
      setProgram(null);
    }
  }, [wallet.connected, wallet.publicKey, connection]);

  // Helper function to get PDAs
  const getHousePDA = useCallback(() => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("house")],
      PROGRAM_ID
    );
    return pda;
  }, []);

  const getPlayerVaultPDA = useCallback((owner: PublicKey) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("player_vault"), owner.toBuffer()],
      PROGRAM_ID
    );
    return pda;
  }, []);

  const getTableVaultPDA = useCallback((tableId: number) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("table_vault"), new BN(tableId).toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );
    return pda;
  }, []);

  // NEW: Dealer PDA function
  const getDealerPDA = useCallback((tableId: number) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("dealer"), new BN(tableId).toArrayLike(Buffer, 'le', 8)],
      PROGRAM_ID
    );
    return pda;
  }, []);

  const getTableCounterPDA = useCallback(() => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("table_counter")],
      PROGRAM_ID
    );
    return pda;
  }, []);

  const getTemplatePDA = useCallback((name: string) => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("table_template"), Buffer.from(name)],
      PROGRAM_ID
    );
    return pda;
  }, []);

  // Fetch functions with better error handling
  const fetchHouseAccount = useCallback(async () => {
    if (!program) return null;
    
    try {
      const housePDA = getHousePDA();
      
      // Debug: Check what account types are available
      console.log('🔍 Available account types:', Object.keys(program.account || {}));
      
      // Use camelCase as confirmed from logs
      const account = await (program.account as any).house.fetch(housePDA);
      
      return account;
    } catch (error) {
      // If account doesn't exist, return null instead of throwing
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        console.log('House account does not exist yet');
        return null;
      }
      console.error('Error fetching house account:', error);
      return null;
    }
  }, [program, getHousePDA]);

  const fetchPlayerVault = useCallback(async (owner: PublicKey) => {
    if (!program) return null;
    
    try {
      const playerVaultPDA = getPlayerVaultPDA(owner);
      
      // Use camelCase as confirmed from logs
      const account = await (program.account as any).playerVault.fetch(playerVaultPDA);
      
      return account;
    } catch (error) {
      // If account doesn't exist, return null instead of throwing
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        console.log('PlayerVault account does not exist yet');
        return null;
      }
      console.error('Error fetching player vault:', error);
      return null;
    }
  }, [program, getPlayerVaultPDA]);

  // NEW: Fetch PlayerVault by PDA directly (for getting owner addresses of other players)
  const fetchPlayerVaultByPDA = useCallback(async (playerVaultPDA: PublicKey) => {
    if (!program) return null;
    
    try {
      // Directly use the provided PDA instead of deriving it
      const account = await (program.account as any).playerVault.fetch(playerVaultPDA);
      
      return account;
    } catch (error) {
      // If account doesn't exist, return null instead of throwing
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        console.log('PlayerVault account (by PDA) does not exist');
        return null;
      }
      console.error('Error fetching player vault by PDA:', error);
      return null;
    }
  }, [program]);

  const fetchTableVault = useCallback(async (tableId: number) => {
    if (!program) return null;
    
    try {
      const tableVaultPDA = getTableVaultPDA(tableId);
      
      // Use camelCase as confirmed from logs
      const account = await (program.account as any).tableVault.fetch(tableVaultPDA);
      
      return account;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        return null;
      }
      console.error('Error fetching table vault:', error);
      return null;
    }
  }, [program, getTableVaultPDA]);

  // NEW: Fetch Dealer account
  const fetchDealer = useCallback(async (tableId: number) => {
    if (!program) return null;
    
    try {
      const dealerPDA = getDealerPDA(tableId);
      
      // Use camelCase as confirmed from logs
      const account = await (program.account as any).dealer.fetch(dealerPDA);
      
      return account;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        console.log(`Dealer for table ${tableId} does not exist yet`);
        return null;
      }
      console.error('Error fetching dealer:', error);
      return null;
    }
  }, [program, getDealerPDA]);

  const fetchAllTables = useCallback(async () => {
    if (!program) return [];
    
    try {
      // First, get the table counter to know how many tables exist
      const tableCounterPDA = getTableCounterPDA();
      let maxTableId = 0;
      
      try {
        // Use camelCase as confirmed from logs
        const counter = await (program.account as any).tableCounter.fetch(tableCounterPDA);
        
        if (!counter) {
          console.log('TableCounter account type not found or not initialized');
          return [];
        }
        
        // Handle BN object for count
        if (typeof counter.count === 'object' && counter.count.toNumber) {
          maxTableId = counter.count.toNumber();
        } else {
          maxTableId = Number(counter.count);
        }
        
        console.log(`📊 Found ${maxTableId} tables in counter`);
      } catch (error) {
        console.log('Table counter not initialized');
        return [];
      }

      // Fetch all tables up to the counter
      const tables = [];
      for (let i = 0; i < maxTableId; i++) {
        try {
          const table = await fetchTableVault(i);
          if (table) {
            console.log(`✅ Fetched table ${i}:`, {
              tableId: table.tableId,
              players: table.players,
              player_count: table.players ? table.players.filter((p: any) => p !== null).length : 0
            });
            
            tables.push(table);
          } else {
            console.log(`❌ Table ${i} not found or doesn't exist`);
          }
        } catch (error) {
          console.error(`Error fetching table ${i}:`, error);
        }
      }
      
      console.log(`📋 Successfully fetched ${tables.length} tables`);
      return tables;
    } catch (error) {
      console.error('Error fetching all tables:', error);
      return [];
    }
  }, [program, getTableCounterPDA, fetchTableVault]);

  const fetchTemplate = useCallback(async (name: string) => {
    if (!program) return null;
    
    try {
      const templatePDA = getTemplatePDA(name);
      
      // Use camelCase as confirmed from logs
      const account = await (program.account as any).tableTemplate.fetch(templatePDA);
      
      return account;
    } catch (error) {
      if (error instanceof Error && error.message.includes('Account does not exist')) {
        console.log(`Template '${name}' does not exist yet`);
        return null;
      }
      console.error('Error fetching template:', error);
      return null;
    }
  }, [program, getTemplatePDA]);

  // Helper function to find method (camelCase or snake_case)
  const findMethod = useCallback((methodName: string) => {
    if (!program) throw new Error('Program not initialized');
    
    // Convert snake_case to camelCase
    const camelCaseName = methodName.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
    
    if (camelCaseName in program.methods) {
      console.log(`✅ Using camelCase: ${camelCaseName}`);
      return (program.methods as any)[camelCaseName];
    } else if (methodName in program.methods) {
      console.log(`✅ Using snake_case: ${methodName}`);
      return (program.methods as any)[methodName];
    } else {
      console.error(`❌ Method not found: ${methodName} / ${camelCaseName}`);
      console.log('Available methods:', Object.keys(program.methods));
      throw new Error(`Method not found: ${methodName}`);
    }
  }, [program]);

  // Transaction functions
  const initializeHouse = useCallback(async () => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    
    console.log('🔍 Trying to call initializeHouse...');
    console.log('🔍 Available methods:', Object.keys(program.methods));
    
    const housePDA = getHousePDA();
    
    try {
      const methodToCall = findMethod('initialize_house');
      
      const tx = await methodToCall()
        .accounts({
          house: housePDA,
          authority: wallet.publicKey,
          system_program: SystemProgram.programId,
        })
        .rpc();
      
      return tx;
    } catch (error) {
      console.error('🚨 Error calling initializeHouse:', error);
      throw error;
    }
  }, [program, wallet.publicKey, getHousePDA, findMethod]);

  const initializeChallengerTemplate = useCallback(async () => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    
    const templatePDA = getTemplatePDA('challenger');
    
    const methodToCall = findMethod('initialize_challenger_template');
    const tx = await methodToCall()
      .accounts({
        template: templatePDA,
        authority: wallet.publicKey,
        system_program: SystemProgram.programId,
      })
      .rpc();
    
    return tx;
  }, [program, wallet.publicKey, getTemplatePDA, findMethod]);

  const depositSol = useCallback(async (amount: number) => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    
    const playerVaultPDA = getPlayerVaultPDA(wallet.publicKey);
    const lamports = new BN(amount * LAMPORTS_PER_SOL);
    
    const methodToCall = findMethod('deposit_sol');
    const tx = await methodToCall(lamports)
      .accounts({
        playerVault: playerVaultPDA,
        owner: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    return tx;
  }, [program, wallet.publicKey, getPlayerVaultPDA, findMethod]);

  const withdrawSol = useCallback(async (amount: number) => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    
    const playerVaultPDA = getPlayerVaultPDA(wallet.publicKey);
    const lamports = new BN(amount * LAMPORTS_PER_SOL);
    
    const methodToCall = findMethod('withdraw_sol');
    const tx = await methodToCall(lamports)
      .accounts({
        playerVault: playerVaultPDA,
        owner: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    return tx;
  }, [program, wallet.publicKey, getPlayerVaultPDA, findMethod]);

  const openChallengerTable = useCallback(async () => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    
    const tableCounterPDA = getTableCounterPDA();
    const templatePDA = getTemplatePDA('challenger');
    const playerVaultPDA = getPlayerVaultPDA(wallet.publicKey);
    const housePDA = getHousePDA();
    
    // Get current table count - this should be the NEXT table ID to use
    let tableId = 0;
    try {
      const counter = await (program.account as any).tableCounter.fetch(tableCounterPDA);
      // The counter.count represents how many tables have been created
      // So the next table ID should be counter.count (not counter.count - 1)
      tableId = counter.count.toNumber();
      console.log(`🎯 Creating new table with ID: ${tableId} (counter shows ${counter.count.toNumber()} tables created)`);
    } catch (error) {
      // Counter doesn't exist yet, will be created with ID 0
      console.log('📊 Table counter not found, creating first table with ID 0');
      tableId = 0;
    }
    
    const tableVaultPDA = getTableVaultPDA(tableId);
    const dealerPDA = getDealerPDA(tableId);
    
    const methodToCall = findMethod('open_challenger_table');
    
    // Use minimal accounts - let Anchor resolve the rest
    const tx = await methodToCall()
      .accounts({
        tableCounter: tableCounterPDA,
        template: templatePDA,
        tableVault: tableVaultPDA,
        dealer: dealerPDA,
        playerVault: playerVaultPDA,
        house: housePDA,
        creator: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    return { tx, tableId };
  }, [program, wallet.publicKey, getTableCounterPDA, getTemplatePDA, getPlayerVaultPDA, getHousePDA, getTableVaultPDA, getDealerPDA, findMethod]);

  const joinGame = useCallback(async (tableId: number) => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    
    const tableVaultPDA = getTableVaultPDA(tableId);
    const playerVaultPDA = getPlayerVaultPDA(wallet.publicKey);
    const housePDA = getHousePDA();
    
    const methodToCall = findMethod('join_game');
    const tx = await methodToCall(new BN(tableId))
      .accounts({
        tableVault: tableVaultPDA,
        playerVault: playerVaultPDA,
        house: housePDA,
        player: wallet.publicKey,
      })
      .rpc();
    
    return tx;
  }, [program, wallet.publicKey, getTableVaultPDA, getPlayerVaultPDA, getHousePDA, findMethod]);

  const depositToGame = useCallback(async (tableId: number, buyInAmount: number) => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    
    const tableVaultPDA = getTableVaultPDA(tableId);
    const dealerPDA = getDealerPDA(tableId);
    const playerVaultPDA = getPlayerVaultPDA(wallet.publicKey);
    const housePDA = getHousePDA();
    const lamports = new BN(buyInAmount * LAMPORTS_PER_SOL);
    
    const methodToCall = findMethod('deposit_to_game');
    const tx = await methodToCall(lamports)
      .accounts({
        tableVault: tableVaultPDA,
        dealer: dealerPDA,
        playerVault: playerVaultPDA,
        house: housePDA,
        player: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    return tx;
  }, [program, wallet.publicKey, getTableVaultPDA, getDealerPDA, getPlayerVaultPDA, getHousePDA, findMethod]);

  const leaveTable = useCallback(async (tableId: number) => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    
    const tableVaultPDA = getTableVaultPDA(tableId);
    const dealerPDA = getDealerPDA(tableId);
    const playerVaultPDA = getPlayerVaultPDA(wallet.publicKey);
    const housePDA = getHousePDA();
    
    const methodToCall = findMethod('leave_table');
    const tx = await methodToCall()
      .accounts({
        tableVault: tableVaultPDA,
        dealer: dealerPDA,
        playerVault: playerVaultPDA,
        house: housePDA,
        player: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    return tx;
  }, [program, wallet.publicKey, getTableVaultPDA, getDealerPDA, getPlayerVaultPDA, getHousePDA, findMethod]);

  const withdrawFromHouse = useCallback(async (amount: number, destination: PublicKey) => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    
    const housePDA = getHousePDA();
    const lamports = new BN(amount * LAMPORTS_PER_SOL);
    
    const methodToCall = findMethod('withdraw_from_house');
    const tx = await methodToCall(lamports)
      .accounts({
        house: housePDA,
        authority: wallet.publicKey,
        destination: destination,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    
    return tx;
  }, [program, wallet.publicKey, getHousePDA, findMethod]);

  const collectRent = useCallback(async (tableId: number) => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    
    const tableVaultPDA = getTableVaultPDA(tableId);
    const dealerPDA = getDealerPDA(tableId);
    const housePDA = getHousePDA();
    
    const methodToCall = findMethod('collect_rent');
    const tx = await methodToCall()
      .accounts({
        tableVault: tableVaultPDA,
        dealer: dealerPDA,
        house: housePDA,
        authority: wallet.publicKey,
      })
      .rpc();
    
    return tx;
  }, [program, wallet.publicKey, getTableVaultPDA, getDealerPDA, getHousePDA, findMethod]);

  // NEW: Redistribute tokens function
  const redistributeTokens = useCallback(async (tableId: number, newBalances: PlayerTokenBalance[]) => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    
    const dealerPDA = getDealerPDA(tableId);
    const tableVaultPDA = getTableVaultPDA(tableId);
    const housePDA = getHousePDA();
    
    // Convert to the format expected by the program
    const formattedBalances = newBalances.map(balance => ({
      playerVaultPda: balance.playerVaultPda,
      tokens: new BN(balance.tokens)
    }));
    
    const methodToCall = findMethod('redistribute_tokens');
    const tx = await methodToCall(formattedBalances)
      .accounts({
        dealer: dealerPDA,
        tableVault: tableVaultPDA,
        house: housePDA,
        authority: wallet.publicKey,
      })
      .rpc();
    
    return tx;
  }, [program, wallet.publicKey, getDealerPDA, getTableVaultPDA, getHousePDA, findMethod]);

  // NEW: Kick out player function
  const kickOutPlayer = useCallback(async (tableId: number, playerVaultPda: PublicKey, playerOwner: PublicKey) => {
    if (!program || !wallet.publicKey) throw new Error('Wallet not connected');
    
    const dealerPDA = getDealerPDA(tableId);
    const tableVaultPDA = getTableVaultPDA(tableId);
    const housePDA = getHousePDA();
    
    const methodToCall = findMethod('kick_out_player');
    const tx = await methodToCall(playerVaultPda, playerOwner)
      .accounts({
        dealer: dealerPDA,
        tableVault: tableVaultPDA,
        playerVault: playerVaultPda,
        house: housePDA,
        playerOwner: playerOwner,
        authority: wallet.publicKey,
      })
      .rpc();
    
    return tx;
  }, [program, wallet.publicKey, getDealerPDA, getTableVaultPDA, getHousePDA, findMethod]);

  return {
    connected: !!program,
    program,
    
    // PDA helpers
    getHousePDA,
    getPlayerVaultPDA,
    getTableVaultPDA,
    getDealerPDA,
    getTableCounterPDA,
    getTemplatePDA,
    
    // Fetch functions
    fetchHouseAccount,
    fetchPlayerVault,
    fetchPlayerVaultByPDA,
    fetchTableVault,
    fetchDealer,
    fetchAllTables,
    fetchTemplate,
    
    // Transaction functions
    initializeHouse,
    initializeChallengerTemplate,
    depositSol,
    withdrawSol,
    openChallengerTable,
    joinGame,
    depositToGame,
    leaveTable,
    withdrawFromHouse,
    collectRent,
    redistributeTokens,
    kickOutPlayer,
  };
}; 
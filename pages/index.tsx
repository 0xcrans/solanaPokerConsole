import React, { useState, useEffect, useRef } from 'react';
import { PublicKey, SystemProgram, Connection, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import WalletButton from '../components/WalletButton';
import { usePokerProgram } from '../hooks/usePokerProgram';
import { 
  HouseInfo, 
  TemplateInfo, 
  PlayerVaultInfo, 
  TableInfo,
  DealerInfo,
  PlayerTokenBalance,
  PlayerTokenEntry,
  StatusType,
  convertHouseAccountToInfo,
  convertPlayerVaultAccountToInfo,
  convertTableVaultAccountToInfo,
  convertTemplateAccountToInfo,
  convertDealerAccountToInfo
} from '../types';

// Constants
const PROGRAM_ID = new PublicKey('3VWxtZ5CCjG2eKH1FNQxDkCKU57QMk5SZ61Gx6pcsHne');
const connection = new Connection(clusterApiUrl('devnet'));

const PokerContractConsole = () => {
  const { connected, publicKey, disconnect } = useWallet();
  const pokerProgram = usePokerProgram();
  
  // Global state
  const [activeTab, setActiveTab] = useState<'admin' | 'player' | 'table'>('admin');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Data state - organized by blockchain structures
  const [houseInfo, setHouseInfo] = useState<HouseInfo | null>(null);
  const [templateInfo, setTemplateInfo] = useState<TemplateInfo | null>(null);
  const [playerVaultInfo, setPlayerVaultInfo] = useState<PlayerVaultInfo | null>(null);
  const [tables, setTables] = useState<TableInfo[]>([]);
  const [dealers, setDealers] = useState<Map<number, DealerInfo>>(new Map());
  const [tableCounter, setTableCounter] = useState<number>(0);
  const [tablesDetail, setTablesDetail] = useState<any[]>([]); // NEW: Store full table data
  
  // Admin/House state
  const [withdrawAmount, setWithdrawAmount] = useState<string>('');
  const [withdrawDestination, setWithdrawDestination] = useState<string>('');
  const [collectTableId, setCollectTableId] = useState<string>('');
  
  // Player Vault state
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [playerWithdrawAmount, setPlayerWithdrawAmount] = useState<string>('');
  
  // Table Vault state
  const [joinTableId, setJoinTableId] = useState<string>('');
  const [buyInAmount, setBuyInAmount] = useState<string>('');
  const [selectedTable, setSelectedTable] = useState<TableInfo | null>(null);
  
  // Dealer state
  const [redistributeTableId, setRedistributeTableId] = useState<string>('');
  const [redistributeBalances, setRedistributeBalances] = useState<Array<{ playerVaultPda: string; tokens: string }>>([]);
  const [kickPlayerTableId, setKickPlayerTableId] = useState<string>('');
  const [kickPlayerPda, setKickPlayerPda] = useState<string>('');
  const [kickPlayerOwner, setKickPlayerOwner] = useState<string>('');
  const [selectedDealer, setSelectedDealer] = useState<DealerInfo | null>(null);
  
  // NEW: State for storing player owner addresses
  const [playerOwners, setPlayerOwners] = useState<Map<string, string>>(new Map());
  
  const [copied, setCopied] = useState<string>('');
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  // Utility functions
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(''), 2000);
    });
  };

  const formatSOL = (lamports: number) => {
    return (lamports / 1e9).toFixed(4);
  };

  const formatTokens = (tokens: number) => {
    return tokens.toLocaleString();
  };

  const getDisplayTableId = (playerVaultInfo: PlayerVaultInfo | null): string => {
    if (!playerVaultInfo?.exists || !playerVaultInfo.isSeated) {
      return 'Not seated';
    }
    
    if (playerVaultInfo.currentTableId === null || playerVaultInfo.currentTableId === undefined) {
      return 'unknown';
    }
    
    return `#${playerVaultInfo.currentTableId}`;
  };

  // Transaction wrapper
  const executeTransaction = async (operation: string, txFunction: () => Promise<string>) => {
    setLoading(true);
    setError('');
    
    try {
      console.log(`🚀 Starting ${operation}...`);
      const txHash = await txFunction();
      console.log(`✅ ${operation} successful! Transaction: ${txHash}`);
      
      await connection.confirmTransaction(txHash, 'confirmed');
      await new Promise(resolve => setTimeout(resolve, 1000));
      await refreshData();
      
      return txHash;
    } catch (err) {
      const error = err as Error;
      let userMessage = '';
      
      if (error.name === 'WalletSignTransactionError' || 
          error.message.includes('User rejected') ||
          error.message.includes('user rejected')) {
        userMessage = 'Transaction cancelled by user';
        console.log(`🚫 ${operation} cancelled: User rejected the transaction`);
      } else if (error.message.includes('insufficient funds') || 
               error.message.includes('Insufficient funds')) {
        userMessage = 'Insufficient SOL balance for transaction';
        console.log(`❌ ${operation} failed: Insufficient funds`);
      } else if (error.message.includes('Account does not exist') ||
               error.message.includes('could not find account')) {
        userMessage = 'Required account not found - may need to initialize first';
        console.log(`❌ ${operation} failed: Account not found`);
      } else if (error.message.includes('Program log:') || 
               error.message.includes('custom program error:')) {
        userMessage = `Smart contract error: ${error.message.split('Program log:')[1]?.trim() || error.message}`;
        console.log(`❌ ${operation} failed: ${userMessage}`);
      } else {
        userMessage = error.message || 'Transaction failed';
        console.log(`❌ ${operation} failed: ${userMessage}`);
      }
      
      setError(userMessage);
      
      if (error.name === 'WalletSignTransactionError' || 
          error.message.includes('User rejected') ||
          error.message.includes('user rejected')) {
        return null;
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Data refresh function - properly handles blockchain data
  const refreshData = async () => {
    if (!pokerProgram.connected) return;

    try {
      // Refresh House data
      const house = await pokerProgram.fetchHouseAccount();
      if (house) {
        const housePDA = pokerProgram.getHousePDA();
        const houseAccountInfo = await connection.getAccountInfo(housePDA);
        const houseBalance = houseAccountInfo ? houseAccountInfo.lamports / LAMPORTS_PER_SOL : 0;
        
        const houseInfo = convertHouseAccountToInfo(house, publicKey || undefined);
        houseInfo.balance = houseBalance;
        setHouseInfo(houseInfo);
      } else {
        setHouseInfo({ exists: false });
      }

      // Refresh PlayerVault data
      if (publicKey) {
        const playerVault = await pokerProgram.fetchPlayerVault(publicKey);
        
        if (playerVault) {
          const playerVaultPDA = pokerProgram.getPlayerVaultPDA(publicKey);
          const accountInfo = await connection.getAccountInfo(playerVaultPDA);
          const actualBalance = accountInfo ? accountInfo.lamports / LAMPORTS_PER_SOL : 0;
          
          const convertedInfo = convertPlayerVaultAccountToInfo(playerVault, actualBalance);
          
          setPlayerVaultInfo(convertedInfo);
        } else {
          setPlayerVaultInfo({ exists: false });
        }
      }

      // DEBUG: Check table counter first
      try {
        const tableCounterPDA = pokerProgram.getTableCounterPDA();
        const accountInfo = await connection.getAccountInfo(tableCounterPDA);
        if (accountInfo) {
          try {
            // Use the pokerProgram's internal program instance to fetch tableCounter
            const counter = await (pokerProgram.program?.account as any)?.tableCounter?.fetch(tableCounterPDA);
            if (counter) {
              const counterValue = counter.count?.toNumber ? counter.count.toNumber() : counter.count;
              setTableCounter(counterValue);
            }
          } catch (e) {
            console.log('🎯 Could not parse TableCounter data:', e);
          }
        } else {
          setTableCounter(0);
        }
      } catch (error) {
        console.log('🎯 Error checking TableCounter:', error);
        setTableCounter(0);
      }

      // Refresh tables data
      const allTables = await pokerProgram.fetchAllTables();
      
      const tableData: TableInfo[] = await Promise.all(
        allTables.map(async (table) => {
          const tableInfo = convertTableVaultAccountToInfo(table);
          
          // Use the tableId from converted info (which handles BN conversion)
          const tableVaultPDA = pokerProgram.getTableVaultPDA(tableInfo.id);
          const tableAccountInfo = await connection.getAccountInfo(tableVaultPDA);
          tableInfo.balance = tableAccountInfo ? tableAccountInfo.lamports / LAMPORTS_PER_SOL : 0;
          
          return tableInfo;
        })
      );
      setTables(tableData);

      // Refresh dealers data
      const dealersMap = new Map<number, DealerInfo>();
      const ownersMap = new Map<string, string>();
      const tablesDetailMap = new Map<number, any>(); // NEW: Store full table data
      
      for (const table of allTables) {
        // Convert table to get proper ID
        const tableInfo = convertTableVaultAccountToInfo(table);
        
        // Store full table data for Dealer Functions hybrid view
        tablesDetailMap.set(tableInfo.id, table);
        
        const dealer = await pokerProgram.fetchDealer(tableInfo.id);
        if (dealer) {
          const dealerInfo = convertDealerAccountToInfo(dealer, publicKey || undefined);
          dealersMap.set(tableInfo.id, dealerInfo);
          
          // Fetch owner addresses for all players in this dealer
          if (dealer.playersTokens) {
            for (const playerEntry of dealer.playersTokens) {
              if (playerEntry.playerVaultPda) {
                const pdaString = playerEntry.playerVaultPda.toString();
                
                // Skip if we already have this owner address
                if (!ownersMap.has(pdaString)) {
                  try {
                    const playerVaultData = await pokerProgram.fetchPlayerVaultByPDA(playerEntry.playerVaultPda);
                    if (playerVaultData && playerVaultData.owner) {
                      ownersMap.set(pdaString, playerVaultData.owner.toString());
                    }
                  } catch (error) {
                    console.log(`❌ Failed to fetch owner for PDA ${pdaString.slice(0, 8)}...:`, error);
                  }
                }
              }
            }
          }
        }
        
        // NEW: Fetch owner addresses for ALL seated players in TableVault (not just those with tokens)
        if (table.players) {
          for (const playerPda of table.players) {
            if (playerPda) {
              const pdaString = playerPda.toString();
              
              // Skip if we already have this owner address
              if (!ownersMap.has(pdaString)) {
                try {
                  const playerVaultData = await pokerProgram.fetchPlayerVaultByPDA(playerPda);
                  if (playerVaultData && playerVaultData.owner) {
                    ownersMap.set(pdaString, playerVaultData.owner.toString());
                  }
                } catch (error) {
                  console.log(`❌ Failed to fetch owner for TableVault player ${pdaString.slice(0, 8)}...:`, error);
                }
              }
            }
          }
        }
      }
      setDealers(dealersMap);
      setPlayerOwners(ownersMap);
      
      // NEW: Store tables detail data for Dealer Functions
      const tablesDetailData = Array.from(tablesDetailMap.entries()).map(([tableId, tableData]) => ({
        tableId,
        tableData
      }));
      setTablesDetail(tablesDetailData);

      // Check template
      const template = await pokerProgram.fetchTemplate('challenger');
      if (template) {
        setTemplateInfo(convertTemplateAccountToInfo(template));
      } else {
        setTemplateInfo({ exists: false });
      }
    } catch (err) {
      console.error('Error refreshing data:', err);
      console.log(`⚠️ Error refreshing data: ${(err as Error).message}`);
    }
  };

  // === ADMIN/HOUSE/DEALER FUNCTIONS ===
  
  const checkHouseAccount = async () => {
    if (!connected) return;
    console.log('🏛️ Checking House account...');
    await refreshData();
  };

  const initializeHouse = async () => {
    if (!connected || !publicKey) return;
    
    await executeTransaction('Initialize House', async () => {
      return await pokerProgram.initializeHouse();
    });
  };

  const initializeTemplate = async () => {
    if (!connected) return;
    
    await executeTransaction('Initialize Challenger Template', async () => {
      return await pokerProgram.initializeChallengerTemplate();
    });
  };

  const withdrawFromHouse = async () => {
    if (!withdrawAmount || !withdrawDestination) {
      setError('Please enter amount and destination');
      return;
    }
    
    try {
      const destinationPubkey = new PublicKey(withdrawDestination);
      await executeTransaction(`Withdraw ${withdrawAmount} SOL from House`, async () => {
        return await pokerProgram.withdrawFromHouse(parseFloat(withdrawAmount), destinationPubkey);
      });
      setWithdrawAmount('');
      setWithdrawDestination('');
    } catch (err) {
      setError('Invalid destination address');
    }
  };

  const collectRent = async () => {
    if (!collectTableId) {
      setError('Please enter table ID');
      return;
    }
    
    await executeTransaction(`Collect rent from table ${collectTableId}`, async () => {
      return await pokerProgram.collectRent(parseInt(collectTableId));
    });
    setCollectTableId('');
  };

  const redistributeTokens = async () => {
    if (!redistributeTableId) {
      setError('Please enter table ID');
      return;
    }

    const tableId = parseInt(redistributeTableId);
    
    // Convert string inputs to proper PlayerTokenBalance format
    const newBalances: PlayerTokenBalance[] = redistributeBalances
      .filter(balance => balance.playerVaultPda && balance.tokens)
      .map(balance => {
        try {
          return {
            playerVaultPda: new PublicKey(balance.playerVaultPda),
            tokens: parseInt(balance.tokens)
          };
        } catch (err) {
          throw new Error(`Invalid player PDA: ${balance.playerVaultPda}`);
        }
      });

    if (newBalances.length === 0) {
      setError('Please add at least one player token balance');
      return;
    }

    await executeTransaction(`Redistribute tokens for table ${tableId}`, async () => {
      return await pokerProgram.redistributeTokens(tableId, newBalances);
    });
    setRedistributeTableId('');
    setRedistributeBalances([]);
  };

  const kickPlayer = async () => {
    if (!kickPlayerTableId || !kickPlayerPda || !kickPlayerOwner) {
      setError('Please enter table ID, player PDA, and player owner');
      return;
    }

    try {
      const playerPubkey = new PublicKey(kickPlayerPda);
      const playerOwnerPubkey = new PublicKey(kickPlayerOwner);
      const tableId = parseInt(kickPlayerTableId);
      
      await executeTransaction(`Kick player from table ${tableId}`, async () => {
        return await pokerProgram.kickOutPlayer(tableId, playerPubkey, playerOwnerPubkey);
      });
      setKickPlayerTableId('');
      setKickPlayerPda('');
      setKickPlayerOwner('');
    } catch (err) {
      setError('Invalid player PDA or owner address');
    }
  };

  // === PLAYER VAULT FUNCTIONS ===
  
  const checkPlayerVault = async () => {
    if (!connected || !publicKey) return;
    console.log('💰 Checking your Player Vault...');
    await refreshData();
  };

  const depositSol = async () => {
    if (!depositAmount || parseFloat(depositAmount) < 0.12) {
      setError('Minimum deposit is 0.12 SOL');
      return;
    }
    
    try {
      const result = await executeTransaction(`Deposit ${depositAmount} SOL`, async () => {
        return await pokerProgram.depositSol(parseFloat(depositAmount));
      });
      
      if (result) {
        setDepositAmount('');
        console.log(`💰 Deposit completed successfully`);
      } else {
        console.log(`ℹ️ Deposit cancelled - you can try again anytime`);
      }
    } catch (err) {
      console.error('Deposit error:', err);
    }
  };

  const withdrawSol = async () => {
    if (!playerWithdrawAmount) {
      setError('Please enter withdraw amount');
      return;
    }
    
    try {
      const result = await executeTransaction(`Withdraw ${playerWithdrawAmount} SOL`, async () => {
        return await pokerProgram.withdrawSol(parseFloat(playerWithdrawAmount));
      });
      
      if (result) {
        setPlayerWithdrawAmount('');
        console.log(`💸 Withdrawal completed successfully`);
      } else {
        console.log(`ℹ️ Withdrawal cancelled - you can try again anytime`);
      }
    } catch (err) {
      console.error('Withdrawal error:', err);
    }
  };

  // === TABLE VAULT FUNCTIONS ===
  
  const fetchTables = async () => {
    console.log('📋 Fetching tables...');
    await refreshData();
  };

  const openChallengerTable = async () => {
    if (!connected) return;
    
    try {
      const result = await executeTransaction('Open Challenger Table', async () => {
        const response = await pokerProgram.openChallengerTable();
        console.log(`🎯 New table ${response.tableId} created! You are auto-joined as player 1`);
        return response.tx;
      });
      
      if (result) {
        console.log(`🎉 Table opened successfully!`);
      } else {
        console.log(`ℹ️ Table creation cancelled`);
      }
    } catch (err) {
      console.error('Open table error:', err);
    }
  };

  const joinGame = async () => {
    if (!joinTableId) {
      setError('Please enter table ID');
      return;
    }
    
    const tableId = parseInt(joinTableId);
    try {
      const result = await executeTransaction(`Join table ${tableId}`, async () => {
        return await pokerProgram.joinGame(tableId);
      });
      
      if (result) {
        setJoinTableId('');
        console.log(`🚪 Joined table successfully!`);
      } else {
        console.log(`ℹ️ Join cancelled`);
      }
    } catch (err) {
      console.error('Join game error:', err);
    }
  };

  const depositToGame = async () => {
    if (!buyInAmount || parseFloat(buyInAmount) < 0.1) {
      setError('Minimum buy-in is 0.1 SOL');
      return;
    }
    
    if (!playerVaultInfo?.isSeated || playerVaultInfo.currentTableId === null || playerVaultInfo.currentTableId === undefined) {
      setError('You must be seated at a table first');
      return;
    }
    
    // Check if player would exceed max buy-in (3 SOL total)
    const dealer = dealers.get(playerVaultInfo.currentTableId);
    const playerVaultPDA = publicKey ? pokerProgram.getPlayerVaultPDA(publicKey) : null;
    const playerTokens = dealer?.playersTokens?.find((p: PlayerTokenEntry) => 
      p.playerVaultPda && playerVaultPDA && p.playerVaultPda.equals(playerVaultPDA)
    );
    
    if (playerTokens) {
      const currentSOLValue = playerTokens.tokens / 10000;
      const newTotal = currentSOLValue + parseFloat(buyInAmount);
      
      if (newTotal > 3.0) {
        setError(`Would exceed max buy-in of 3 SOL. Current: ${formatSOL(currentSOLValue * 1e9)} SOL, Trying to add: ${buyInAmount} SOL`);
        return;
      }
    }
    
    console.log('🎯 Deposit to game - Player state:', {
      isSeated: playerVaultInfo.isSeated,
      currentTableId: playerVaultInfo.currentTableId,
      ready: playerVaultInfo.ready,
      currentTokens: playerTokens?.tokens || 0,
      buyInAmount: buyInAmount
    });
    
    const actionType = playerVaultInfo.ready ? 'Top-up' : 'Buy-in';
    
    await executeTransaction(`${actionType} ${buyInAmount} SOL`, async () => {
      return await pokerProgram.depositToGame(playerVaultInfo.currentTableId!, parseFloat(buyInAmount));
    });
    setBuyInAmount('');
  };

  const leaveTable = async () => {
    if (!playerVaultInfo?.isSeated || playerVaultInfo.currentTableId === null || playerVaultInfo.currentTableId === undefined) {
      setError('You are not seated at any table');
      return;
    }
    
    console.log('🚶 Leave table - Player state:', {
      isSeated: playerVaultInfo.isSeated,
      currentTableId: playerVaultInfo.currentTableId,
      ready: playerVaultInfo.ready
    });
    
    await executeTransaction(`Leave table ${playerVaultInfo.currentTableId}`, async () => {
      return await pokerProgram.leaveTable(playerVaultInfo.currentTableId!);
    });
  };

  // Auto-refresh data when connected
  useEffect(() => {
    if (connected && pokerProgram.connected) {
      refreshData();
    }
  }, [connected, pokerProgram.connected]);

  // Interface components
  interface StatusBadgeProps {
    status: StatusType;
    children: React.ReactNode;
  }

  const StatusBadge = ({ status, children }: StatusBadgeProps) => {
    const colors: Record<StatusType, string> = {
      success: 'bg-green-100 text-green-800',
      warning: 'bg-yellow-100 text-yellow-800',
      error: 'bg-red-100 text-red-800',
      info: 'bg-blue-100 text-blue-800'
    };
    
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[status]}`}>
        {children}
      </span>
    );
  };

  interface ActionButtonProps {
    onClick: () => void;
    disabled: boolean;
    variant?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary';
    children: React.ReactNode;
    className?: string;
  }

  const ActionButton = ({ onClick, disabled, variant = 'primary', children, className = '' }: ActionButtonProps) => {
    const variants = {
      primary: 'bg-blue-500 hover:bg-blue-600 text-white',
      success: 'bg-green-500 hover:bg-green-600 text-white',
      warning: 'bg-yellow-500 hover:bg-yellow-600 text-white',
      danger: 'bg-red-500 hover:bg-red-600 text-white',
      secondary: 'bg-gray-500 hover:bg-gray-600 text-white'
    };
    
    return (
      <button
        onClick={onClick}
        disabled={disabled || loading}
        className={`px-4 py-2 rounded font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      >
        {children}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                🎯 Poker Smart Contract Console
              </h1>
              <p className="text-gray-600">Comprehensive testing interface for Solana poker smart contract</p>
            </div>
            
            {/* Wallet Connection */}
            <div className="text-right">
              {!connected ? (
                <WalletButton />
              ) : (
                <div className="space-y-2">
                  <div className="text-sm">
                    <StatusBadge status="success">Connected</StatusBadge>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                      {publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}
                    </code>
                    <button
                      onClick={() => {
                        if (publicKey) {
                          copyToClipboard(publicKey.toString(), 'WALLET');
                        }
                      }}
                      className="text-xs bg-gray-200 px-2 py-1 rounded hover:bg-gray-300"
                    >
                      {copied === 'WALLET' ? '✓' : '📋'}
                    </button>
                    <ActionButton onClick={disconnect} disabled={false} variant="secondary" className="text-xs px-2 py-1">
                      Disconnect
                    </ActionButton>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          {/* Program Info */}
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="font-medium">Program ID:</span>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs bg-white px-2 py-1 rounded border">
                    {PROGRAM_ID.toString().slice(0, 20)}...
                  </code>
                  <button
                    onClick={() => copyToClipboard(PROGRAM_ID.toString(), 'PROGRAM')}
                    className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                  >
                    {copied === 'PROGRAM' ? '✓' : '📋'}
                  </button>
                </div>
              </div>
              <div>
                <span className="font-medium">Network:</span> Devnet<br/>
                <span className="font-medium">Framework:</span> Anchor
              </div>
              <div>
                <span className="font-medium">Status:</span> <StatusBadge status="success">Active</StatusBadge>
              </div>
            </div>
          </div>
        </div>

        {connected && (
          <>
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow-lg mb-6">
              <div className="flex border-b">
                {[
                  { id: 'admin' as const, label: '🏛️ Admin/House/Dealer', desc: 'House management, dealer operations & system administration' },
                  { id: 'player' as const, label: '💰 Player Vault', desc: 'Personal banking & vault management' },
                  { id: 'table' as const, label: '🎯 Table Vault', desc: 'Game tables & tournament management' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 p-4 text-left border-b-2 transition-colors ${
                      activeTab === tab.id 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{tab.label}</div>
                    <div className="text-sm text-gray-600">{tab.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Tab Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Main Content Area */}
              <div className="lg:col-span-2 space-y-6">
                
                {/* Admin Tab */}
                {activeTab === 'admin' && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                      🏛️ Admin/House/Dealer Functions
                      <StatusBadge status="warning">Authority Required</StatusBadge>
                    </h2>
                    
                    {/* House Status Section */}
                    <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-yellow-800">🏛️ House Account Status</h3>
                        <ActionButton onClick={checkHouseAccount} disabled={false} variant="warning" className="text-sm">
                          🔍 Check House
                        </ActionButton>
                      </div>
                      
                      {houseInfo ? (
                        houseInfo.exists ? (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>Balance:</strong> {formatSOL((houseInfo.balance || 0) * 1e9)} SOL</p>
                              <p><strong>Total Collected:</strong> {formatSOL((houseInfo.totalCollected || 0) * 1e9)} SOL</p>
                            </div>
                            <div>
                              <p><strong>Authority:</strong> {houseInfo.isYourAuthority ? 'YOU' : 'Other'}</p>
                              <p><strong>Status:</strong> <StatusBadge status="success">Active</StatusBadge></p>
                            </div>
                          </div>
                        ) : (
                          <p className="text-yellow-700">House not initialized</p>
                        )
                      ) : (
                        <p className="text-gray-600">Click "Check House" to verify status</p>
                      )}
                    </div>

                    {/* House Management Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      
                      {/* Initialize House */}
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">🏛️ Initialize House</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          One-time setup. Caller becomes House authority.
                        </p>
                        <ActionButton 
                          onClick={initializeHouse}
                          disabled={houseInfo?.exists || false}
                          variant="primary"
                          className="w-full"
                        >
                          Initialize House Account
                        </ActionButton>
                      </div>

                      {/* Initialize Template */}
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">📋 Initialize Challenger Template</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Create table template: 0.1-3.0 SOL buy-in, max 7 players.
                        </p>
                        <ActionButton 
                          onClick={initializeTemplate}
                          disabled={false}
                          variant="primary"
                          className="w-full"
                        >
                          Initialize Template
                        </ActionButton>
                        {templateInfo?.exists && (
                          <div className="mt-2 text-xs bg-green-50 p-2 rounded">
                            ✅ Challenger Template initialized
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Withdraw from House */}
                    <div className="mb-6 p-4 border rounded-lg">
                      <h3 className="font-semibold mb-2">💰 Withdraw from House</h3>
                      <p className="text-sm text-gray-600 mb-3">
                        Extract collected fees (Authority only).
                      </p>
                      
                      <div className="space-y-3">
                        <input
                          type="text"
                          value={withdrawDestination}
                          onChange={(e) => setWithdrawDestination(e.target.value)}
                          placeholder="Destination wallet address"
                          className="w-full p-3 border rounded-lg text-sm"
                        />
                        
                        <div className="flex gap-2">
                          {[0.1, 0.5, 1.0].map(amount => (
                            <button
                              key={amount}
                              onClick={() => setWithdrawAmount(amount.toString())}
                              className={`flex-1 p-2 border rounded text-sm ${
                                withdrawAmount === amount.toString() 
                                  ? 'bg-green-500 text-white' 
                                  : 'bg-gray-50 hover:bg-gray-100'
                              }`}
                            >
                              {amount} SOL
                            </button>
                          ))}
                        </div>
                        
                        <input
                          type="number"
                          value={withdrawAmount}
                          onChange={(e) => setWithdrawAmount(e.target.value)}
                          placeholder="Custom amount"
                          step="0.01"
                          min="0.01"
                          className="w-full p-3 border rounded-lg text-sm"
                        />
                        
                        <ActionButton 
                          onClick={withdrawFromHouse}
                          disabled={!withdrawAmount || !withdrawDestination || !(houseInfo?.isYourAuthority || false)}
                          variant="success"
                          className="w-full"
                        >
                          Withdraw from House
                        </ActionButton>
                      </div>
                    </div>

                    {/* Collect Rent */}
                    <div className="mb-6 p-4 border rounded-lg bg-blue-50 border-blue-200">
                      <h3 className="font-semibold mb-2 text-blue-700">💰 Collect Rent</h3>
                      <p className="text-sm text-blue-600 mb-3">
                        Close empty tables and collect rent (Authority only).
                      </p>
                      
                      <div className="space-y-3">
                        <input
                          type="number"
                          value={collectTableId}
                          onChange={(e) => setCollectTableId(e.target.value)}
                          placeholder="Table ID to collect rent from"
                          min="0"
                          className="w-full p-3 border border-blue-300 rounded-lg text-sm"
                        />
                        
                        <ActionButton 
                          onClick={collectRent}
                          disabled={!collectTableId || !(houseInfo?.isYourAuthority || false)}
                          variant="primary"
                          className="w-full"
                        >
                          💰 Collect Rent
                        </ActionButton>
                        
                        {!(houseInfo?.isYourAuthority || false) && (
                          <p className="text-xs text-blue-600">
                            ℹ️ Only House authority can collect rent
                          </p>
                        )}
                      </div>
                    </div>

                    {/* === DEALER FUNCTIONS SECTION === */}
                    <div className="border-t pt-6">
                      <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                        🃏 Dealer Functions
                        <StatusBadge status="info">Token Management</StatusBadge>
                      </h3>

                      {/* Dealers Overview */}
                      <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
                        <h4 className="font-semibold mb-2 text-purple-700">Active Dealers ({dealers.size})</h4>
                        
                        {dealers.size === 0 ? (
                          <p className="text-purple-600 text-sm">No active dealers found. Create tables to initialize dealers.</p>
                        ) : (
                          <div className="space-y-3">
                            {Array.from(dealers.entries()).map(([tableId, dealer]) => {
                              // Find corresponding table data
                              const tableDetail = tablesDetail.find(t => t.tableId === tableId);
                              const tableData = tableDetail?.tableData;
                              
                              return (
                                <div key={tableId} className="bg-white p-3 rounded border">
                                  
                                  <div className="flex justify-between items-center mb-2">
                                    <span className="font-medium text-lg">Table #{tableId}</span>
                                    <button
                                      onClick={() => setSelectedDealer(dealer)}
                                      className="text-xs bg-purple-500 text-white px-2 py-1 rounded hover:bg-purple-600"
                                    >
                                      View Details
                                    </button>
                                  </div>
                                  
                                  <div className="text-xs text-gray-600 mb-2">
                                    <p><strong>Total Tokens:</strong> {formatTokens(dealer.totalTokensIssued || 0)}</p>
                                    <p><strong>Players with Tokens:</strong> {dealer.playersTokens?.filter((p: PlayerTokenEntry) => p.playerVaultPda !== null && p.playerVaultPda !== undefined).length || 0}</p>
                                    <p><strong>Seated Players:</strong> {tableData?.players ? tableData.players.filter((p: any) => p !== null).length : 0}</p>
                                  </div>

                                  {/* HYBRID: Show ALL seated players from TableVault + their token status from Dealer */}
                                  <div className="border-t pt-2">
                                    <p className="text-xs font-medium text-gray-700 mb-1">👥 All Players (Seated + Tokens):</p>
                                    
                                    {!tableData?.players || tableData.players.filter((p: any) => p !== null).length === 0 ? (
                                      <p className="text-xs text-gray-500 italic">No players seated at this table</p>
                                    ) : (
                                      <div className="space-y-2">
                                        {tableData.players.filter((p: any) => p !== null).map((playerPda: any, index: number) => {
                                          // Find tokens for this player in Dealer
                                          const playerTokenEntry = dealer.playersTokens?.find((p: PlayerTokenEntry) => 
                                            p.playerVaultPda && p.playerVaultPda.equals(playerPda)
                                          );
                                          
                                          const hasTokens = playerTokenEntry && playerTokenEntry.tokens > 0;
                                          const tokens = playerTokenEntry?.tokens || 0;
                                          
                                          const isCurrentUser = publicKey && 
                                            playerPda.equals(pokerProgram.getPlayerVaultPDA(publicKey));
                                          
                                          return (
                                            <div key={index} className={`p-2 rounded text-xs border ${
                                              tokens === 0 ? 'bg-red-50 border-red-200' : hasTokens ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'
                                            }`}>
                                              <div className="flex justify-between items-start mb-1">
                                                <div className="flex items-center gap-2">
                                                  <span className="font-medium">
                                                    Player #{index + 1}
                                                    {isCurrentUser && <span className="text-blue-600 font-bold">(YOU)</span>}
                                                  </span>
                                                  <span className={`px-1 py-0.5 rounded text-xs ${
                                                    hasTokens ? 'bg-green-500 text-white' : 
                                                    tokens === 0 ? 'bg-red-500 text-white' : 
                                                    'bg-yellow-500 text-white'
                                                  }`}>
                                                    {hasTokens ? `${formatTokens(tokens)} TOKENS` : 
                                                     tokens === 0 ? '0 TOKENS' : 
                                                     'SEATED ONLY'}
                                                  </span>
                                                </div>
                                                <span className="font-medium">
                                                  {hasTokens ? formatSOL(tokens / 10000 * 1e9) + ' SOL' : 'No tokens'}
                                                </span>
                                              </div>
                                              
                                              <div className="space-y-1">
                                                {/* PlayerVault PDA */}
                                                <div>
                                                  <span className="text-gray-600">PlayerVault PDA:</span>
                                                  <div className="flex items-center gap-1 mt-0.5">
                                                    <code className="bg-white p-1 rounded border text-xs flex-1 break-all">
                                                      {playerPda.toString()}
                                                    </code>
                                                    <button
                                                      onClick={() => copyToClipboard(playerPda.toString(), `HYBRID_PLAYER_PDA_${tableId}_${index}`)}
                                                      className="bg-blue-500 text-white px-1 py-0.5 rounded text-xs hover:bg-blue-600"
                                                      title="Copy PlayerVault PDA"
                                                    >
                                                      {copied === `HYBRID_PLAYER_PDA_${tableId}_${index}` ? '✓' : '📋'}
                                                    </button>
                                                  </div>
                                                </div>
                                                
                                                {/* Owner Address */}
                                                <div>
                                                  <span className="text-gray-600">Owner Address:</span>
                                                  <div className="flex items-center gap-1 mt-0.5">
                                                    <code className="bg-white p-1 rounded border text-xs flex-1 break-all">
                                                      {isCurrentUser && publicKey ? 
                                                        publicKey.toString() : 
                                                        playerOwners.get(playerPda.toString()) || 'Loading owner...'
                                                      }
                                                    </code>
                                                    {((isCurrentUser && publicKey) || playerOwners.get(playerPda.toString())) && (
                                                      <button
                                                        onClick={() => {
                                                          const ownerAddress = isCurrentUser && publicKey ? 
                                                            publicKey.toString() : 
                                                            playerOwners.get(playerPda.toString());
                                                          if (ownerAddress) {
                                                            copyToClipboard(ownerAddress, `HYBRID_OWNER_${tableId}_${index}`);
                                                          }
                                                        }}
                                                        className="bg-green-500 text-white px-1 py-0.5 rounded text-xs hover:bg-green-600"
                                                        title="Copy Owner Address"
                                                      >
                                                        {copied === `HYBRID_OWNER_${tableId}_${index}` ? '✓' : '📋'}
                                                      </button>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                              
                                              {/* Quick Action Buttons */}
                                              <div className="flex gap-1 mt-2">
                                                {tokens === 0 && hasTokens === false && (houseInfo?.isYourAuthority || false) && (
                                                  <button
                                                    onClick={() => {
                                                      setKickPlayerTableId(tableId.toString());
                                                      setKickPlayerPda(playerPda.toString());
                                                      
                                                      const ownerAddress = isCurrentUser && publicKey ? 
                                                        publicKey.toString() : 
                                                        playerOwners.get(playerPda.toString());
                                                      
                                                      if (ownerAddress) {
                                                        setKickPlayerOwner(ownerAddress);
                                                      }
                                                    }}
                                                    className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                                                    title="Fill kick player form"
                                                  >
                                                    🚫 Use for Kick
                                                  </button>
                                                )}
                                                
                                                {hasTokens && (
                                                  <button
                                                    onClick={() => {
                                                      setRedistributeTableId(tableId.toString());
                                                      const exists = redistributeBalances.some(b => 
                                                        b.playerVaultPda === playerPda.toString()
                                                      );
                                                      if (!exists) {
                                                        setRedistributeBalances([
                                                          ...redistributeBalances,
                                                          {
                                                            playerVaultPda: playerPda.toString(),
                                                            tokens: tokens.toString()
                                                          }
                                                        ]);
                                                      }
                                                    }}
                                                    className="bg-purple-500 text-white px-2 py-1 rounded text-xs hover:bg-purple-600"
                                                    title="Add to redistribute form"
                                                  >
                                                    💰 Add to Redistribute
                                                  </button>
                                                )}
                                                
                                                <button
                                                  onClick={() => {
                                                    const ownerAddress = isCurrentUser && publicKey ? 
                                                      publicKey.toString() : 
                                                      playerOwners.get(playerPda.toString());
                                                    
                                                    const text = ownerAddress ? 
                                                      `Player #${index + 1} Details:\nPlayerVault PDA: ${playerPda.toString()}\nOwner: ${ownerAddress}\nTokens: ${tokens}\nSOL Value: ${formatSOL(tokens / 10000 * 1e9)} SOL\nTable ID: ${tableId}\nStatus: ${hasTokens ? 'Has Tokens' : tokens === 0 ? 'Seated Only' : 'Unknown'}` :
                                                      `Player #${index + 1} Details:\nPlayerVault PDA: ${playerPda.toString()}\nOwner: [LOADING]\nTokens: ${tokens}\nTable ID: ${tableId}`;
                                                    copyToClipboard(text, `HYBRID_FULL_INFO_${tableId}_${index}`);
                                                  }}
                                                  className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                                                  title="Copy full player info"
                                                >
                                                  {copied === `HYBRID_FULL_INFO_${tableId}_${index}` ? '✓' : '📄'} Copy All
                                                </button>
                                              </div>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      {/* Redistribute Tokens */}
                      <div className="mb-4 p-4 border rounded-lg">
                        <h4 className="font-semibold mb-2">💰 Redistribute Tokens</h4>
                        <p className="text-sm text-gray-600 mb-3">
                          Redistribute tokens after game round (sum must remain constant).
                        </p>
                        
                        <div className="space-y-3">
                          <input
                            type="number"
                            value={redistributeTableId}
                            onChange={(e) => setRedistributeTableId(e.target.value)}
                            placeholder="Table ID"
                            min="0"
                            className="w-full p-2 border rounded text-sm"
                          />
                          
                          {/* Dynamic balance inputs */}
                          <div className="space-y-2">
                            <div className="flex justify-between items-center">
                              <span className="text-sm font-medium">Player Token Balances:</span>
                              <button
                                onClick={() => setRedistributeBalances([...redistributeBalances, { playerVaultPda: '', tokens: '' }])}
                                className="text-xs bg-green-500 text-white px-2 py-1 rounded hover:bg-green-600"
                              >
                                Add Player
                              </button>
                            </div>
                            
                            {redistributeBalances.map((balance, index) => (
                              <div key={index} className="flex gap-2">
                                <input
                                  type="text"
                                  value={balance.playerVaultPda}
                                  onChange={(e) => {
                                    const newBalances = [...redistributeBalances];
                                    newBalances[index].playerVaultPda = e.target.value;
                                    setRedistributeBalances(newBalances);
                                  }}
                                  placeholder="Player Vault PDA"
                                  className="flex-1 p-2 border rounded text-xs"
                                />
                                <input
                                  type="number"
                                  value={balance.tokens}
                                  onChange={(e) => {
                                    const newBalances = [...redistributeBalances];
                                    newBalances[index].tokens = e.target.value;
                                    setRedistributeBalances(newBalances);
                                  }}
                                  placeholder="Tokens"
                                  className="w-24 p-2 border rounded text-xs"
                                />
                                <button
                                  onClick={() => {
                                    const newBalances = redistributeBalances.filter((_, i) => i !== index);
                                    setRedistributeBalances(newBalances);
                                  }}
                                  className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                                >
                                  ✕
                                </button>
                              </div>
                            ))}
                          </div>
                          
                          <ActionButton 
                            onClick={redistributeTokens}
                            disabled={!redistributeTableId || redistributeBalances.length === 0 || !(houseInfo?.isYourAuthority || false)}
                            variant="primary"
                            className="w-full"
                          >
                            💰 Redistribute Tokens
                          </ActionButton>
                        </div>
                      </div>

                      {/* Kick Player */}
                      <div className="p-4 border rounded-lg bg-red-50 border-red-200">
                        <h4 className="font-semibold mb-2 text-red-700">🚫 Kick Player (0 Tokens)</h4>
                        <p className="text-sm text-red-600 mb-3">
                          Remove player with 0 tokens from table (Authority only).
                        </p>
                        
                        <div className="space-y-3">
                          <input
                            type="number"
                            value={kickPlayerTableId}
                            onChange={(e) => setKickPlayerTableId(e.target.value)}
                            placeholder="Table ID"
                            min="0"
                            className="w-full p-2 border border-red-300 rounded text-sm"
                          />
                          
                          <input
                            type="text"
                            value={kickPlayerPda}
                            onChange={(e) => setKickPlayerPda(e.target.value)}
                            placeholder="Player Vault PDA"
                            className="w-full p-2 border border-red-300 rounded text-sm"
                          />
                          
                          <input
                            type="text"
                            value={kickPlayerOwner}
                            onChange={(e) => setKickPlayerOwner(e.target.value)}
                            placeholder="Player Owner"
                            className="w-full p-2 border border-red-300 rounded text-sm"
                          />
                          
                          <ActionButton 
                            onClick={kickPlayer}
                            disabled={!kickPlayerTableId || !kickPlayerPda || !kickPlayerOwner || !(houseInfo?.isYourAuthority || false)}
                            variant="danger"
                            className="w-full"
                          >
                            🚫 Kick Player (No Payout)
                          </ActionButton>
                          
                          {!(houseInfo?.isYourAuthority || false) && (
                            <p className="text-xs text-red-600">
                              ℹ️ Only House authority can kick players
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Player Vault Tab */}
                {activeTab === 'player' && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                      💰 Player Vault Functions
                      <StatusBadge status="success">Personal Banking</StatusBadge>
                    </h2>
                    
                    {/* Player Vault Status */}
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="font-semibold text-green-800">💰 Your Player Vault Status</h3>
                        <ActionButton onClick={checkPlayerVault} disabled={false} variant="success" className="text-sm">
                          🔍 Check Vault
                        </ActionButton>
                      </div>
                      
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700">Your PlayerVault PDA:</p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="bg-white p-2 rounded text-xs border flex-1 break-all">
                            {publicKey ? pokerProgram.getPlayerVaultPDA(publicKey)?.toString() || 'Error generating PDA' : 'Wallet not connected'}
                          </code>
                          <button
                            onClick={() => {
                              if (publicKey) {
                                const pda = pokerProgram.getPlayerVaultPDA(publicKey);
                                if (pda) copyToClipboard(pda.toString(), 'PLAYER_PDA');
                              }
                            }}
                            className="bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600"
                          >
                            {copied === 'PLAYER_PDA' ? '✓' : '📋'}
                          </button>
                        </div>
                      </div>

                      {playerVaultInfo ? (
                        playerVaultInfo.exists ? (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p><strong>Total Balance:</strong> {formatSOL((playerVaultInfo.totalBalance || 0) * 1e9)} SOL</p>
                              <p><strong>Available:</strong> {formatSOL((playerVaultInfo.availableBalance || 0) * 1e9)} SOL</p>
                              <p><strong>Buy-in Amount:</strong> {formatSOL((playerVaultInfo.buyInAmount || 0) * 1e9)} SOL</p>
                            </div>
                            <div>
                              <p><strong>Seated:</strong> {playerVaultInfo.isSeated ? 
                                `✅ Yes${playerVaultInfo.currentTableId !== null && playerVaultInfo.currentTableId !== undefined ? ` (Table #${playerVaultInfo.currentTableId})` : ''}` : 
                                '❌ No'}</p>
                              <p><strong>Ready:</strong> {playerVaultInfo.ready ? '✅ Ready to play' : '❌ Not ready'}</p>
                              <p><strong>Status:</strong> {playerVaultInfo.isSeated && playerVaultInfo.ready ? 
                                <StatusBadge status="success">In Game</StatusBadge> : 
                                <StatusBadge status="warning">Waiting</StatusBadge>}</p>
                            </div>
                          </div>
                        ) : (
                          <div className="text-yellow-700">
                            <p>PlayerVault doesn't exist. Make a deposit to create it.</p>
                            <div className="mt-2 p-2 bg-yellow-100 rounded text-xs">
                              <strong>First Deposit:</strong> Creates your PlayerVault automatically<br/>
                              <strong>Minimum:</strong> 0.12 SOL (includes rent + table creation buffer)
                            </div>
                          </div>
                        )
                      ) : (
                        <p className="text-gray-600">Click "Check Vault" to verify status</p>
                      )}
                    </div>

                    {/* Player Vault Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      
                      {/* Deposit SOL */}
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">💵 Deposit SOL</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Fund your personal vault. First deposit creates the account.
                        </p>
                        
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            {[0.12, 0.5, 1.0].map(amount => (
                              <button
                                key={amount}
                                onClick={() => setDepositAmount(amount.toString())}
                                className={`p-2 border rounded text-sm ${
                                  depositAmount === amount.toString() 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                              >
                                {amount} SOL
                              </button>
                            ))}
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2">
                            {[2.0, 5.0].map(amount => (
                              <button
                                key={amount}
                                onClick={() => setDepositAmount(amount.toString())}
                                className={`p-2 border rounded text-sm ${
                                  depositAmount === amount.toString() 
                                    ? 'bg-green-500 text-white' 
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                              >
                                {amount} SOL
                              </button>
                            ))}
                          </div>
                          
                          <input
                            type="number"
                            value={depositAmount}
                            onChange={(e) => setDepositAmount(e.target.value)}
                            placeholder="Custom amount (min 0.12 SOL)"
                            step="0.01"
                            min="0.12"
                            className="w-full p-3 border rounded-lg text-sm"
                          />
                          
                          <ActionButton 
                            onClick={depositSol}
                            disabled={!depositAmount || parseFloat(depositAmount) < 0.12}
                            variant="success"
                            className="w-full"
                          >
                            💵 Deposit SOL
                          </ActionButton>
                          
                          {depositAmount && parseFloat(depositAmount) < 0.12 && (
                            <p className="text-xs text-red-600">
                              ❌ Minimum deposit is 0.12 SOL
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Withdraw SOL */}
                      <div className="p-4 border rounded-lg">
                        <h3 className="font-semibold mb-2">💸 Withdraw SOL</h3>
                        <p className="text-sm text-gray-600 mb-3">
                          Withdraw from your PlayerVault to your wallet.
                        </p>
                        
                        <div className="space-y-3">
                          <div className="grid grid-cols-3 gap-2">
                            {[0.1, 0.5, 1.0].map(amount => (
                              <button
                                key={amount}
                                onClick={() => setPlayerWithdrawAmount(amount.toString())}
                                className={`p-2 border rounded text-sm ${
                                  playerWithdrawAmount === amount.toString() 
                                    ? 'bg-red-500 text-white' 
                                    : 'bg-gray-50 hover:bg-gray-100'
                                }`}
                              >
                                {amount} SOL
                              </button>
                            ))}
                          </div>

                          {/* Quick withdraw available balance */}
                          {playerVaultInfo?.exists && (playerVaultInfo.availableBalance || 0) > 0 && (
                            <button
                              onClick={() => setPlayerWithdrawAmount((playerVaultInfo.availableBalance || 0).toString())}
                              className={`w-full p-2 border rounded text-sm ${
                                playerWithdrawAmount === (playerVaultInfo.availableBalance || 0).toString()
                                  ? 'bg-yellow-500 text-white' 
                                  : 'bg-yellow-50 hover:bg-yellow-100 border-yellow-300'
                              }`}
                            >
                              Withdraw All Available ({formatSOL((playerVaultInfo.availableBalance || 0) * 1e9)} SOL)
                            </button>
                          )}
                          
                          <input
                            type="number"
                            value={playerWithdrawAmount}
                            onChange={(e) => setPlayerWithdrawAmount(e.target.value)}
                            placeholder="Custom amount"
                            step="0.01"
                            min="0.01"
                            className="w-full p-3 border rounded-lg text-sm"
                          />
                          
                          <ActionButton 
                            onClick={withdrawSol}
                            disabled={!playerWithdrawAmount || !(playerVaultInfo?.exists || false)}
                            variant="danger"
                            className="w-full"
                          >
                            💸 Withdraw SOL
                          </ActionButton>
                          
                          {!(playerVaultInfo?.exists || false) && (
                            <p className="text-xs text-yellow-600">
                              ⚠️ PlayerVault doesn't exist. Deposit first to create it.
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Token Information (if seated) */}
                    {playerVaultInfo?.isSeated && playerVaultInfo?.currentTableId !== null && playerVaultInfo?.currentTableId !== undefined && (
                      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-semibold mb-3 text-blue-700">
                          🎮 Game Tokens (Table #{playerVaultInfo.currentTableId})
                        </h3>
                        
                        {(() => {
                          const dealer = dealers.get(playerVaultInfo.currentTableId!);
                          if (!dealer) {
                            return <p className="text-blue-600 text-sm">Dealer not found for this table</p>;
                          }
                          
                          const playerVaultPDA = publicKey ? pokerProgram.getPlayerVaultPDA(publicKey) : null;
                          const playerTokens = dealer.playersTokens?.find((p: PlayerTokenEntry) => 
                            p.playerVaultPda && playerVaultPDA && p.playerVaultPda.equals(playerVaultPDA)
                          );
                          
                          return (
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p><strong>Your Tokens:</strong> {playerTokens ? formatTokens(playerTokens.tokens) : '0'}</p>
                                <p><strong>SOL Value:</strong> {playerTokens ? formatSOL(playerTokens.tokens / 10000 * 1e9) : '0.0000'} SOL</p>
                              </div>
                              <div>
                                <p><strong>Total Table Tokens:</strong> {formatTokens(dealer.totalTokensIssued || 0)}</p>
                                <p><strong>Active Players:</strong> {dealer.playersTokens?.filter((p: PlayerTokenEntry) => p.playerVaultPda !== null).length || 0}</p>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {/* Table Vault Tab */}
                {activeTab === 'table' && (
                  <div className="bg-white rounded-lg shadow-lg p-6">
                    <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                      🎯 Table Vault Functions
                      <StatusBadge status="info">Game Management</StatusBadge>
                    </h2>
                    
                    {/* Table Actions */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      
                      {/* Open New Table */}
                      <div className="p-4 border rounded-lg bg-purple-50 border-purple-200">
                        <h3 className="font-semibold mb-2 text-purple-700">🆕 Open Challenger Table</h3>
                        <p className="text-sm text-purple-600 mb-3">
                          Create new table with auto-join as first player.
                        </p>
                        <div className="text-xs bg-purple-100 p-2 rounded mb-3 text-purple-700">
                          <strong>Cost:</strong> 0.01 SOL (creation fee → House)<br/>
                          <strong>Owner:</strong> House Authority<br/>
                          <strong>Auto-join:</strong> You become player #1<br/>
                          <strong>Buy-in Range:</strong> 0.1 - 3.0 SOL
                        </div>
                        <ActionButton 
                          onClick={openChallengerTable}
                          disabled={!(playerVaultInfo?.exists || false) || (playerVaultInfo?.isSeated || false)}
                          variant="primary"
                          className="w-full"
                        >
                          🎯 Open New Table (0.01 SOL)
                        </ActionButton>
                        {(playerVaultInfo?.isSeated || false) && (
                          <p className="text-xs text-purple-600 mt-2">
                            ⚠️ Already seated at table {playerVaultInfo?.currentTableId || 'unknown'}
                          </p>
                        )}
                      </div>

                      {/* Join Existing Table */}
                      <div className="p-4 border rounded-lg bg-green-50 border-green-200">
                        <h3 className="font-semibold mb-2 text-green-700">🚪 Join Existing Table</h3>
                        <p className="text-sm text-green-600 mb-3">
                          Join table with existing players (FREE).
                        </p>
                        <div className="text-xs bg-green-100 p-2 rounded mb-3 text-green-700">
                          <strong>Requirement:</strong> Table must have ≥1 player<br/>
                          <strong>Cost:</strong> FREE (no fee for joining)<br/>
                          <strong>Next Step:</strong> Deposit buy-in to start playing
                        </div>
                        
                        <div className="space-y-2">
                          <input
                            type="number"
                            value={joinTableId}
                            onChange={(e) => setJoinTableId(e.target.value)}
                            placeholder="Table ID"
                            min="0"
                            className="w-full p-2 border border-green-300 rounded text-sm"
                          />
                          <ActionButton 
                            onClick={joinGame}
                            disabled={!joinTableId || (playerVaultInfo?.isSeated || false)}
                            variant="success"
                            className="w-full"
                          >
                            🚪 Join Table (FREE)
                          </ActionButton>
                        </div>
                      </div>
                    </div>

                    {/* Player Game Actions */}
                    {(playerVaultInfo?.isSeated || false) && (
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="font-semibold mb-3 text-blue-700">
                          🎮 Game Actions (Table {getDisplayTableId(playerVaultInfo)})
                        </h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          
                          {/* Deposit Buy-in */}
                          <div className="p-3 border border-blue-300 rounded">
                            <h4 className="font-medium mb-2 text-blue-700">💰 Deposit Buy-in</h4>
                            <p className="text-xs text-blue-600 mb-2">
                              {/* Updated description to clarify top-up capability */}
                              {!(playerVaultInfo?.ready || false) ? 
                                'Declare readiness with buy-in (1% fee applies) + mint tokens' :
                                'Top-up tokens (1% fee applies) - can buy up to 3 SOL total'
                              }
                            </p>
                            
                            <div className="space-y-2">
                              {/* Show current token value if player has tokens */}
                              {(() => {
                                const dealer = dealers.get(playerVaultInfo?.currentTableId || -1);
                                const playerVaultPDA = publicKey ? pokerProgram.getPlayerVaultPDA(publicKey) : null;
                                const playerTokens = dealer?.playersTokens?.find((p: PlayerTokenEntry) => 
                                  p.playerVaultPda && playerVaultPDA && p.playerVaultPda.equals(playerVaultPDA)
                                );
                                
                                if (playerTokens && playerTokens.tokens > 0) {
                                  const currentSOLValue = playerTokens.tokens / 10000;
                                  const remainingBuyIn = Math.max(0, 3.0 - currentSOLValue);
                                  
                                  return (
                                    <div className="text-xs bg-blue-100 p-2 rounded text-blue-700">
                                      <strong>Current Tokens:</strong> {formatTokens(playerTokens.tokens)} ({formatSOL(currentSOLValue * 1e9)} SOL)<br/>
                                      <strong>Can still buy:</strong> {formatSOL(remainingBuyIn * 1e9)} SOL (max 3 SOL total)
                                    </div>
                                  );
                                }
                                return null;
                              })()}
                              
                              <div className="grid grid-cols-3 gap-1">
                                {[0.1, 0.3, 0.5].map(amount => (
                                  <button
                                    key={amount}
                                    onClick={() => setBuyInAmount(amount.toString())}
                                    className={`p-1 border rounded text-xs ${
                                      buyInAmount === amount.toString() 
                                        ? 'bg-blue-500 text-white' 
                                        : 'bg-gray-50 hover:bg-gray-100'
                                    }`}
                                  >
                                    {amount} SOL
                                  </button>
                                ))}
                              </div>
                              
                              <input
                                type="number"
                                value={buyInAmount}
                                onChange={(e) => setBuyInAmount(e.target.value)}
                                placeholder="Buy-in (0.1-3.0 SOL)"
                                step="0.01"
                                min="0.1"
                                max="3.0"
                                className="w-full p-2 border border-blue-300 rounded text-sm"
                              />
                              
                              {buyInAmount && (
                                <div className="text-xs text-blue-600">
                                  <p>Fee: {(parseFloat(buyInAmount) * 0.01).toFixed(4)} SOL (1%)</p>
                                  <p>Tokens: {formatTokens(parseFloat(buyInAmount) * 10000)}</p>
                                </div>
                              )}
                              
                              <ActionButton 
                                onClick={depositToGame}
                                disabled={(() => {
                                  // Basic validation
                                  if (!buyInAmount || parseFloat(buyInAmount) < 0.1 || parseFloat(buyInAmount) > 3.0) {
                                    return true;
                                  }
                                  
                                  // Check if player would exceed max buy-in (3 SOL total)
                                  const dealer = dealers.get(playerVaultInfo?.currentTableId || -1);
                                  const playerVaultPDA = publicKey ? pokerProgram.getPlayerVaultPDA(publicKey) : null;
                                  const playerTokens = dealer?.playersTokens?.find((p: PlayerTokenEntry) => 
                                    p.playerVaultPda && playerVaultPDA && p.playerVaultPda.equals(playerVaultPDA)
                                  );
                                  
                                  if (playerTokens) {
                                    const currentSOLValue = playerTokens.tokens / 10000;
                                    const newTotal = currentSOLValue + parseFloat(buyInAmount);
                                    return newTotal > 3.0; // Block if would exceed 3 SOL total
                                  }
                                  
                                  return false; // Allow if no tokens yet (first buy-in)
                                })()}
                                variant="primary"
                                className="w-full text-sm"
                              >
                                {(() => {
                                  if (!(playerVaultInfo?.ready || false)) {
                                    return '💰 Deposit Buy-in';
                                  }
                                  
                                  // Check if at max buy-in
                                  const dealer = dealers.get(playerVaultInfo?.currentTableId || -1);
                                  const playerVaultPDA = publicKey ? pokerProgram.getPlayerVaultPDA(publicKey) : null;
                                  const playerTokens = dealer?.playersTokens?.find((p: PlayerTokenEntry) => 
                                    p.playerVaultPda && playerVaultPDA && p.playerVaultPda.equals(playerVaultPDA)
                                  );
                                  
                                  if (playerTokens) {
                                    const currentSOLValue = playerTokens.tokens / 10000;
                                    if (currentSOLValue >= 3.0) {
                                      return '🚫 Max Buy-in Reached (3 SOL)';
                                    }
                                    if (buyInAmount && currentSOLValue + parseFloat(buyInAmount) > 3.0) {
                                      return '🚫 Would Exceed Max (3 SOL)';
                                    }
                                  }
                                  
                                  return '💰 Top-up Tokens';
                                })()}
                              </ActionButton>
                              
                              {/* Helpful message about limits */}
                              {(() => {
                                const dealer = dealers.get(playerVaultInfo?.currentTableId || -1);
                                const playerVaultPDA = publicKey ? pokerProgram.getPlayerVaultPDA(publicKey) : null;
                                const playerTokens = dealer?.playersTokens?.find((p: PlayerTokenEntry) => 
                                  p.playerVaultPda && playerVaultPDA && p.playerVaultPda.equals(playerVaultPDA)
                                );
                                
                                if (playerTokens && buyInAmount) {
                                  const currentSOLValue = playerTokens.tokens / 10000;
                                  const newTotal = currentSOLValue + parseFloat(buyInAmount);
                                  
                                  if (newTotal > 3.0) {
                                    return (
                                      <p className="text-xs text-red-600">
                                        ⚠️ Would exceed max buy-in. Current: {formatSOL(currentSOLValue * 1e9)} SOL, Max: 3.0000 SOL
                                      </p>
                                    );
                                  }
                                }
                                
                                return null;
                              })()}
                            </div>
                          </div>

                          {/* Leave Table */}
                          <div className="p-3 border border-red-300 rounded">
                            <h4 className="font-medium mb-2 text-red-700">🚶 Leave Table</h4>
                            <p className="text-xs text-red-600 mb-2">
                              Exit table with payout based on tokens
                            </p>
                            
                            <div className="space-y-2">
                              {(() => {
                                const dealer = dealers.get(playerVaultInfo?.currentTableId || -1);
                                const playerVaultPDA = publicKey ? pokerProgram.getPlayerVaultPDA(publicKey) : null;
                                const playerTokens = dealer?.playersTokens?.find((p: PlayerTokenEntry) => 
                                  p.playerVaultPda && playerVaultPDA && p.playerVaultPda.equals(playerVaultPDA)
                                );
                                
                                if (playerTokens) {
                                  const payoutSOL = playerTokens.tokens / 10000;
                                  return (
                                    <div className="text-xs bg-red-100 p-2 rounded text-red-700">
                                      <strong>Your Tokens:</strong> {formatTokens(playerTokens.tokens)}<br/>
                                      <strong>Payout:</strong> {formatSOL(payoutSOL * 1e9)} SOL
                                    </div>
                                  );
                                }
                                
                                return (
                                  <div className="text-xs bg-red-100 p-2 rounded text-red-700">
                                    <strong>Payout:</strong> Based on current tokens
                                  </div>
                                );
                              })()}
                              
                              <ActionButton 
                                onClick={leaveTable}
                                disabled={false}
                                variant="danger"
                                className="w-full text-sm"
                              >
                                🚶 Leave Table
                              </ActionButton>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Tables List */}
                    <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                      <div className="flex justify-between items-center mb-4">
                        <h3 className="font-semibold">📋 All Tables ({tables.length})</h3>
                        <ActionButton onClick={fetchTables} disabled={false} variant="secondary" className="text-sm">
                          🔄 Refresh
                        </ActionButton>
                      </div>
                      
                      {tables.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                          <p>No tables found. Click "Refresh" or create a new table.</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {tables.map(table => {
                            const dealer = dealers.get(table.id);
                            return (
                              <div 
                                key={table.id} 
                                className={`p-3 border rounded-lg ${
                                  table.isEmpty ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                                }`}
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div>
                                    <h4 className="font-medium">Table #{table.id}</h4>
                                    <p className="text-xs text-gray-600">
                                      Players: {table.players}/{table.maxPlayers}
                                    </p>
                                  </div>
                                  <div className="text-right">
                                    {table.isEmpty ? (
                                      <StatusBadge status="error">Empty</StatusBadge>
                                    ) : table.players >= table.maxPlayers ? (
                                      <StatusBadge status="warning">Full</StatusBadge>
                                    ) : (
                                      <StatusBadge status="success">Open</StatusBadge>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="text-xs text-gray-600 space-y-1">
                                  <p>Buy-in: {table.minBuyIn}-{table.maxBuyIn} SOL</p>
                                  <p>Balance: {formatSOL(table.balance * 1e9)} SOL</p>
                                  {dealer && (
                                    <p>Tokens: {formatTokens(dealer.totalTokensIssued || 0)}</p>
                                  )}
                                  <p>Owner: House Authority</p>
                                </div>
                                
                                <div className="mt-2 flex gap-2">
                                  {!table.isEmpty && !(playerVaultInfo?.isSeated || false) && (
                                    <button
                                      onClick={() => {
                                        setJoinTableId(table.id.toString());
                                        joinGame();
                                      }}
                                      disabled={table.players >= table.maxPlayers}
                                      className="flex-1 bg-green-500 text-white px-2 py-1 rounded text-xs hover:bg-green-600 disabled:opacity-50"
                                    >
                                      Join
                                    </button>
                                  )}
                                  
                                  {table.isEmpty && (houseInfo?.isYourAuthority || false) && (
                                    <button
                                      onClick={() => {
                                        setCollectTableId(table.id.toString());
                                        setSelectedTable(null);
                                        collectRent();
                                      }}
                                      className="flex-1 bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                                    >
                                      Collect Rent
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={() => setSelectedTable(table)}
                                    className="bg-gray-500 text-white px-2 py-1 rounded text-xs hover:bg-gray-600"
                                  >
                                    Details
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* === SIDEBAR - STATUS === */}
              <div className="space-y-6">
                
                {/* Quick Status */}
                <div className="bg-white rounded-lg shadow-lg p-4">
                  <h3 className="font-semibold mb-3">⚡ Quick Status</h3>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>House:</span>
                      {(houseInfo?.exists || false) ? (
                        <StatusBadge status="success">Active</StatusBadge>
                      ) : (
                        <StatusBadge status="error">Not Found</StatusBadge>
                      )}
                    </div>
                    
                    <div className="flex justify-between">
                      <span>PlayerVault:</span>
                      {(playerVaultInfo?.exists || false) ? (
                        <StatusBadge status="success">{formatSOL((playerVaultInfo?.totalBalance || 0) * 1e9)} SOL</StatusBadge>
                      ) : (
                        <StatusBadge status="error">Not Created</StatusBadge>
                      )}
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Seated:</span>
                      {(playerVaultInfo?.isSeated || false) ? (
                        <StatusBadge status="success">Table {getDisplayTableId(playerVaultInfo)}</StatusBadge>
                      ) : (
                        <StatusBadge status="warning">No</StatusBadge>
                      )}
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Ready:</span>
                      {(playerVaultInfo?.ready || false) ? (
                        <StatusBadge status="success">Yes</StatusBadge>
                      ) : (
                        <StatusBadge status="warning">No</StatusBadge>
                      )}
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Tables Found:</span>
                      <StatusBadge status="info">{tables.length}</StatusBadge>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Table Counter:</span>
                      <StatusBadge status="info">{tableCounter}</StatusBadge>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Next Table ID:</span>
                      <StatusBadge status="warning">{tableCounter}</StatusBadge>
                    </div>
                    
                    <div className="flex justify-between">
                      <span>Dealers:</span>
                      <StatusBadge status="info">{dealers.size}</StatusBadge>
                    </div>
                  </div>
                  
                  {/* Development Info */}
                  <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-700 mb-2">🛠️ Developer Info</h4>
                    <div className="text-xs text-gray-600">
                      <p>✨ Use F12 to open browser console for detailed logs</p>
                      <p>🔍 All transaction details are logged there</p>
                      <p>🚀 Real-time smart contract interactions</p>
                      <p>🎯 Data properly parsed from blockchain structures</p>
                      <p>⚠️ Next table will have ID: {tableCounter}</p>
                    </div>
                  </div>
                </div>

                {/* Loading/Error Status */}
                {loading && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <span className="text-blue-700 text-sm">Processing transaction...</span>
                    </div>
                    <p className="text-xs text-blue-600 mt-2">
                      ℹ️ Check your wallet to confirm or reject the transaction
                    </p>
                  </div>
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-medium text-red-800 mb-1">
                          {error.includes('cancelled') ? '🚫 Transaction Cancelled' : '❌ Error'}
                        </h4>
                        <p className="text-red-700 text-sm">{error}</p>
                        {error.includes('cancelled') && (
                          <p className="text-xs text-red-600 mt-2">
                            This is normal - you can try the transaction again anytime
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => setError('')}
                        className="bg-red-500 text-white px-2 py-1 rounded text-xs hover:bg-red-600"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* === MODALS === */}
      
      {/* Table Details Modal */}
      {selectedTable && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Table #{selectedTable.id} Details</h3>
              <button
                onClick={() => setSelectedTable(null)}
                className="bg-gray-500 text-white px-2 py-1 rounded text-sm hover:bg-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div><strong>Table ID:</strong> {selectedTable.id}</div>
                <div><strong>Players:</strong> {selectedTable.players}/{selectedTable.maxPlayers}</div>
                <div><strong>Min Buy-in:</strong> {selectedTable.minBuyIn} SOL</div>
                <div><strong>Max Buy-in:</strong> {selectedTable.maxBuyIn} SOL</div>
                <div><strong>Balance:</strong> {formatSOL(selectedTable.balance * 1e9)} SOL</div>
                <div><strong>Status:</strong> {selectedTable.isEmpty ? 'Empty' : 'Active'}</div>
              </div>
              
              {/* Dealer Info */}
              {(() => {
                const dealer = dealers.get(selectedTable.id);
                if (dealer) {
                  return (
                    <div className="border-t pt-2">
                      <strong>Dealer Info:</strong>
                      <div className="ml-2 text-xs">
                        <p>Total Tokens: {formatTokens(dealer.totalTokensIssued || 0)}</p>
                        <p>Active Players: {dealer.playersTokens?.filter((p: PlayerTokenEntry) => p.playerVaultPda !== null).length || 0}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
              
              <div>
                <strong>Owner:</strong>
                <code className="bg-gray-100 p-1 rounded text-xs ml-2 break-all">
                  {selectedTable.owner.toString().slice(0, 20)}...
                </code>
              </div>
              
              <div>
                <strong>PDA Address:</strong>
                <code className="bg-gray-100 p-1 rounded text-xs ml-2 break-all">
                  {pokerProgram.getTableVaultPDA(selectedTable.id).toString().slice(0, 20)}...
                </code>
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              {!selectedTable.isEmpty && !(playerVaultInfo?.isSeated || false) && (
                <ActionButton
                  onClick={() => {
                    setJoinTableId(selectedTable.id.toString());
                    setSelectedTable(null);
                    joinGame();
                  }}
                  disabled={selectedTable.players >= selectedTable.maxPlayers}
                  variant="success"
                  className="flex-1"
                >
                  Join Table
                </ActionButton>
              )}
              
              {selectedTable.isEmpty && (houseInfo?.isYourAuthority || false) && (
                <ActionButton
                  onClick={() => {
                    setCollectTableId(selectedTable.id.toString());
                    setSelectedTable(null);
                    collectRent();
                  }}
                  disabled={false}
                  variant="primary"
                  className="flex-1"
                >
                  Collect Rent
                </ActionButton>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Dealer Details Modal */}
      {selectedDealer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Dealer #{selectedDealer.tableId} Details</h3>
              <button
                onClick={() => setSelectedDealer(null)}
                className="bg-gray-500 text-white px-2 py-1 rounded text-sm hover:bg-gray-600"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-4 text-sm">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded">
                <div><strong>Table ID:</strong> {selectedDealer.tableId}</div>
                <div><strong>Total Tokens:</strong> {formatTokens(selectedDealer.totalTokensIssued || 0)}</div>
                <div><strong>Authority:</strong> {selectedDealer.isYourAuthority ? 'YOU' : 'Other'}</div>
                <div><strong>Active Players:</strong> {selectedDealer.playersTokens?.filter((p: PlayerTokenEntry) => p.playerVaultPda !== null).length || 0}</div>
              </div>
              
              {/* Detailed Player Information */}
              <div>
                <h4 className="font-semibold mb-3 flex items-center gap-2">
                  👥 Detailed Player Information
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                    Ready for Testing
                  </span>
                </h4>
                
                {selectedDealer.playersTokens?.filter((p: PlayerTokenEntry) => p.playerVaultPda !== null).length === 0 ? (
                  <div className="text-center py-6 text-gray-500 bg-gray-50 rounded">
                    <p>No active players in this dealer</p>
                    <p className="text-xs mt-1">Players will appear here after joining and depositing buy-in</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedDealer.playersTokens?.filter((p: PlayerTokenEntry) => p.playerVaultPda !== null).map((player, index) => {
                      const isCurrentUser = publicKey && player.playerVaultPda && 
                        player.playerVaultPda.equals(pokerProgram.getPlayerVaultPDA(publicKey));
                      const ownerAddress = isCurrentUser && publicKey ? 
                        publicKey.toString() : 
                        playerOwners.get(player.playerVaultPda?.toString() || '');
                      
                      return (
                        <div key={index} className={`p-4 rounded border-2 ${
                          player.tokens === 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'
                        }`}>
                          {/* Player Header */}
                          <div className="flex justify-between items-center mb-3">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-base">
                                Player #{index + 1}
                                {isCurrentUser && <span className="text-blue-600 font-bold">(YOU)</span>}
                              </span>
                              {player.tokens === 0 && (
                                <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold">
                                  🚨 0 TOKENS - KICKABLE
                                </span>
                              )}
                            </div>
                            <div className="text-right">
                              <div className="font-semibold text-lg">
                                {formatTokens(player.tokens)} tokens
                              </div>
                              <div className="text-xs text-gray-600">
                                {formatSOL(player.tokens / 10000 * 1e9)} SOL value
                              </div>
                            </div>
                          </div>
                          
                          {/* PlayerVault PDA */}
                          <div className="mb-3">
                            <label className="text-gray-700 font-medium block mb-1">PlayerVault PDA:</label>
                            <div className="flex items-center gap-2">
                              <code className="bg-gray-100 p-2 rounded border text-xs flex-1 break-all font-mono">
                                {player.playerVaultPda?.toString() || 'Unknown'}
                              </code>
                              <button
                                onClick={() => {
                                  if (player.playerVaultPda) {
                                    copyToClipboard(player.playerVaultPda.toString(), `MODAL_PLAYER_PDA_${selectedDealer.tableId}_${index}`);
                                  }
                                }}
                                className="bg-blue-500 text-white px-3 py-2 rounded text-xs hover:bg-blue-600 whitespace-nowrap"
                                title="Copy PlayerVault PDA"
                              >
                                {copied === `MODAL_PLAYER_PDA_${selectedDealer.tableId}_${index}` ? '✅ Copied' : '📋 Copy PDA'}
                              </button>
                            </div>
                          </div>
                          
                          {/* Owner Address */}
                          <div className="mb-3">
                            <label className="text-gray-700 font-medium block mb-1">Owner Address:</label>
                            <div className="flex items-center gap-2">
                              <code className="bg-gray-100 p-2 rounded border text-xs flex-1 break-all font-mono">
                                {ownerAddress || 'Loading owner address...'}
                              </code>
                              {ownerAddress && (
                                <button
                                  onClick={() => copyToClipboard(ownerAddress, `MODAL_OWNER_${selectedDealer.tableId}_${index}`)}
                                  className="bg-green-500 text-white px-3 py-2 rounded text-xs hover:bg-green-600 whitespace-nowrap"
                                  title="Copy Owner Address"
                                >
                                  {copied === `MODAL_OWNER_${selectedDealer.tableId}_${index}` ? '✅ Copied' : '📋 Copy Owner'}
                                </button>
                              )}
                            </div>
                            {!ownerAddress && (
                              <p className="text-xs text-orange-600 mt-1">
                                ⏳ Owner address being fetched from blockchain...
                              </p>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-200">
                            {/* Kick Player Button (only for 0 token players and if user is authority) */}
                            {player.tokens === 0 && (houseInfo?.isYourAuthority || false) && (
                              <button
                                onClick={() => {
                                  setKickPlayerTableId(selectedDealer.tableId.toString());
                                  if (player.playerVaultPda) {
                                    setKickPlayerPda(player.playerVaultPda.toString());
                                  }
                                  if (ownerAddress) {
                                    setKickPlayerOwner(ownerAddress);
                                  }
                                  setSelectedDealer(null); // Close modal
                                }}
                                className="bg-red-500 text-white px-3 py-2 rounded text-xs hover:bg-red-600 font-medium"
                                title="Fill kick player form and close modal"
                              >
                                🚫 Use for Kick Player
                              </button>
                            )}
                            
                            {/* Add to Redistribute Button */}
                            <button
                              onClick={() => {
                                setRedistributeTableId(selectedDealer.tableId.toString());
                                // Add this player to redistribute form if not already there
                                const exists = redistributeBalances.some(b => 
                                  b.playerVaultPda === player.playerVaultPda?.toString()
                                );
                                if (!exists && player.playerVaultPda) {
                                  setRedistributeBalances([
                                    ...redistributeBalances,
                                    {
                                      playerVaultPda: player.playerVaultPda.toString(),
                                      tokens: player.tokens.toString()
                                    }
                                  ]);
                                }
                                setSelectedDealer(null); // Close modal
                              }}
                              className="bg-purple-500 text-white px-3 py-2 rounded text-xs hover:bg-purple-600 font-medium"
                              title="Add to redistribute form and close modal"
                            >
                              💰 Add to Redistribute
                            </button>
                            
                            {/* Copy All Info Button */}
                            <button
                              onClick={() => {
                                if (player.playerVaultPda) {
                                  const text = ownerAddress ? 
                                    `Player #${index + 1} Details:\nPlayerVault PDA: ${player.playerVaultPda.toString()}\nOwner Address: ${ownerAddress}\nTokens: ${player.tokens}\nSOL Value: ${formatSOL(player.tokens / 10000 * 1e9)} SOL\nTable ID: ${selectedDealer.tableId}` :
                                    `Player #${index + 1} Details:\nPlayerVault PDA: ${player.playerVaultPda.toString()}\nOwner Address: [LOADING]\nTokens: ${player.tokens}\nSOL Value: ${formatSOL(player.tokens / 10000 * 1e9)} SOL\nTable ID: ${selectedDealer.tableId}`;
                                  copyToClipboard(text, `MODAL_FULL_INFO_${selectedDealer.tableId}_${index}`);
                                }
                              }}
                              className="bg-gray-500 text-white px-3 py-2 rounded text-xs hover:bg-gray-600 font-medium"
                              title="Copy complete player information"
                            >
                              {copied === `MODAL_FULL_INFO_${selectedDealer.tableId}_${index}` ? '✅ Copied All' : '📄 Copy All Info'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              
              {/* Quick Actions Summary */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded">
                <h5 className="font-medium text-blue-800 mb-2">🔧 Testing Quick Actions:</h5>
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• <strong>Kick Player:</strong> Available for players with 0 tokens (House Authority only)</p>
                  <p>• <strong>Add to Redistribute:</strong> Adds player to token redistribution form</p>
                  <p>• <strong>Copy Buttons:</strong> Easy copy/paste for testing scenarios</p>
                  <p>• <strong>Owner Addresses:</strong> Automatically fetched from blockchain</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PokerContractConsole;

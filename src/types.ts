import { PublicKey } from '@solana/web3.js'; // Using PublicKey instead of Signature

type Signature = string; // Define Signature as a string type

// NodePubkey type
type NodePubkey = number[]; // Equivalent to Vec<u8> in Rust

// Status enum
enum Status {
  Processing,
  Processed
}

// AccountMeta type
interface AccountMeta {
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
  }
// Instruction type
interface Instruction {
    program_id: PublicKey;
    accounts: AccountMeta[];
    data: number[]; // Equivalent to Vec<u8> in Rust
  }

  // Message type
  interface Message {
    signers: PublicKey[];
    instructions: Instruction[];
  }

// RuntimeTransaction type
interface RuntimeTransaction {
  version: number;
  signatures: Signature[];
  message: Message;
}

// ProcessedTransaction type
interface ProcessedTransaction {
  runtime_transaction: RuntimeTransaction;
  status: Status;
  bitcoin_txids: string[];
}

// Block type
interface Block {
  transactions: string[];
  previous_block_hash: string;
  transaction_count: number;
  timestamp: number;
  merkle_root: string;
}

// ArchNode type
interface ArchNode {
  url: string;
  pubkey: NodePubkey;
  node_id: number;
  is_ready: boolean;
}

// AccountInfoResult type
interface AccountInfoResult {
  owner: string;
  data: number[];
  utxo: string;
  is_executable: boolean;
}

// Export all types
export type {
  NodePubkey,
  RuntimeTransaction,
  ProcessedTransaction,
  Block,
  ArchNode,
  AccountInfoResult,
  Instruction,
  Message
};
export { Status };
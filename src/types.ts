import { PublicKey } from '@solana/web3.js'; // Using PublicKey instead of Signature

type Signature = string; // Define Signature as a string type

// Utility type for hexadecimal strings
type HexString = string;

// NodePubkey type
type NodePubkey = number[]; // Equivalent to Vec<u8> in Rust

// Status enum
enum Status {
  Processing,
  Processed
}

// Message type (simplified, as we don't have full details)
interface Message {
  instructions: Instruction[];
  // Add other fields as needed
}

// Instruction type (simplified, as we don't have full details)
interface Instruction {
  // Add fields based on the actual Instruction struct
  hash(): string;
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
  transactions: HexString[];
  previous_block_hash: HexString;
}

// ArchNode type
interface ArchNode {
  url: string;
  pubkey: NodePubkey;
  node_id: number;
  is_ready: boolean;
}

// AccountInfoResult type (already correctly defined in your code)
interface AccountInfoResult {
  owner: HexString;
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
  HexString
};
export { Status };
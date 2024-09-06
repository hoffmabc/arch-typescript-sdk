import { PublicKey } from '@solana/web3.js'; // Using PublicKey instead of Signature

type Signature = string; // Define Signature as a string type

// NodePubkey type
type NodePubkey = number[]; // Equivalent to Vec<u8> in Rust

// Status enum
enum Status {
  Processing,
  Processed
}

class Pubkey {
  constructor(public readonly bytes: Uint8Array) {
    if (bytes.length !== 32) {
      throw new Error('Pubkey must be 32 bytes');
    }
  }
  static fromString(s: string): Pubkey {
    const bytes = new Uint8Array(32);
    for (let i = 0; i < 32; i++) {
      bytes[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
    }
    return new Pubkey(bytes);
  }
  toString(): string {
    return Array.from(this.bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  serialize(): number[] {
    return Array.from(this.bytes);
  }
}

// Update Instruction to use Pubkey instead of PublicKey
interface Instruction {
  programId: Pubkey;
  accounts: AccountMeta[];
  data: number[];
}

// Update AccountMeta to use Pubkey
interface AccountMeta {
  pubkey: Pubkey;
  isSigner: boolean;
  isWritable: boolean;
}

// Update Message to use Pubkey
interface Message {
  signers: Pubkey[];
  instructions: Instruction[];
}

  // Message type
  interface Message {
    signers: Pubkey[];
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
  Message,
  AccountMeta
};
export { Status, Pubkey, Signature };

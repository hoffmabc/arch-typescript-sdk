import { PublicKey } from '@solana/web3.js'; // Using PublicKey instead of Signature

type Signature = string; // Define Signature as a string type

// NodePubkey type
type NodePubkey = number[]; // Equivalent to Vec<u8> in Rust

// Status enum
enum Status {
  Processing,
  Processed
}

export class Pubkey {
  constructor(public readonly bytes: Uint8Array) {
    if (bytes.length !== 32) {
      throw new Error('Pubkey must be 32 bytes');
    }
  }

  static fromString(s: string): Pubkey {
    const bytes = Buffer.from(s, 'hex');
    if (bytes.length !== 32) {
      throw new Error('Invalid pubkey string');
    }
    return new Pubkey(bytes);
  }

  toString(): string {
    return Buffer.from(this.bytes).toString('hex');
  }

  serialize(): number[] {
    return Array.from(this.bytes);
  }

  static systemProgram(): Pubkey {
    const bytes = new Uint8Array(32);
    bytes[31] = 1;
    return new Pubkey(bytes);
  }
}

// Update Instruction to use Pubkey instead of PublicKey
interface Instruction {
  program_id: Pubkey;
  accounts: AccountMeta[];
  data: number[];
}

// Update AccountMeta to use Pubkey
interface AccountMeta {
  pubkey: Pubkey;
  is_signer: boolean;
  is_writable: boolean;
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
export { Status, Signature };

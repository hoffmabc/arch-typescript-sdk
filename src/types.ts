import { Buffer } from 'buffer';

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

export type NodePubkey = number[];

export enum Status {
  Processing,
  Processed
}

export type Signature = string;

export interface Instruction {
  program_id: Pubkey;
  accounts: AccountMeta[];
  data: number[];
}

export interface AccountMeta {
  pubkey: Pubkey;
  is_signer: boolean;
  is_writable: boolean;
}

export interface Message {
  signers: Pubkey[];
  instructions: Instruction[];
}

export interface RuntimeTransaction {
  version: number;
  signatures: Signature[];
  message: Message;
}

export interface ProcessedTransaction {
  runtime_transaction: RuntimeTransaction;
  status: Status;
  bitcoin_txids: string[];
}

export interface Block {
  transactions: string[];
  previous_block_hash: string;
  transaction_count: number;
  timestamp: number;
  merkle_root: string;
}

export interface ArchNode {
  url: string;
  pubkey: NodePubkey;
  node_id: number;
  is_ready: boolean;
}

export interface AccountInfoResult {
  owner: string;
  data: number[];
  utxo: string;
  is_executable: boolean;
}
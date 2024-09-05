import axios, { AxiosInstance } from 'axios';
import {
  NodePubkey,
  RuntimeTransaction,
  ProcessedTransaction,
  Block,
  AccountInfoResult,
  HexString,
  Instruction,
  Message
} from './types';

export class Pubkey {
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

export class ArchRpcClient {
  private rpc: AxiosInstance;

  constructor(url: string) {
    this.rpc = axios.create({
      baseURL: url,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async call<T>(method: string, params: any): Promise<T> {
    const response = await this.rpc.post('', {
      jsonrpc: '2.0',
      id: 1,
      method,
      params,
    });
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    return response.data.result;
  }

  async isNodeReady(): Promise<boolean> {
    return this.call<boolean>('is_node_ready', []);
  }

  async getAccountAddress(accountPubkey: Pubkey): Promise<string> {
    return this.call<string>('get_account_address', accountPubkey.serialize());
  }

  async readAccountInfo(pubkey: Pubkey): Promise<AccountInfoResult> {
    return this.call<AccountInfoResult>('read_account_info', pubkey.serialize());
  }

  async sendTransaction(transaction: RuntimeTransaction): Promise<HexString> {
    return this.call<HexString>('send_transaction', [transaction]);
  }

  async sendTransactions(transactions: RuntimeTransaction[]): Promise<HexString[]> {
    return this.call<HexString[]>('send_transactions', [transactions]);
  }

  async getBlockCount(): Promise<number> {
    return this.call<number>('get_block_count', []);
  }

  async startDkg(): Promise<void> {
    return this.call<void>('start_dkg', []);
  }

  async getBlockHash(height: number): Promise<HexString> {
    return this.call<HexString>('get_block_hash', height);
  }

  async getBlock(hash: HexString): Promise<Block> {
    return this.call<Block>('get_block', hash);
  }

  async getProcessedTransaction(txId: HexString): Promise<ProcessedTransaction> {
    return this.call<ProcessedTransaction>('get_processed_transaction', txId);
  }

  // New methods to handle Instructions and Messages
  async createInstruction(programId: Pubkey, accounts: Pubkey[], data: number[]): Promise<Instruction> {
    return this.call<Instruction>('create_instruction', [programId.serialize(), accounts.map(a => a.serialize()), data]);
  }

  async createMessage(signers: Pubkey[], instructions: Instruction[]): Promise<Message> {
    return this.call<Message>('create_message', [signers.map(s => s.serialize()), instructions]);
  }
}
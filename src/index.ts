import axios, { AxiosInstance } from 'axios';
import {
  NodePubkey,
  RuntimeTransaction,
  ProcessedTransaction,
  Block,
  AccountInfoResult,
  HexString
} from './types';

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

  private async call<T>(method: string, params: any[] = []): Promise<T> {
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
    return this.call<boolean>('is_node_ready');
  }

  async getAccountAddress(accountPubkey: NodePubkey): Promise<string> {
    return this.call<string>('get_account_address', [accountPubkey]);
  }

  async readAccountInfo(pubkey: HexString): Promise<AccountInfoResult> {
    return this.call<AccountInfoResult>('read_account_info', [pubkey]);
  }

  async sendTransaction(transaction: RuntimeTransaction): Promise<HexString> {
    return this.call<HexString>('send_transaction', [transaction]);
  }

  async sendTransactions(transactions: RuntimeTransaction[]): Promise<HexString[]> {
    return this.call<HexString[]>('send_transactions', [transactions]);
  }

  async getBlockCount(): Promise<number> {
    return this.call<number>('get_block_count');
  }

  async startDkg(): Promise<void> {
    return this.call<void>('start_dkg');
  }

  async getBlockHash(height: number): Promise<HexString> {
    return this.call<HexString>('get_block_hash', [height]);
  }

  async getBlock(hash: HexString): Promise<Block> {
    return this.call<Block>('get_block', [hash]);
  }

  async getProcessedTransaction(txId: HexString): Promise<ProcessedTransaction> {
    return this.call<ProcessedTransaction>('get_processed_transaction', [txId]);
  }
}
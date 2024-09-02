import axios, { AxiosInstance } from 'axios';

// Define types based on Rust structs
type Pubkey = string; // Assuming Pubkey is represented as a string in TypeScript
type RuntimeTransaction = any; // You may want to define this type more precisely
type Block = any; // You may want to define this type more precisely
type ProcessedTransaction = any; // You may want to define this type more precisely

interface AccountInfoResult {
  owner: Pubkey;
  data: number[]; // Assuming Vec<u8> is represented as number[] in TypeScript
  utxo: string;
  is_executable: boolean;
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

  async getAccountAddress(accountPubkey: Uint8Array): Promise<string> {
    return this.call<string>('get_account_address', [Array.from(accountPubkey)]);
  }

  async readAccountInfo(pubkey: Pubkey): Promise<AccountInfoResult> {
    return this.call<AccountInfoResult>('read_account_info', [pubkey]);
  }

  async sendTransaction(transaction: RuntimeTransaction): Promise<string> {
    return this.call<string>('send_transaction', [transaction]);
  }

  async sendTransactions(transactions: RuntimeTransaction[]): Promise<string[]> {
    return this.call<string[]>('send_transactions', [transactions]);
  }

  async getBlockCount(): Promise<number> {
    return this.call<number>('get_block_count');
  }

  async startDkg(): Promise<void> {
    return this.call<void>('start_dkg');
  }

  async getBlockHash(height: number): Promise<string> {
    return this.call<string>('get_block_hash', [height]);
  }

  async getBlock(hash: string): Promise<Block> {
    return this.call<Block>('get_block', [hash]);
  }

  async getProcessedTransaction(txId: string): Promise<ProcessedTransaction> {
    return this.call<ProcessedTransaction>('get_processed_transaction', [txId]);
  }
}
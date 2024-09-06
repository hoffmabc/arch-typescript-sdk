import axios, { AxiosInstance } from 'axios';
import {
  NodePubkey,
  RuntimeTransaction,
  ProcessedTransaction,
  Block,
  AccountInfoResult,
  Instruction,
  Message,
  Pubkey,
  AccountMeta
} from './types';
import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { Buffer } from 'buffer';

export class ArchRpcClient {
  private rpc: AxiosInstance;
  private id: number = 0;
 
  constructor(url: string) {
    this.rpc = axios.create({
      baseURL: url,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  private async call<T>(method: string, params: any): Promise<T> {
    const payload = {
      jsonrpc: '2.0',
      id: 'curlycurl',
      method,
      params,
    };
    const response = await this.rpc.post('', payload);
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    return response.data.result;
  }

  private encodeCreateAccountData(txid: string, vout: number): number[] {
    const buffer = Buffer.alloc(37); // 32 bytes for txid + 4 bytes for vout + 1 byte for instruction type

    // Write instruction type (assuming 0 for CreateAccount)
    buffer.writeUInt8(0, 0);

    // Write txid (assuming it's a hex string)
    Buffer.from(txid, 'hex').copy(buffer, 1);

    // Write vout as little-endian 32-bit unsigned integer
    buffer.writeUInt32LE(vout, 33);

    return Array.from(buffer);
  }

  private createCreateAccountInstruction(pubkey: Pubkey, txid: string, vout: number): Instruction {
    const systemProgramId = new Pubkey(new Uint8Array(32).fill(0, 0, 31).fill(1, 31));
    
    return {
      programId: systemProgramId,
      accounts: [{
        pubkey: pubkey,
        isSigner: true,
        isWritable: true,
      }],
      data: this.encodeCreateAccountData(txid, vout),
    };
  }

  private serializePubkey(pubkey: Pubkey): number[] {
    return Array.from(pubkey.bytes);
  }

  private serializeInstruction(instruction: Instruction): any {
    return {
      accounts: instruction.accounts.map(account => ({
        is_signer: account.isSigner,
        is_writable: account.isWritable,
        pubkey: this.serializePubkey(account.pubkey)
      })),
      data: Array.from(instruction.data),
      program_id: this.serializePubkey(instruction.programId)
    };
  }

  private serializeMessage(message: Message): any {
    return {
      instructions: message.instructions.map(inst => this.serializeInstruction(inst)),
      signers: message.signers.map(signer => this.serializePubkey(signer))
    };
  }

  private serializeTransaction(transaction: RuntimeTransaction): any {
    return {
      message: this.serializeMessage(transaction.message),
      signatures: transaction.signatures.map(sig => Array.from(Buffer.from(sig, 'hex'))),
      version: transaction.version
    };
  }

  async sendTransaction(transaction: RuntimeTransaction): Promise<string> {
    const serializedTransaction = this.serializeTransaction(transaction);
    return this.call<string>('send_transaction', [serializedTransaction]);
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
  
  async sendTransactions(transactions: RuntimeTransaction[]): Promise<string[]> {
    return this.call<string[]>('send_transactions', [transactions]);
  }

  async getBlockCount(): Promise<number> {
    return this.call<number>('get_block_count', []);
  }

  async startDkg(): Promise<void> {
    return this.call<void>('start_dkg', []);
  }

  async getBlockHash(height: number): Promise<string> {
    return this.call<string>('get_block_hash', height);
  }

  async getBlock(hash: string): Promise<Block> {
    return this.call<Block>('get_block', hash);
  }

  async getProcessedTransaction(txId: string): Promise<ProcessedTransaction> {
    return this.call<ProcessedTransaction>('get_processed_transaction', txId);
  }

  private createInstruction(programId: Pubkey, accounts: AccountMeta[], data: number[]): Instruction {
    return {
      programId,
      accounts,
      data,
    };
  }

  private createMessage(signers: Pubkey[], instructions: Instruction[]): Message {
    return {
      signers,
      instructions,
    };
  }

  async createArchAccount(privateKey: Uint8Array, txid: string, vout: number): Promise<string> {
    const publicKey = secp256k1.getPublicKey(privateKey, true);
    const pubkey = new Pubkey(publicKey.slice(1)); // Remove the first byte (0x02 or 0x03)

    const systemProgramId = new Pubkey(new Uint8Array(32).fill(0, 0, 31).fill(1, 31));
    
    const instruction = this.createInstruction(
      systemProgramId,
      [{
        pubkey,
        isSigner: true,
        isWritable: true,
      }],
      this.encodeCreateAccountData(txid, vout)
    );

    const message = this.createMessage([pubkey], [instruction]);
    const transaction = await this.signTransaction(message, [privateKey]);
    
    return this.sendTransaction(transaction);
  }

  private async signTransaction(message: Message, signers: Uint8Array[]): Promise<RuntimeTransaction> {
    const messageHash = sha256(this.encodeMessage(message));
    
    const signatures = await Promise.all(signers.map(async (signer) => {
      if (!secp256k1.utils.isValidPrivateKey(signer)) {
        throw new Error('Invalid private key');
      }
      
      const signature = await secp256k1.schnorr.sign(messageHash, signer);
      return Buffer.from(signature).toString('hex');
    }));

    return {
      version: 0,
      signatures,
      message,
    };
  }

  private encodeMessage(message: Message): Uint8Array {
    const instructionCount = message.instructions.length;
    const signerCount = message.signers.length;

    // Calculate the total length of the encoded message
    let totalLength = 4 + // 4 bytes for signer count
                      32 * signerCount + // 32 bytes per signer pubkey
                      4 + // 4 bytes for instruction count
                      message.instructions.reduce((acc, instruction) => {
                        return acc + this.getEncodedInstructionLength(instruction);
                      }, 0);

    const buffer = Buffer.alloc(totalLength);
    let offset = 0;

    // Encode signer count
    buffer.writeUInt32LE(signerCount, offset);
    offset += 4;

    // Encode signer pubkeys
    for (const signer of message.signers) {
      buffer.set(signer.bytes, offset);
      offset += 32;
    }

    // Encode instruction count
    buffer.writeUInt32LE(instructionCount, offset);
    offset += 4;

    // Encode instructions
    for (const instruction of message.instructions) {
      offset = this.encodeInstruction(instruction, buffer, offset);
    }

    return new Uint8Array(buffer);
  }

  private getEncodedInstructionLength(instruction: Instruction): number {
    return 32 + // program_id
           4 + // account count
           instruction.accounts.length * (32 + 1 + 1) + // pubkey + is_signer + is_writable
           4 + // data length
           instruction.data.length; // data
  }

  private encodeInstruction(instruction: Instruction, buffer: Buffer, offset: number): number {
    // Encode program_id
    buffer.set(instruction.programId.bytes, offset);
    offset += 32;

    // Encode account count
    buffer.writeUInt32LE(instruction.accounts.length, offset);
    offset += 4;

    // Encode accounts
    for (const account of instruction.accounts) {
      buffer.set(account.pubkey.bytes, offset);
      offset += 32;
      buffer.writeUInt8(account.isSigner ? 1 : 0, offset);
      offset += 1;
      buffer.writeUInt8(account.isWritable ? 1 : 0, offset);
      offset += 1;
    }

    // Encode data length
    buffer.writeUInt32LE(instruction.data.length, offset);
    offset += 4;

    // Encode data
    buffer.set(instruction.data, offset);
    offset += instruction.data.length;

    return offset;
  }
}
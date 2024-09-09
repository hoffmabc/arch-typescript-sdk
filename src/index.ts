import axios, { AxiosInstance } from 'axios';
import * as secp256k1 from '@noble/secp256k1';
import { sha256 } from '@noble/hashes/sha256';
import { Buffer } from 'buffer';
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
import { bytesToHex } from '@noble/hashes/utils';

/**
 * ArchRpcClient provides methods to interact with the Arch blockchain network.
 */
export class ArchRpcClient {
  private rpc: AxiosInstance;

  /**
   * Creates a new instance of ArchRpcClient.
   * @param url The URL of the Arch RPC endpoint.
   */
  constructor(url: string) {
    this.rpc = axios.create({
      baseURL: url,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // RPC Communication Methods

  /**
   * Sends an RPC call to the Arch network.
   * @param method The RPC method name.
   * @param params The parameters for the RPC method.
   * @returns A promise that resolves with the result of the RPC call.
   */
  private async call<T>(method: string, params: any): Promise<T> {
    const payload = {
      jsonrpc: '2.0',
      id: Date.now().toString(),
      method,
      params
    };
    console.log(payload);
    const response = await this.rpc.post('', payload);
    if (response.data.error) {
      throw new Error(response.data.error.message);
    }
    return response.data.result;
  }

  // Account Creation and Management Methods

  /**
   * Creates a new Arch account.
   * @param privateKey The private key of the account creator.
   * @param txid The transaction ID associated with the account creation.
   * @param vout The output index in the transaction.
   * @returns A promise that resolves with the transaction ID of the account creation.
   */
  async createArchAccount(privateKey: Uint8Array, txid: string, vout: number): Promise<string> {
    const publicKey = secp256k1.getPublicKey(privateKey, true);
    const pubkey = new Pubkey(publicKey.slice(1)); // Remove the first byte (0x02 or 0x03)

    const systemprogram_id = Pubkey.systemProgram();
    const instruction = this.createCreateAccountInstruction(pubkey, txid, vout);
    const message = this.createMessage([pubkey], [instruction]);
    const signatures = await this.signMessage(message, [privateKey]);
    
    const transaction = {
      message: message,
      signatures: signatures,
      version: 0
    };

    return this.sendTransaction(transaction);
  }

  /**
   * Creates an instruction for creating a new account.
   * @param pubkey The public key of the new account.
   * @param txid The transaction ID associated with the account creation.
   * @param vout The output index in the transaction.
   * @returns The create account instruction.
   */
  private createCreateAccountInstruction(pubkey: Pubkey, txid: string, vout: number): Instruction {
    return {
      program_id: Pubkey.systemProgram(),
      accounts: [{
        pubkey: pubkey,
        is_signer: true,
        is_writable: true,
      }],
      data: this.encodeCreateAccountData(txid, vout),
    };
  }

  /**
   * Encodes the data for creating a new account.
   * @param txid The transaction ID associated with the account creation.
   * @param vout The output index in the transaction.
   * @returns An array of numbers representing the encoded data.
   */
  private encodeCreateAccountData(txid: string, vout: number): number[] {
    const buffer = Buffer.alloc(37); // 32 bytes for txid + 4 bytes for vout + 1 byte for instruction type
    buffer.writeUInt8(0, 0); // Instruction type (0 for CreateAccount)
    Buffer.from(txid, 'hex').copy(buffer, 1);
    buffer.writeUInt32LE(vout, 33);
    return Array.from(buffer);
  }

  // Transaction Methods

  private serializeMessage(message: Message): number[] {
    const parts: number[] = [];
  
    // Number of signers
    parts.push(message.signers.length);
  
    // Signers
    message.signers.forEach(signer => {
      parts.push(...this.serializePubkey(signer));
    });
  
    // Number of instructions
    parts.push(message.instructions.length);
  
    // Instructions
    message.instructions.forEach(instruction => {
      parts.push(...this.serializeInstruction(instruction));
    });
  
    return parts;
  }

  /**
   * Sends multiple transactions to the Arch network.
   * @param transactions An array of transactions to send.
   * @returns A promise that resolves with an array of transaction IDs.
   */
  async sendTransactions(transactions: RuntimeTransaction[]): Promise<string[]> {
    const serializedTransactions = transactions.map(tx => this.serializeTransaction(tx));
    return this.call<string[]>('send_transactions', serializedTransactions);
  }

  async sendTransaction(transaction: RuntimeTransaction): Promise<string> {
    const serializedTransaction = this.serializeTransaction(transaction);    
    return this.call<string>('send_transaction', serializedTransaction);
  }

  /**
   * Signs a transaction message with the provided private keys.
   * @param message The transaction message to sign.
   * @param signers An array of private keys to sign the message with.
   * @returns A promise that resolves with the signed transaction.
   */
  private async signTransaction(message: Message, signers: Uint8Array[]): Promise<RuntimeTransaction> {
    const encodedMessage = this.encodeMessage(message);
    const messageHash = sha256(sha256(new Uint8Array(encodedMessage)));
    
    const signatures = await Promise.all(signers.map(async (signer) => {
      if (!secp256k1.utils.isValidPrivateKey(signer)) {
        throw new Error('Invalid private key');
      }
      const signature = await secp256k1.schnorr.sign(messageHash, signer);
      return Buffer.from(signature).toString('base64');
    }));
  
    return { version: 0, signatures, message };
  }


  // SignMessage 

  async signMessage(message: Message, signers: Uint8Array[]): Promise<string[]> {
    const encodedMessage = this.encodeMessage(message);
    const messageHash = sha256(bytesToHex(sha256(new Uint8Array(encodedMessage))));
    const signatures = await Promise.all(signers.map(async (signer) => {
      if (!secp256k1.utils.isValidPrivateKey(signer)) {
        throw new Error('Invalid private key');
      }
      console.log(`messageHash in hex: ${Buffer.from(messageHash).toString('hex')}`);
      const signature = await secp256k1.schnorr.sign(messageHash, signer);
      return bytesToHex(signature);
    }));
    return signatures;
  }

  // Serialization Methods

  /**
   * Serializes a transaction for sending to the Arch network.
   * @param transaction The transaction to serialize.
   * @returns The serialized transaction object.
   */
  private serializeTransaction(transaction: RuntimeTransaction): any {
    return {
      message: {
          signers: transaction.message.signers.map((signer: { bytes: Iterable<unknown> | ArrayLike<unknown>; }) => Array.from(signer.bytes)),
          instructions: transaction.message.instructions.map((inst: { program_id: { bytes: Iterable<unknown> | ArrayLike<unknown>; }; accounts: any[]; data: Iterable<unknown> | ArrayLike<unknown>; }) => ({
            program_id: Array.from(inst.program_id.bytes),
            accounts: inst.accounts.map(acc => ({
              pubkey: Array.from(acc.pubkey.bytes),
              is_signer: acc.is_signer,
              is_writable: acc.is_writable
            })),
            data: Array.from(inst.data)
          }))
        },      
      signatures: transaction.signatures.map(sig => Array.from(Buffer.from(sig, 'base64'))),
      version: transaction.version,
    };
  }


  /**
   * Serializes an instruction.
   * @param instruction The instruction to serialize.
   * @returns The serialized instruction object.
   */
  private serializeInstruction(instruction: Instruction): number[] {
    const parts: number[] = [];
  
    // Program ID
    parts.push(...this.serializePubkey(instruction.program_id));
  
    // Number of accounts
    parts.push(instruction.accounts.length);
  
    // Accounts
    instruction.accounts.forEach(account => {
      parts.push(...this.serializePubkey(account.pubkey));
      parts.push(account.is_signer ? 1 : 0);
      parts.push(account.is_writable ? 1 : 0);
    });
  
    // Instruction data length (8 bytes, little-endian)
    const dataLengthBuffer = new Uint8Array(8);
    new DataView(dataLengthBuffer.buffer).setBigUint64(0, BigInt(instruction.data.length), true);
    parts.push(...dataLengthBuffer);
  
    // Instruction data
    parts.push(...instruction.data);
  
    return parts;
  }

  private serializePubkey(pubkey: Pubkey): number[] {
    return Array.from(pubkey.bytes);
  }

  private encodeMessage(message: Message): number[] {
    const parts: number[] = [];
  
    // Number of signers
    parts.push(message.signers.length);
  
    // Signers
    message.signers.forEach(signer => {
      parts.push(...this.serializePubkey(signer));
      parts.push(...new Array(4).fill(0)); // 4 bytes padding after each pubkey
    });
  
    // Number of instructions
    parts.push(message.instructions.length);
  
    // Instructions
    message.instructions.forEach(instruction => {
      parts.push(...this.serializePubkey(instruction.program_id));
      parts.push(...new Array(4).fill(0)); // 4 bytes padding after program ID
      
      // Number of accounts
      parts.push(...this.serializeU32(instruction.accounts.length));
      parts.push(...new Array(4).fill(0)); // 4 bytes padding before accounts
  
      // Accounts
      instruction.accounts.forEach(account => {
        parts.push(...this.serializeAccountMeta(account));
      });
  
      // Data length
      parts.push(...this.serializeU32(instruction.data.length));
  
      // Data
      parts.push(...instruction.data);
    });
  
    return parts;
  }

  private serializeU32(value: number): number[] {
    const buffer = new Uint8Array(4);
    new DataView(buffer.buffer).setUint32(0, value, true); // true for little-endian
    return Array.from(buffer);
  }

  private serializeAccountMeta(accountMeta: AccountMeta): number[] {
    return [
      ...this.serializePubkey(accountMeta.pubkey),
      accountMeta.is_signer ? 1 : 0,
      accountMeta.is_writable ? 1 : 0
    ];
  }

  /**
   * Calculates the length of an encoded instruction.
   * @param instruction The instruction to calculate the length for.
   * @returns The length of the encoded instruction.
   */
  private getEncodedInstructionLength(instruction: Instruction): number {
    return 32 + // program_id
           4 + // account count
           instruction.accounts.length * (32 + 1 + 1) + // pubkey + is_signer + is_writable
           4 + // data length
           instruction.data.length; // data
  }

  /**
   * Encodes an instruction into a buffer.
   * @param instruction The instruction to encode.
   * @param buffer The buffer to encode the instruction into.
   * @param offset The starting offset in the buffer.
   * @returns The new offset after encoding the instruction.
   */
  private encodeInstruction(instruction: Instruction, buffer: Buffer, offset: number): number {
    buffer.set(instruction.program_id.bytes, offset);
    offset += 32;

    buffer.writeUInt32LE(instruction.accounts.length, offset);
    offset += 4;

    for (const account of instruction.accounts) {
      buffer.set(account.pubkey.bytes, offset);
      offset += 32;
      buffer.writeUInt8(account.is_signer ? 1 : 0, offset);
      offset += 1;
      buffer.writeUInt8(account.is_writable ? 1 : 0, offset);
      offset += 1;
    }

    buffer.writeUInt32LE(instruction.data.length, offset);
    offset += 4;
    buffer.set(instruction.data, offset);
    offset += instruction.data.length;

    return offset;
  }

  // Utility Methods

  /**
   * Creates an instruction.
   * @param program_id The program ID for the instruction.
   * @param accounts The accounts involved in the instruction.
   * @param data The data for the instruction.
   * @returns The created instruction.
   */
  private createInstruction(program_id: Pubkey, accounts: AccountMeta[], data: number[]): Instruction {
    return { program_id, accounts, data };
  }

  /**
   * Creates a message.
   * @param signers The signers of the message.
   * @param instructions The instructions in the message.
   * @returns The created message.
   */
  private createMessage(signers: Pubkey[], instructions: Instruction[]): Message {
    return { signers, instructions };
  }

  // Network Query Methods

  /**
   * Checks if the node is ready.
   * @returns A promise that resolves with a boolean indicating if the node is ready.
   */
  async isNodeReady(): Promise<boolean> {
    return this.call<boolean>('is_node_ready', []);
  }

  /**
   * Gets the address for an account.
   * @param accountPubkey The public key of the account.
   * @returns A promise that resolves with the account address.
   */
  async getAccountAddress(accountPubkey: Pubkey): Promise<string> {
    return this.call<string>('get_account_address', accountPubkey.serialize());
  }

  /**
   * Reads account information.
   * @param pubkey The public key of the account.
   * @returns A promise that resolves with the account information.
   */
  async readAccountInfo(pubkey: Pubkey): Promise<AccountInfoResult> {
    return this.call<AccountInfoResult>('read_account_info', pubkey.serialize());
  }

  /**
   * Gets the current block count.
   * @returns A promise that resolves with the current block count.
   */
  async getBlockCount(): Promise<number> {
    return this.call<number>('get_block_count', []);
  }

  /**
   * Starts the Distributed Key Generation process.
   * @returns A promise that resolves when the DKG process has started.
   */
  async startDkg(): Promise<void> {
    return this.call<void>('start_dkg', []);
  }

  /**
   * Gets the block hash for a given height.
   * @param height The block height.
   * @returns A promise that resolves with the block hash.
   */
  async getBlockHash(height: number): Promise<string> {
    return this.call<string>('get_block_hash', height);
  }

  /**
   * Gets block information for a given hash.
   * @param hash The block hash.
   * @returns A promise that resolves with the block information.
   */
  async getBlock(hash: string): Promise<Block> {
    return this.call<Block>('get_block', hash);
  }

  /**
   * Gets information about a processed transaction.
   * @param txId The transaction ID.
   * @returns A promise that resolves with the processed transaction information.
   */
  async getProcessedTransaction(txId: string): Promise<ProcessedTransaction> {
    return this.call<ProcessedTransaction>('get_processed_transaction', txId);
  }
}
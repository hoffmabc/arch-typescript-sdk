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
      params,
    };
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

    const systemProgramId = Pubkey.systemProgram();
    const instruction = this.createCreateAccountInstruction(pubkey, txid, vout);
    const message = this.createMessage([pubkey], [instruction]);
    const transaction = await this.signTransaction(message, [privateKey]);
    
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
      programId: Pubkey.systemProgram(),
      accounts: [{
        pubkey: pubkey,
        isSigner: true,
        isWritable: true,
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

  /**
   * Sends a transaction to the Arch network.
   * @param transaction The transaction to send.
   * @returns A promise that resolves with the transaction ID.
   */
  async sendTransaction(transaction: RuntimeTransaction): Promise<string> {
    const serializedTransaction = this.serializeTransaction(transaction);
    return this.call<string>('send_transaction', serializedTransaction);
  }

  /**
   * Sends multiple transactions to the Arch network.
   * @param transactions An array of transactions to send.
   * @returns A promise that resolves with an array of transaction IDs.
   */
  async sendTransactions(transactions: RuntimeTransaction[]): Promise<string[]> {
    return this.call<string[]>('send_transactions', [transactions]);
  }

  /**
   * Signs a transaction message with the provided private keys.
   * @param message The transaction message to sign.
   * @param signers An array of private keys to sign the message with.
   * @returns A promise that resolves with the signed transaction.
   */
  private async signTransaction(message: Message, signers: Uint8Array[]): Promise<RuntimeTransaction> {
    const encodedMessage = this.encodeMessage(message);
    const messageHash = sha256(encodedMessage);
    
    const signatures = await Promise.all(signers.map(async (signer) => {
      if (!secp256k1.utils.isValidPrivateKey(signer)) {
        throw new Error('Invalid private key');
      }
      const signature = await secp256k1.schnorr.sign(messageHash, signer);
      return Buffer.from(signature).toString('hex');
    }));

    return { version: 0, signatures, message };
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
        signers: transaction.message.signers.map(signer => this.serializePubkey(signer)),
        instructions: transaction.message.instructions.map(inst => this.serializeInstruction(inst))
      },
      signatures: transaction.signatures.map(sig => Array.from(Buffer.from(sig, 'hex'))),
      version: transaction.version
    };
  }

  /**
   * Serializes a public key.
   * @param pubkey The public key to serialize.
   * @returns An array of numbers representing the serialized public key.
   */
  private serializePubkey(pubkey: Pubkey): number[] {
    return Array.from(pubkey.bytes);
  }

  /**
   * Serializes an instruction.
   * @param instruction The instruction to serialize.
   * @returns The serialized instruction object.
   */
  private serializeInstruction(instruction: Instruction): any {
    return {
      program_id: this.serializePubkey(instruction.programId),
      accounts: instruction.accounts.map(account => ({
        pubkey: this.serializePubkey(account.pubkey),
        is_signer: account.isSigner,
        is_writable: account.isWritable
      })),
      data: Array.from(instruction.data)
    };
  }

  /**
   * Encodes a message for signing.
   * @param message The message to encode.
   * @returns A Uint8Array representing the encoded message.
   */
  private encodeMessage(message: Message): Uint8Array {
    const instructionCount = message.instructions.length;
    const signerCount = message.signers.length;

    let totalLength = 4 + // 4 bytes for signer count
                      32 * signerCount + // 32 bytes per signer pubkey
                      4 + // 4 bytes for instruction count
                      message.instructions.reduce((acc, instruction) => {
                        return acc + this.getEncodedInstructionLength(instruction);
                      }, 0);

    const buffer = Buffer.alloc(totalLength);
    let offset = 0;

    // Encode signer count and pubkeys
    buffer.writeUInt32LE(signerCount, offset);
    offset += 4;
    for (const signer of message.signers) {
      buffer.set(signer.bytes, offset);
      offset += 32;
    }

    // Encode instruction count and instructions
    buffer.writeUInt32LE(instructionCount, offset);
    offset += 4;
    for (const instruction of message.instructions) {
      offset = this.encodeInstruction(instruction, buffer, offset);
    }

    return new Uint8Array(buffer);
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
    buffer.set(instruction.programId.bytes, offset);
    offset += 32;

    buffer.writeUInt32LE(instruction.accounts.length, offset);
    offset += 4;

    for (const account of instruction.accounts) {
      buffer.set(account.pubkey.bytes, offset);
      offset += 32;
      buffer.writeUInt8(account.isSigner ? 1 : 0, offset);
      offset += 1;
      buffer.writeUInt8(account.isWritable ? 1 : 0, offset);
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
   * @param programId The program ID for the instruction.
   * @param accounts The accounts involved in the instruction.
   * @param data The data for the instruction.
   * @returns The created instruction.
   */
  private createInstruction(programId: Pubkey, accounts: AccountMeta[], data: number[]): Instruction {
    return { programId, accounts, data };
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
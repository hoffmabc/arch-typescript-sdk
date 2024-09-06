import { ArchRpcClient } from '../src/index';
import { Pubkey, Instruction, Message, RuntimeTransaction } from '../src/types';
import axios, { AxiosInstance } from 'axios';

jest.mock('axios');

describe('ArchRpcClient', () => {
  let client: ArchRpcClient;
  let mockAxiosInstance: jest.Mocked<AxiosInstance>;

  beforeEach(() => {
    mockAxiosInstance = {
      post: jest.fn(),
    } as any;
    (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);
    client = new ArchRpcClient('http://test-url.com');
  });

  test('serializePubkey should return correct array', () => {
    const pubkey = new Pubkey(new Uint8Array(32).fill(1));
    const result = (client as any).serializePubkey(pubkey);
    expect(result).toEqual(Array(32).fill(1));
  });

  test('serializeInstruction should return correct object', () => {
    const pubkey = new Pubkey(new Uint8Array(32).fill(1));
    const instruction: Instruction = {
      programId: pubkey,
      accounts: [{ pubkey, isSigner: true, isWritable: true }],
      data: [0, 1, 2],
    };
    const result = (client as any).serializeInstruction(instruction);
    expect(result).toEqual({
      accounts: [{ is_signer: true, is_writable: true, pubkey: Array(32).fill(1) }],
      data: [0, 1, 2],
      program_id: Array(32).fill(1),
    });
  });

  test('serializeMessage should return correct object', () => {
    const pubkey = new Pubkey(new Uint8Array(32).fill(1));
    const instruction: Instruction = {
      programId: pubkey,
      accounts: [{ pubkey, isSigner: true, isWritable: true }],
      data: [0, 1, 2],
    };
    const message: Message = {
      signers: [pubkey],
      instructions: [instruction],
    };
    const result = (client as any).serializeMessage(message);
    expect(result).toEqual({
      instructions: [{
        accounts: [{ is_signer: true, is_writable: true, pubkey: Array(32).fill(1) }],
        data: [0, 1, 2],
        program_id: Array(32).fill(1),
      }],
      signers: [Array(32).fill(1)],
    });
  });

  test('serializeTransaction should return correct object', () => {
    const pubkey = new Pubkey(new Uint8Array(32).fill(1));
    const instruction: Instruction = {
      programId: pubkey,
      accounts: [{ pubkey, isSigner: true, isWritable: true }],
      data: [0, 1, 2],
    };
    const message: Message = {
      signers: [pubkey],
      instructions: [instruction],
    };
    const transaction: RuntimeTransaction = {
      version: 0,
      signatures: ['aabbcc'], // This will be converted to a number array in serialization
      message,
    };
    const result = (client as any).serializeTransaction(transaction);
    expect(result).toEqual({
      message: {
        instructions: [{
          accounts: [{ is_signer: true, is_writable: true, pubkey: Array(32).fill(1) }],
          data: [0, 1, 2],
          program_id: Array(32).fill(1),
        }],
        signers: [Array(32).fill(1)],
      },
      signatures: [[170, 187, 204]], // aabbcc in hex
      version: 0,
    });
  });

  test('sendTransaction should call RPC with correct params', async () => {
    const pubkey = new Pubkey(new Uint8Array(32).fill(1));
    const instruction: Instruction = {
      programId: pubkey,
      accounts: [{ pubkey, isSigner: true, isWritable: true }],
      data: [0, 1, 2],
    };
    const message: Message = {
      signers: [pubkey],
      instructions: [instruction],
    };
    const transaction: RuntimeTransaction = {
      version: 0,
      signatures: ['aabbcc'],
      message,
    };

    mockAxiosInstance.post.mockResolvedValue({ data: { result: 'success' } });

    await client.sendTransaction(transaction);

    expect(mockAxiosInstance.post).toHaveBeenCalledWith('', {
      jsonrpc: '2.0',
      id: 'curlycurl',
      method: 'send_transaction',
      params: [{
        message: {
          instructions: [{
            accounts: [{ is_signer: true, is_writable: true, pubkey: Array(32).fill(1) }],
            data: [0, 1, 2],
            program_id: Array(32).fill(1),
          }],
          signers: [Array(32).fill(1)],
        },
        signatures: [[170, 187, 204]],
        version: 0,
      }],
    });
  });
});
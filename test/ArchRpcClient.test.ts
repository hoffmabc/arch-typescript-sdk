import { sha256 } from '@noble/hashes/sha256';
import { ArchRpcClient } from '../src/index';
import { Pubkey, Instruction, Message, RuntimeTransaction } from '../src/types';
import axios, { AxiosInstance } from 'axios';
import { bytesToHex } from '@noble/hashes/utils';

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
    expect(result).toEqual(Array.from(new Uint8Array(32).fill(1)));
  });

  test('serializeInstruction should return correct array', () => {
    const pubkey = new Pubkey(new Uint8Array(32).fill(1));
    const instruction: Instruction = {
      program_id: pubkey,
      accounts: [{ pubkey, is_signer: true, is_writable: true }],
      data: [0, 1, 2],
    };
    const result = (client as any).serializeInstruction(instruction);
    
    const expected = [
      ...Array(32).fill(1), // program_id
      1, // number of accounts
      ...Array(32).fill(1), // account pubkey
      1, // is_signer
      1, // is_writable
      3, 0, 0, 0, 0, 0, 0, 0, // data length (8 bytes, little-endian)
      0, 1, 2 // data
    ];
  
    expect(result).toEqual(expected);
  });
  
  test('message serialization should match Rust implementation', () => {
    // Create the actual Pubkey from the transaction
    const actualPubkey = new Pubkey(new Uint8Array([153, 105, 27, 79, 6, 89, 70, 57, 170, 25, 61, 15, 70, 7, 105, 246, 155, 77, 20, 48, 155, 225, 56, 42, 187, 55, 125, 183, 177, 148, 35, 130]));
  
    // Create the system program Pubkey
    const systemProgramPubkey = new Pubkey(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]));
  
    // Create the test instruction
    const instruction: Instruction = {
      program_id: systemProgramPubkey,
      accounts: [
        {
          pubkey: actualPubkey,
          is_signer: true,
          is_writable: true,
        }
      ],
      data: new Array(37).fill(0), // 37 zeros as per the actual data
    };
  
    // Create the test message
    const message: Message = {
      signers: [actualPubkey],
      instructions: [instruction],
    };
  
    // Serialize the message
    const serialized = (client as any).serializeMessage(message);

    console.log('Serialized message (bytes):', serialized);

    // Perform double SHA256 hash
    const firstHash = sha256(new Uint8Array(serialized));
    console.log('First hash (hex):', bytesToHex(firstHash));
    const hash = sha256(bytesToHex(firstHash));
    console.log('Double hashed message (hex):', bytesToHex(hash));

    console.log('Double hashed message (bytes):', hash);

    // Convert the hash to a hexadecimal string
    const hashHex = bytesToHex(hash);

    console.log('Serialized message double hashed (hex):', hashHex);

    // Compare with the actual hash from the transaction
    const expectedHash = 'f9a42ceb647de271a0d0e81bed77260d2c21e7e947f8fea8cd1ac42e6151a51e';
    expect(hashHex).toBe(expectedHash);
  });

  test('serializeTransaction should return correct object', () => {
    const pubkey = new Pubkey(new Uint8Array(32).fill(1));
    const instruction: Instruction = {
      program_id: pubkey,
      accounts: [{ pubkey, is_signer: true, is_writable: true }],
      data: [0, 1, 2],
    };
    const message: Message = {
      signers: [pubkey],
      instructions: [instruction],
    };
    const transaction: RuntimeTransaction = {
      version: 0,
      signatures: ['AAAA'],  // Base64 encoded signature
      message,
    };

    const result = (client as any).serializeTransaction(transaction);

    expect(result).toEqual({
      message: {
        signers: [Array(32).fill(1)],
        instructions: [{
          program_id: Array(32).fill(1),
          accounts: [{ pubkey: Array(32).fill(1), is_signer: true, is_writable: true }],
          data: [0, 1, 2],
        }],
      },
      signatures: [[0, 0, 0]],  // Base64 decoded signature
      version: 0,
    });
  });
});
import { sha256 } from '@noble/hashes/sha256';
import * as secp256k1 from '@noble/secp256k1';
import { ArchRpcClient } from '../src/index';
import { Pubkey, Instruction, Message, RuntimeTransaction } from '../src/types';
import axios, { AxiosInstance } from 'axios';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

jest.mock('axios');

  describe('TypeScript-Rust Compatibility Test', () => {
    it('should generate compatible keys, messages, and signatures', async () => {
      const client = new ArchRpcClient('http://localhost:8000');
  
      // Generate a key pair
      //const privateKey = secp256k1.utils.randomPrivateKey();
      const privateKey = hexToBytes('04734278f0a035427c79b76726233aeb3832f45562f3980ec53d6aedf0f3d8df');
      const publicKey = secp256k1.schnorr.getPublicKey(privateKey);
  
      console.log('Private Key:', bytesToHex(privateKey));
      console.log('Public Key:', bytesToHex(publicKey));
  
      // Create Pubkeys
      const actualPubkey = new Pubkey(publicKey);
      const systemProgramPubkey = Pubkey.systemProgram();
  
      // Create the instruction
      const instruction: Instruction = {
        program_id: systemProgramPubkey,
        accounts: [{ pubkey: actualPubkey, is_signer: true, is_writable: true }],
        data: new Array(37).fill(0)
      };
  
      // Create the message
      const message: Message = {
        signers: [actualPubkey],
        instructions: [instruction]
      };
  
      // Serialize the message
      const serialized = client.encodeMessage(message);
      console.log('Serialized Message:', bytesToHex(new Uint8Array(serialized)));
  
      // Hash the message (double SHA256)
      const firstHash = sha256(new Uint8Array(serialized));

      // Hash the hex string not the bytes to match the Rust server
      const messageHash = sha256(bytesToHex(firstHash));
      const messageHashHex = bytesToHex(messageHash);
      console.log('Message Hash:', messageHashHex);
  
      // Sign the message
      const signature = await secp256k1.schnorr.sign(messageHash, privateKey);
      const signatureHex = bytesToHex(signature);
      console.log('Signature:', signatureHex);
  
      // Create a RuntimeTransaction
      const transaction: RuntimeTransaction = {
        version: 0,
        signatures: [signatureHex],
        message: message
      };
  
      // Verify the signature
      const isValid = await secp256k1.schnorr.verify(signature, messageHash, publicKey);
      console.log('Signature Valid:', isValid);
      expect(isValid).toBe(true);
  
      // Output data for Rust comparison
      console.log('\nData for Rust comparison:');
      console.log(`Pubkey bytes: ${actualPubkey.bytes}`);
      console.log(`Public Key (hex): ${actualPubkey.toString()}`);
      console.log(`Serialized Message (hex): ${bytesToHex(new Uint8Array(serialized))}`);
      console.log(`Message Hash (hex): ${messageHashHex}`);
      console.log(`Signature (hex): ${signatureHex}`);
      console.log(`Signature bytes: ${signature}`)
  
      return {
        publicKey: actualPubkey.toString(),
        serializedMessage: bytesToHex(new Uint8Array(serialized)),
        messageHash: messageHashHex,
        signature: signatureHex
      };
    });
  });

// describe('ArchRpcClient', () => {
//   let client: ArchRpcClient;
//   let mockAxiosInstance: jest.Mocked<AxiosInstance>;

//   beforeEach(() => {
//     mockAxiosInstance = {
//       post: jest.fn(),
//     } as any;
//     (axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);
//     client = new ArchRpcClient('http://test-url.com');
//   });

//   test('serializePubkey should return correct array', () => {
//     const pubkey = new Pubkey(new Uint8Array(32).fill(1));
//     const result = (client as any).serializePubkey(pubkey);
//     expect(result).toEqual(Array.from(new Uint8Array(32).fill(1)));
//   });

//   test('serializeInstruction should return correct array', () => {
//     const pubkey = new Pubkey(new Uint8Array(32).fill(1));
//     const instruction: Instruction = {
//       program_id: pubkey,
//       accounts: [{ pubkey, is_signer: true, is_writable: true }],
//       data: [0, 1, 2],
//     };
//     const result = (client as any).serializeInstruction(instruction);
    
//     const expected = [
//       ...Array(32).fill(1), // program_id
//       1, // number of accounts (1 byte)
//       ...Array(32).fill(1), // account pubkey
//       1, // is_signer
//       1, // is_writable
//       3, 0, 0, 0, 0, 0, 0, 0, // data length (8 bytes, little-endian)
//       0, 1, 2 // data
//     ];
  
//     expect(result).toEqual(expected);
//   });
  
//   test('message serialization should match Rust implementation', async () => {
//     // Create the actual Pubkey from the transaction
//     const actualPubkey = new Pubkey(new Uint8Array([191, 196, 175, 98, 46, 129, 13, 33, 167, 69, 18, 250, 45, 248, 254, 56, 212, 224, 253, 175, 26, 90, 37, 195, 233, 120, 46, 24, 183, 135, 168, 136]));
  
//     // Create the system program Pubkey
//     const systemProgramPubkey = new Pubkey(new Uint8Array([0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1]));
  
//     // Create the test instruction
//     const instruction: Instruction = {
//       program_id: systemProgramPubkey,
//       accounts: [
//         {
//           pubkey: actualPubkey,
//           is_signer: true,
//           is_writable: true,
//         }
//       ],
//       data: new Array(37).fill(0), // 37 zeros as per the actual data
//     };
  
//     // Create the test message
//     const message: Message = {
//       signers: [actualPubkey],
//       instructions: [instruction],
//     };
  
//     // Serialize the message
//     const serialized = (client as any).encodeMessage(message);

//     console.log('Serialized message (bytes):', serialized);

//     // Perform double SHA256 hash
//     const firstHash = sha256(new Uint8Array(serialized));
//     const hash = sha256(firstHash);
//     console.log('Hashed message (hex):', bytesToHex(hash));

//     console.log('Hashed message (bytes):', Array.from(hash));

//     // Convert the hash to a hexadecimal string
//     const hashHex = bytesToHex(hash);

//     console.log('Serialized message hashed (hex):', hashHex);

//     // Compare with the actual hash from the transaction
//     const expectedHash = '8c6aaac0b1f4c4b4d28d1242d7f6ed547c049f6221e5857a5c054e4f3afd0563';
//     expect(hashHex).toBe(expectedHash);

//     // Now let's verify the signature
//     const signatureHex = '123651d58c3711c3286abdc5ee888305c2c8732b352e5d835fa50b00833de0538e0da4b4bf752227d89727ef962ba9583384eed180cfcf0d738caecb70c86c26';
//     const signature = hexToBytes(signatureHex);
//     const publicKey = secp256k1.getPublicKey(actualPubkey.bytes, true);
//     const xOnlyPubKey = secp256k1.Point.fromHex(publicKey.slice(1)).toRawX();

//     const isValid = await secp256k1.schnorr.verify(signature, hash, xOnlyPubKey);
//     expect(isValid).toBe(true);
//   });

//   test('serializeTransaction should return correct object', () => {
//     const pubkey = new Pubkey(new Uint8Array(32).fill(1));
//     const instruction: Instruction = {
//       program_id: pubkey,
//       accounts: [{ pubkey, is_signer: true, is_writable: true }],
//       data: [0, 1, 2],
//     };
//     const message: Message = {
//       signers: [pubkey],
//       instructions: [instruction],
//     };
//     const signatureHex = '123651d58c3711c3286abdc5ee888305c2c8732b352e5d835fa50b00833de0538e0da4b4bf752227d89727ef962ba9583384eed180cfcf0d738caecb70c86c26';
//     const transaction: RuntimeTransaction = {
//       version: 0,
//       signatures: [signatureHex],
//       message,
//     };

//     const result = (client as any).serializeTransaction(transaction);

//     expect(result).toEqual({
//       message: {
//         signers: [Array(32).fill(1)],
//         instructions: [{
//           program_id: Array(32).fill(1),
//           accounts: [{ pubkey: Array(32).fill(1), is_signer: true, is_writable: true }],
//           data: [0, 1, 2],
//         }],
//       },
//       signatures: [Array.from(hexToBytes(signatureHex))],
//       version: 0,
//     });
//   });
// });
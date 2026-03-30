export declare class CryptoService {
    static generateKeyPairs(): Promise<{
        classic: any;
        kyber: {
            publicKey: Uint8Array<ArrayBufferLike>;
            secretKey: Uint8Array<ArrayBufferLike>;
        };
    }>;
    static hybridEncrypt(message: string, recipientClassicPK: Uint8Array, recipientKyberPK: Uint8Array, senderClassicSK: Uint8Array): Promise<{
        ciphertext: any;
        kyberCT: any;
    }>;
    static hybridDecrypt(ciphertextBase64: string, kyberCTBase64: string, senderClassicPK: Uint8Array, recipientKyberSK: Uint8Array, recipientClassicSK: Uint8Array): Promise<any>;
}

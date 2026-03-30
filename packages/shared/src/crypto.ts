import sodium_ from 'libsodium-wrappers';
import { MlKem768 } from 'crystals-kyber-js';

const sodium = (sodium_ as any).default || sodium_;

export class CryptoService {

    static async generateKeyPairs() {
        await sodium.ready;
        const classic = sodium.crypto_box_keypair();   // X25519
        const kyberImpl = new MlKem768();
        const [kyberPK, kyberSK] = await kyberImpl.generateKeyPair();
        return {
            classic,
            kyber: { publicKey: kyberPK, secretKey: kyberSK }
        };
    }

    static async hybridEncrypt(
        message: string,
        recipientClassicPK: Uint8Array,
        recipientKyberPK: Uint8Array,
        senderClassicSK: Uint8Array
    ) {
        await sodium.ready;

        // X25519 shared secret
        const classicSS = sodium.crypto_scalarmult(senderClassicSK, recipientClassicPK);

        // Kyber encapsulation
        const kyberImpl = new MlKem768();
        const [kyberSS, kyberCT] = await kyberImpl.encap(recipientKyberPK);

        // XOR + BLAKE2b -> мастер-ключ
        const combined = new Uint8Array([...classicSS, ...kyberSS]);
        const masterKey = sodium.crypto_generichash(32, combined, null);

        // Финальное шифрование XSalsa20-Poly1305
        const nonce = sodium.randombytes_buf(24);
        const encrypted = sodium.crypto_secretbox_easy(message, nonce, masterKey);

        return {
            ciphertext: sodium.to_base64(new Uint8Array([...nonce, ...encrypted])),
            kyberCT: sodium.to_base64(kyberCT)
        };
    }

    static async hybridDecrypt(
        ciphertextBase64: string,
        kyberCTBase64: string,
        senderClassicPK: Uint8Array,
        recipientKyberSK: Uint8Array,
        recipientClassicSK: Uint8Array
    ) {
        await sodium.ready;

        const classicSS = sodium.crypto_scalarmult(recipientClassicSK, senderClassicPK);

        const kyberImpl = new MlKem768();
        const kyberSS = await kyberImpl.decap(sodium.from_base64(kyberCTBase64), recipientKyberSK);

        const masterKey = sodium.crypto_generichash(32, new Uint8Array([...classicSS, ...kyberSS]), null);

        const data = sodium.from_base64(ciphertextBase64);
        const nonce = data.slice(0, 24);
        const actualCiphertext = data.slice(24);

        const decrypted = sodium.crypto_secretbox_open_easy(actualCiphertext, nonce, masterKey);

        if (decrypted) {
            return sodium.to_string(decrypted);
        }
        throw new Error('Failed to decrypt message');
    }
}

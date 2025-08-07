import { RSABSSA } from '@cloudflare/blindrsa-ts';
import { webcrypto } from 'crypto';

function getDetailedTypeInfo(obj: any): string {
    const type = obj.constructor.name;
    const size = obj instanceof ArrayBuffer || obj instanceof Uint8Array ? obj.byteLength : 'N/A';
    return `${type} (${size} bytes)`;
}

async function main() {
    try {
        // Initialize Blind RSA with SHA-384 and PSS padding
        const suite = RSABSSA.SHA384.PSS.Randomized();
        console.log('\n=== Suite Information ===');
        console.log('Suite:', getDetailedTypeInfo(suite));
        
        // Generate key pair
        const { privateKey, publicKey } = await suite.generateKey({
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1])
        });

        // Export keys to see their actual format
        const exportedPublicKey = await webcrypto.subtle.exportKey('spki', publicKey);
        const exportedPrivateKey = await webcrypto.subtle.exportKey('pkcs8', privateKey);

        console.log('\n=== Key Information ===');
        console.log('Private Key:', getDetailedTypeInfo(privateKey));
        console.log('Private Key (exported):', getDetailedTypeInfo(exportedPrivateKey));
        console.log('Public Key:', getDetailedTypeInfo(publicKey));
        console.log('Public Key (exported):', getDetailedTypeInfo(exportedPublicKey));

        // Create a message to sign
        const message = new TextEncoder().encode('Hello, Blind RSA!');
        console.log('\n=== Message Information ===');
        console.log('Original message:', new TextDecoder().decode(message));
        console.log('Message:', getDetailedTypeInfo(message));
        
        // Prepare the message
        const preparedMsg = suite.prepare(message);
        console.log('Prepared message:', getDetailedTypeInfo(preparedMsg));
        
        // Create a blind signature request
        const { blindedMsg, inv } = await suite.blind(publicKey, preparedMsg);
        console.log('\n=== Blind Signature Information ===');
        console.log('Blinded message:', getDetailedTypeInfo(blindedMsg));
        console.log('Inverse:', getDetailedTypeInfo(inv));

        // Sign the blinded message (this would typically be done by the server)
        const blindSignature = await suite.blindSign(privateKey, blindedMsg);
        console.log('Blind signature:', getDetailedTypeInfo(blindSignature));

        const signature = await suite.finalize(publicKey, preparedMsg, blindSignature, inv);
        console.log('\n=== Final Signature Information ===');
        console.log('Final signature:', getDetailedTypeInfo(signature));

        // Verify the signature
        const isValid = await suite.verify(publicKey, signature, preparedMsg);
        console.log('\n=== Verification ===');
        console.log('Signature verification result:', isValid);

    } catch (error) {
        console.error('Error:', error);
    }
}

main(); 
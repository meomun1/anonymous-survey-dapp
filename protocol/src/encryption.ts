import { webcrypto } from 'crypto';

function getDetailedTypeInfo(obj: any): string {
    const type = obj.constructor.name;
    const size = obj instanceof ArrayBuffer || obj instanceof Uint8Array ? obj.byteLength : 'N/A';
    return `${type} (${size} bytes)`;
}

async function main() {
    try {
        // Generate RSA key pair
        const { publicKey, privateKey } = await webcrypto.subtle.generateKey(
            {
                name: "RSA-OAEP",
                modulusLength: 2048,
                publicExponent: new Uint8Array([1, 0, 1]),
                hash: "SHA-256",
            },
            true,
            ["encrypt", "decrypt"]
        );

        // Export keys to see their actual format
        const exportedPublicKey = await webcrypto.subtle.exportKey('spki', publicKey);
        const exportedPrivateKey = await webcrypto.subtle.exportKey('pkcs8', privateKey);

        // Create a message to encrypt
        const message = new TextEncoder().encode('Hello, RSA Encryption!');


        // Hash the message with SHA-256 (for demonstration/integrity checking)
        const hashedMessage = await webcrypto.subtle.digest('SHA-256', message);


        // Encrypt the original message (not the hash)
        const encryptedData = await webcrypto.subtle.encrypt(
            {
                name: "RSA-OAEP"
            },
            publicKey,
            message  // Changed from hashedMessage to message
        );
        console.log('\n=== Encryption Information ===');
        console.log('Encrypted data:', getDetailedTypeInfo(encryptedData));
        console.log('Encrypted data (base64):', Buffer.from(encryptedData).toString('base64'));

        // Decrypt the data
        const decryptedData = await webcrypto.subtle.decrypt(
            {
                name: "RSA-OAEP"
            },
            privateKey,
            encryptedData
        );
        console.log('\n=== Decryption Information ===');
        console.log('Decrypted data:', getDetailedTypeInfo(decryptedData));
        console.log('Decrypted data (hex):', Buffer.from(decryptedData).toString('hex'));

        // Verify the decrypted message matches the original message
        const isMatch = Buffer.from(decryptedData).equals(Buffer.from(message));
        console.log('\n=== Verification ===');
        console.log('Message verification result:', isMatch);

        // Now this will show the actual decrypted message text
        const plainAnswer = new TextDecoder().decode(decryptedData);
        console.log('\n=== Plain Answer ===');
        console.log('Plain answer:', plainAnswer);  

        // Bonus: Verify integrity by comparing hashes
        const decryptedMessageHash = await webcrypto.subtle.digest('SHA-256', decryptedData);
        const hashMatch = Buffer.from(decryptedMessageHash).equals(Buffer.from(hashedMessage));
        console.log('\n=== Hash Integrity Check ===');
        console.log('Hash integrity verified:', hashMatch);

    } catch (error) {
        console.error('Error:', error);
    }
}

main();
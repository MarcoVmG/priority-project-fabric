import grpc from '@grpc/grpc-js';
import { connect, signers, hash } from '@hyperledger/fabric-gateway';
import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const channelName = 'mychannel';
const chaincodeName = 'basic';


function setOrgByEmail(email) {
    if (email.endsWith('@nhs.net')) {
        return {
            mspId: 'Org2MSP',
            user: 'User1@org2.example.com',
            basePath: path.resolve(__dirname, '../../../../../../test-network/organizations/peerOrganizations/org2.example.com'),
            peerEndpoint: 'localhost:9051',
            peerHostAlias: 'peer0.org2.example.com'
        };
    } else {
        return {
            mspId: 'Org1MSP',
            user: 'User1@org1.example.com',
            basePath: path.resolve(__dirname, '../../../../../../test-network/organizations/peerOrganizations/org1.example.com'),
            peerEndpoint: 'localhost:7051',
            peerHostAlias: 'peer0.org1.example.com'
        };
    }
}

/**
 * Create a gRPC client connection to the Fabric Gateway.
 */
async function newGrpcConnection(tlsCertPath,peerEndpoint,peerHostAlias) {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

/**
 * Load the user's identity (certificate).
 */
async function newIdentity(certDirectoryPath,mspId) {
    const certPath = await getFirstFile(certDirectoryPath);
    const credentials = await fs.readFile(certPath);
    return { mspId, credentials };
}

/**
 * Load the user's private key for signing transactions.
 */
async function newSigner(keyDirectoryPath) {
    const keyPath = await getFirstFile(keyDirectoryPath);
    const privateKeyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(privateKeyPem);
    return signers.newPrivateKeySigner(privateKey);
}

/**
 * Helper function to get the first file in a directory.
 */
async function getFirstFile(dirPath) {
    const files = await fs.readdir(dirPath);
    if (files.length === 0) throw new Error(`No files found in ${dirPath}`);
    return path.join(dirPath, files[0]);
}

/**
 * Submit a transaction to the Fabric network.
 * @param {string} functionName - function that will be called in the chaincode.
 * @param {string} email - email of the user to check which organization credentials will be used.
 * @param  {...any} args - arguments for the function.
 */
async function submitTransaction(functionName, email, ...args) {
    const org = setOrgByEmail(email);
    const mspId = org.mspId;
    const cryptoPath = org.basePath;
    const tlsCertPath = path.resolve(cryptoPath, `peers/${org.peerHostAlias}/tls/ca.crt`);
    const certDirectoryPath = path.resolve(cryptoPath, `users/${org.user}/msp/signcerts`);
    const keyDirectoryPath = path.resolve(cryptoPath, `users/${org.user}/msp/keystore`);
    const peerEndpoint = org.peerEndpoint;
    const peerHostAlias = org.peerHostAlias;
    try {
        console.log('Connecting to the Fabric network...');

        const client = await newGrpcConnection(tlsCertPath,peerEndpoint,peerHostAlias);
        const gateway = connect({
            client,
            identity: await newIdentity(certDirectoryPath,mspId),
            signer: await newSigner(keyDirectoryPath),
            hash: hash.sha256,
        });

        const network = gateway.getNetwork(channelName);
        const contract = network.getContract(chaincodeName);

        console.log(`Submitting transaction: ${functionName} with args:`, args);

        const updatedAt = new Date().toISOString();
        let result;
        // the if statement is used to determine if the function is a read(evaluateTransaction)
        // or write operation(submitTransaction)
        if (
            ['AddUserData', 'addMedData', 'addEmergContact'].includes(
                functionName
            )
        ) {
            result = await contract.submitTransaction(
                functionName,
                ...args,
                updatedAt
            );
        } else if (functionName === 'CreateUser') {
            result = await contract.submitTransaction(functionName, ...args);
        } else {
            result = await contract.evaluateTransaction(functionName, ...args);
        }
        // Decode the response as a UTF-8 string
        const decodedResponse = Buffer.from(result).toString('utf8');
        console.log(`Transaction result for ${functionName}:`, decodedResponse);

        gateway.close();
        client.close();

        return decodedResponse;
    } catch (error) {
        console.error('Error in submitTransaction:', error);
        throw error;
    }
}

export { submitTransaction };

'use strict';


const stringify = require('json-stringify-deterministic');
const sortKeysRecursive = require('sort-keys-recursive');
const { Contract } = require('fabric-contract-api');
const {ClientIdentity} = require('fabric-shim');
class AssetTransfer extends Contract {

    // CreateUser this function will create a user in the network
    async CreateUser(ctx, id, email, password, emergencyCode) {
        let role;
        let asset;

        if (await this.CheckEmail(ctx, email)) {
            throw new Error(`Email ${email} already exists`);
        }

        //Decide the asset (user) structure based on the email domain
        if(email.endsWith('@nhs.net')){
            role = 'emergency-team';
            asset = {
                ID: id,
                Email: email,
                Password: password,
                Role: role,
            };
        }else{
            role = 'user';
            asset = {
                ID: id,
                Email: email,
                Password: password,
                Role: role,
                EmergencyCode: emergencyCode,
                UserData :{},
                MedicalData :{},
                EmergencyContact:{}
            };
        }
        // we insert data in alphabetic order using 'json-stringify-deterministic' and 'sort-keys-recursive'
        await ctx.stub.putState(
            id,
            Buffer.from(stringify(sortKeysRecursive(asset)))
        );
        return JSON.stringify(asset);
    }


    // Query the network to find a user with the email and role provided
    //async QueryByEmailAndRole(ctx, email, role) {
    async QueryByEmailAndRole(ctx, email) {
        let role;
        if (email.endsWith('@nhs.net')){
            role = 'emergency-team';
        }else{
            role = 'user';
        }
        const query = {
            selector: {
                Email: email,
                Role: role,
            },
        };
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const results = [];
        let result = await iterator.next();
        while (!result.done) {
            const record = JSON.parse(result.value.value.toString('utf8'));
            results.push(record);
            result = await iterator.next();
        }
        if (results.length === 0) {
            throw new Error(
                `No user found with email ${email} and role ${role}`
            );
        }
        return JSON.stringify(results[0]);
    }

    // Read the asset from the network
    async ReadAsset(ctx, id) {
        const assetJSON = await ctx.stub.getState(id);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${id} does not exist`);
        }
        return assetJSON.toString();
    }
    // Add the user data into the network
    async AddUserData(ctx, id, userData, updatedAt) {
        const cid = new ClientIdentity(ctx.stub);
        const mspId = cid.getMSPID();

        if (mspId !== 'Org1MSP') {
            throw new Error('Unauthorized access: Only emergency staff can query by emergency code.');
        }
        const assetJSON = await this.ReadAsset(ctx, id);
        const asset = JSON.parse(assetJSON);

        asset.UserData = typeof userData === 'string' ? JSON.parse(userData) : userData;
        asset.UpdatedAt = updatedAt;

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
        return JSON.stringify(asset);
    }
    // Add the medical data into the network
    async addMedData(ctx, id, medData, updatedAt) {
        const cid = new ClientIdentity(ctx.stub);
        const mspId = cid.getMSPID();

        if (mspId !== 'Org1MSP') {
            throw new Error('Unauthorized access: Only emergency staff can query by emergency code.');
        }
        const assetJSON = await this.ReadAsset(ctx, id);
        if (!assetJSON) {
            throw new Error(`Asset with ID ${id} does not exist.`);
        }
        const asset = JSON.parse(assetJSON);

        asset.MedicalData = typeof medData === 'string' ? JSON.parse(medData) : medData;
        asset.UpdatedAt = updatedAt;

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
        return JSON.stringify(asset);
    }
    // Add the emergency contact information into the network
    async addEmergContact(ctx, id, emData, updatedAt) {
        const cid = new ClientIdentity(ctx.stub);
        const mspId = cid.getMSPID();

        if (mspId !== 'Org1MSP') {
            throw new Error('Unauthorized access: Only emergency staff can query by emergency code.');
        }
        const assetJSON = await this.ReadAsset(ctx, id);
        if (!assetJSON) {
            throw new Error(`Asset with ID ${id} does not exist.`);
        }
        const asset = JSON.parse(assetJSON);

        asset.EmergencyContact = typeof emData === 'string' ? JSON.parse(emData) : emData;
        asset.UpdatedAt = updatedAt;

        await ctx.stub.putState(id, Buffer.from(JSON.stringify(asset)));
        return JSON.stringify(asset);
    }
    // Query the user by the emergency code
    async QueryByEmergencyCode(ctx, emergencyCode) {
        //Add restriction to check if the user is an emergency staff from Org
        const cid = new ClientIdentity(ctx.stub);
        const mspId = cid.getMSPID();

        if (mspId !== 'Org2MSP') {
            throw new Error('Unauthorized access: Only emergency staff can query by emergency code.');
        }
        const query = {
            selector: {
                EmergencyCode: emergencyCode,
            },
        };
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const results = [];
        let result = await iterator.next();
        while (!result.done) {
            const record = JSON.parse(result.value.value.toString('utf8'));
            results.push(record);
            result = await iterator.next();
        }
        if (results.length === 0) {
            throw new Error(
                `No user found with emergency code ${emergencyCode}`
            );
        }
        return JSON.stringify(results[0]);
    }
    // Check if the email already exists in the network
    async CheckEmail(ctx, email) {
        const query = {
            selector: {
                Email: email,
            },
        };
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const result = await iterator.next();
        if (result.value && result.value.value) {
            return true;
        }
        return false;
    }
    // Check if the emergency code already exists in the network, ensuring it is unique
    async CheckEmrCodExist(ctx, emergencyCode) {
        const query = {
            selector: {
                EmergencyCode: emergencyCode,
            },
        };
        const iterator = await ctx.stub.getQueryResult(JSON.stringify(query));
        const result = await iterator.next();
        if (result.value && result.value.value) {
            return true;
        }
        return false;
    }

}

module.exports = AssetTransfer;


# Hyperledger Fabric Chaincode Deployment
This guide walks through the full process of setting up and deploying chaincode using Hyperledger Fabric with PowerShell on Windows. It also includes fixes for common issues and adaptations for PowerShell syntax.

## Before Starting
### Prerequisites link to check. Note: the project was developed using Windows machine. [Here](https://hyperledger-fabric.readthedocs.io/en/latest/prereqs.html)


### Download the fabric-samples installer from GitHub repository
```powershell
curl -sSLO https://raw.githubusercontent.com/hyperledger/fabric/main/scripts/install-fabric.sh && chmod +x install-fabric.sh
```

### Install fabric-samples
```powershell
./install-fabric.sh
```
### In the fabric-samples folder clone this repository

### Navigate to the chaincode folder and use the command npm install to install all the node_modules.

### Navigate to the front-app folder and insert npm install, then use npm run dev to deploy locally the project.

---

## Initial Setup

### 1. Clone Fabric Samples and Setup Binaries

```powershell
git clone https://github.com/hyperledger/fabric-samples.git
cd fabric-samples
curl -sSL https://bit.ly/HyperledgerFabric-Installer | bash -s -- 2.5.12

```

### 2. Add Fabric binaries and config path to PowerShell session

```powershell

$env:PATH = (Resolve-Path "$PWD/../bin").Path + ";" + $env:PATH
$env:FABRIC_CFG_PATH = (Resolve-Path "$PWD/../config").Path

```

---

## Starting the Test Network (with CouchDB)

Always run from the **fabric-samples** root:

```powershell
bash ./test-network/network.sh up createChannel -s couchdb

bash ./network.sh up createChannel -s couchdb

```

---

## Deploying Custom Chaincode

### Package the chaincode (from `test-network` folder):

```powershell
peer lifecycle chaincode package basic.tar.gz --path ../priority-project/chaincode/ --lang node --label basic_1.0

```

### Set environment variables for Org1:

```powershell
$env:CORE_PEER_TLS_ENABLED = "true"
$env:CORE_PEER_LOCALMSPID = "Org1MSP"
$env:CORE_PEER_TLS_ROOTCERT_FILE = "$PWD\organizations\peerOrganizations\org1.example.com\peers\peer0.org1.example.com\tls\ca.crt"
$env:CORE_PEER_MSPCONFIGPATH = "$PWD\organizations\peerOrganizations\org1.example.com\users\Admin@org1.example.com\msp"
$env:CORE_PEER_ADDRESS = "localhost:7051"

```

### Install chaincode on Org1:

```powershell
peer lifecycle chaincode install basic.tar.gz

```

### Set environment for Org2 (if needed):

```powershell
$env:CORE_PEER_LOCALMSPID = "Org2MSP"
$env:CORE_PEER_TLS_ROOTCERT_FILE = "$PWD\organizations\peerOrganizations\org2.example.com\peers\peer0.org2.example.com\tls\ca.crt"
$env:CORE_PEER_MSPCONFIGPATH = "$PWD\organizations\peerOrganizations\org2.example.com\users\Admin@org2.example.com\msp"
$env:CORE_PEER_ADDRESS = "localhost:9051"

```

### Install chaincode on Org2:

```powershell
peer lifecycle chaincode install basic.tar.gz

```

### Query installed chaincode:

```powershell
peer lifecycle chaincode queryinstalled

```

### Set chaincode package ID (replace with actual hash):

```powershell
$env:CC_PACKAGE_ID = "basic_1.0:9205350bf37e282065ade165e3d2638cc2de6f0c6b57d56c25a764a8551fd8d9"

basic_1.0:46e37187df6dd4e5fa53c585d8cc3aa719ade442757e7a98ca3a50ace0d39171

```

### Approve chaincode definition for Org2:

As the previous step was done using the enviroment for Org2, the chaincode approve will be done for Org2

```powershell
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name basic --version 1.0 --package-id $env:CC_PACKAGE_ID --sequence 1 --tls --cafile "$PWD\organizations\ordererOrganizations\example.com\orderers\orderer.example.com\msp\tlscacerts\tlsca.example.com-cert.pem"

#Linux command
peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name basic --version 1.0 --package-id $CC_PACKAGE_ID --sequence 1 --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"

```

### Approve chaincode definition for Org1

---

```powershell
$env:CORE_PEER_LOCALMSPID = "Org1MSP"
$env:CORE_PEER_TLS_ROOTCERT_FILE = "$PWD\organizations\peerOrganizations\org1.example.com\peers\peer0.org1.example.com\tls\ca.crt"
$env:CORE_PEER_MSPCONFIGPATH = "$PWD\organizations\peerOrganizations\org1.example.com\users\Admin@org1.example.com\msp"
$env:CORE_PEER_ADDRESS = "localhost:7051"

peer lifecycle chaincode approveformyorg -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name basic --version 1.0 --package-id $env:CC_PACKAGE_ID --sequence 1 --tls --cafile "$PWD\organizations\ordererOrganizations\example.com\orderers\orderer.example.com\msp\tlscacerts\tlsca.example.com-cert.pem"
```

## Check Commit Readiness

```powershell
peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name basic --version 1.0 --sequence 1 --tls --cafile "$PWD\organizations\ordererOrganizations\example.com\orderers\orderer.example.com\msp\tlscacerts\tlsca.example.com-cert.pem" --output json

#Linux Command
peer lifecycle chaincode checkcommitreadiness --channelID mychannel --name basic --version 1.0 --sequence 1 --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" --output json

```

---

## Commit the Chaincode

```powershell
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name basic --version 1.0 --sequence 1 --tls --cafile "$PWD\organizations\ordererOrganizations\example.com\orderers\orderer.example.com\msp\tlscacerts\tlsca.example.com-cert.pem" --peerAddresses localhost:7051 --tlsRootCertFiles "$PWD\organizations\peerOrganizations\org1.example.com\peers\peer0.org1.example.com\tls\ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "$PWD\organizations\peerOrganizations\org2.example.com\peers\peer0.org2.example.com\tls\ca.crt"

#Linux command
peer lifecycle chaincode commit -o localhost:7050 --ordererTLSHostnameOverride orderer.example.com --channelID mychannel --name basic --version 1.0 --sequence 1 --tls --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem" --peerAddresses localhost:7051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt" --peerAddresses localhost:9051 --tlsRootCertFiles "${PWD}/organizations/peerOrganizations/org2.example.com/peers/peer0.org2.example.com/tls/ca.crt"
```

---

## Query Committed Chaincode

This will confirm the chaincode has been commited

```powershell
peer lifecycle chaincode querycommitted --channelID mychannel --name basic --cafile "$PWD\organizations\ordererOrganizations\example.com\orderers\orderer.example.com\msp\tlscacerts\tlsca.example.com-cert.pem"

#Linux command
peer lifecycle chaincode querycommitted --channelID mychannel --name basic --cafile "${PWD}/organizations/ordererOrganizations/example.com/orderers/orderer.example.com/msp/tlscacerts/tlsca.example.com-cert.pem"
```

---

## Shutdown Network (from test-network folder)

```powershell
bash ./network.sh down

```

---

This guide serves as a complete reference for deploying and managing Fabric chaincode using PowerShell. For more, visit: [Deploying a smart contract to a channel](https://hyperledger-fabric.readthedocs.io/en/release-2.5/deploy_chaincode.htm)

import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import verify from '../helper-functions'
import { getImplementationAddress } from '../utils/functions/upgrades/get-implementation-address'

import { BaseContract, Contract, ContractFactory } from 'ethers'
import fs from 'fs'
import { ethers, upgrades } from 'hardhat'
import path from 'path'

interface Accounts {
	owner: SignerWithAddress
	admin: SignerWithAddress
}

interface Contracts {
	networkName: string
	cUSDMock: any
	registryInstance: any
	alloInstance: any
	directGrantsLiteStrategy: any
}

interface Metadata {
	protocol: string
	pointer: string
}

interface Profile {
	id: string
	nonce: string
	name: string
	metadata: Metadata
	owner: string
	anchor: string
}

let accounts: Accounts
let contracts: Contracts

function dtoToProfile(dto: any): Profile {
	const nonce: string = dto[1].toString()
	const protocol: string = dto[3][0].toString()

	return {
		id: dto[0],
		nonce,
		name: dto[2],
		metadata: {
			protocol,
			pointer: dto[3][1]
		},
		owner: dto[4],
		anchor: dto[5]
	}
}

async function main() {
	const signers = await ethers.getSigners()

	accounts = {
		owner: signers[0],
		admin: signers[1]
	}

	const { admin } = accounts

	contracts = await deployContracts()

	const { registryInstance } = contracts

	const adminDir = path.join('admin', contracts.networkName)
	const adminFile = path.join(adminDir, 'admin.json')

	if (!fs.existsSync(adminDir)) {
		fs.mkdirSync(adminDir, { recursive: true })
	}

	let adminJson: any = {}

	if (fs.existsSync(adminFile)) {
		adminJson = JSON.parse(fs.readFileSync(adminFile).toString())
	}

	adminJson.profile = {}

	// Create profile
	console.log(' 🚩  1. Create profile')

	const adminNonce: number = await ethers.provider.getTransactionCount(
		admin.address
	)
	const adminName: string = 'admin'
	const adminMetadata: Metadata = {
		protocol: '1',
		pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
	}
	const adminMembersAddresses: string[] = []

	const createProfileTx = await registryInstance.connect(admin).createProfile(
		adminNonce, // _nonce
		adminName, // _name
		[adminMetadata.protocol, adminMetadata.pointer], // _metadata
		admin.address, // ownerAddress
		adminMembersAddresses // _membersAddresses
	)

	await createProfileTx.wait()

	const transactionReceipt = await ethers.provider.getTransactionReceipt(
		createProfileTx.hash
	)
	const transactionBlockNumber = transactionReceipt.blockNumber

	const events = await registryInstance.queryFilter(
		'ProfileCreated',
		transactionBlockNumber
	)
	const event = events[events.length - 1]

	const adminProfileId = event.args.profileId

	const adminProfileDto = await registryInstance.getProfileById(adminProfileId)
	const adminProfile: Profile = dtoToProfile(adminProfileDto)

	adminJson.profile = adminProfile
	fs.writeFileSync(adminFile, JSON.stringify(adminJson))
	console.log(' ✅  Profile created')
}

async function deployContracts() {
	const network = await ethers.provider.getNetwork()
	let networkName = network.name

	if (networkName === 'unknown' || networkName === 'hardhat') {
		networkName = 'localhost'
	}

	const networkDir = path.join('.', 'deployments', networkName)
	if (!fs.existsSync(networkDir)) {
		fs.mkdirSync(networkDir, { recursive: true })
	}

	const [owner] = await ethers.getSigners()

	// Deploy cUSDMock contract
	const cUSDMock = await deployContract('cUSDMock', [])
	const cUSDMockTx = cUSDMock.deploymentTransaction()
	await verify(await cUSDMock.getAddress(), [])

	// Deploy Registry contract
	const Registry: ContractFactory<any[], BaseContract> =
		await ethers.getContractFactory('Registry')

	const registryArgs: any[] = [owner.address]
	const registryInstance: Contract = await upgrades.deployProxy(
		Registry,
		registryArgs
	)

	await registryInstance.waitForDeployment()
	const registryInstanceTx = registryInstance.deploymentTransaction()

	const registryInstanceAddress: string = registryInstance.target as string
	await verify(registryInstanceAddress, [])

	const registryImplementationAddress: string = await getImplementationAddress(
		registryInstanceAddress
	)

	await verify(registryImplementationAddress, [])

	// Deploy Allo contract
	const Allo: ContractFactory<any[], BaseContract> =
		await ethers.getContractFactory('Allo')

	const alloArgs: any = [
		owner.address, // owner
		registryInstanceAddress, // registryAddress
		owner.address, // treasury,
		0, // percentFee,
		0 // baseFee,
	]
	const alloInstance: Contract = await upgrades.deployProxy(Allo, alloArgs)
	await alloInstance.waitForDeployment()
	const alloInstanceTx = alloInstance.deploymentTransaction()

	const alloInstanceAddress: string = alloInstance.target as string
	await verify(alloInstanceAddress, [])
	const alloImplementationAddress: string = await getImplementationAddress(
		alloInstanceAddress
	)
	await verify(alloImplementationAddress, [])

	// Deploy Quadratic Voting Strategy contract
	const directGrantsLiteStrategyArgs: any[] = [
		alloInstanceAddress, // _alloAddress
		'Direct grant strategy' // _strategyName
	]
	const directGrantsLiteStrategy = await deployContract(
		'DirectGrantsLiteStrategy',
		directGrantsLiteStrategyArgs
	)
	const directGrantsLiteStrategyTx =
		directGrantsLiteStrategy.deploymentTransaction()
	await verify(
		await directGrantsLiteStrategy.getAddress(),
		directGrantsLiteStrategyArgs
	)

	// Log deployed contracts
	console.log('\n 📜 Deployed contracts')
	console.table({
		cUSDMock: await cUSDMock.getAddress(),
		registryInstance: registryInstanceAddress,
		registryImplementation: registryImplementationAddress,
		alloInstance: alloInstanceAddress,
		alloImplementation: alloImplementationAddress,
		directGrantsLiteStrategy: await directGrantsLiteStrategy.getAddress()
	})

	const contractsDeployed = {
		cUSDMock: {
			blockNumber: cUSDMockTx?.blockNumber,
			address: await cUSDMock.getAddress(),
			abi: JSON.parse(cUSDMock.interface.formatJson())
		},
		registryInstance: {
			blockNumber: registryInstanceTx?.blockNumber,
			address: registryInstanceAddress,
			abi: JSON.parse(Registry.interface.formatJson())
		},
		registryImplementation: {
			address: registryImplementationAddress
		},
		alloInstance: {
			blockNumber: alloInstanceTx?.blockNumber,
			address: alloInstanceAddress,
			abi: JSON.parse(Allo.interface.formatJson())
		},
		alloImplementation: {
			address: alloImplementationAddress
		},
		directGrantsLiteStrategy: {
			blockNumber: directGrantsLiteStrategyTx?.blockNumber,
			address: await directGrantsLiteStrategy.getAddress(),
			abi: JSON.parse(directGrantsLiteStrategy.interface.formatJson()),
			bytecode: (await directGrantsLiteStrategy.getDeployedCode()) as string
		}
	}

	const deployments = JSON.stringify(contractsDeployed, null, 2)
	fs.writeFileSync(path.join(networkDir, 'deployments.json'), deployments)

	// Return all deployed contracts
	return {
		networkName,
		cUSDMock,
		registryInstance,
		alloInstance,
		directGrantsLiteStrategy
	}
}

async function deployContract(contractName: string, args: any[]) {
	const ContractFactory: ContractFactory = await ethers.getContractFactory(
		contractName
	)
	const contract = await ContractFactory.deploy(...args)
	return contract
}

main()
	.then(() => process.exit(0))
	.catch(error => {
		console.error(error)
		process.exit(1)
	})

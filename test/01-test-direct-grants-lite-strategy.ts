import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'

import { addMinutesToDate, toTimestamp } from '../utils/functions'
import { moveTime } from '../utils/functions/move-time'

import {
	BaseContract,
	BytesLike,
	Contract,
	ContractFactory,
	MaxUint256,
	ZeroAddress
} from 'ethers'
import { ethers, upgrades } from 'hardhat'

interface Accounts {
	admin: SignerWithAddress
	alice: SignerWithAddress
	bob: SignerWithAddress
	kyle: SignerWithAddress
	carol: SignerWithAddress
}

interface Contracts {
	cUSDMock: any
	registryInstance: any
	alloInstance: any
	directGrantsLiteStrategy: any
}

interface Metadata {
	protocol: bigint
	pointer: string
}

interface Profile {
	id: string
	nonce: bigint
	name: string
	metadata: Metadata
	owner: string
	anchor: string
}

interface Pool {
	profileId: BytesLike
	strategy: string
	token: string
	metadata: Metadata
	managerRole: BytesLike
	adminRole: BytesLike
}

interface InitializeData {
	useRegistryAnchor: boolean
	metadataRequired: boolean
	registrationStartTime: number
	registrationEndTime: number
}

interface RecipientData {
	recipientId: string
	recipientAddress: string
	metadata: Metadata
}

interface Recipient {
	useRegistryAnchor: boolean
	recipientAddress: string
	metadata: Metadata
}

interface Milestone {
	amountPercentage: bigint
	metadata: Metadata
	status: bigint
}

describe('Direct Grants Lite Strategy Flow', async function () {
	function toDecimal(value: number): bigint {
		return BigInt(value * 10 ** 18)
	}

	function toNumber(value: bigint): number {
		return Number(value / BigInt(10 ** 18))
	}

	let accounts: Accounts
	let contracts: Contracts

	const abiCoder = new ethers.AbiCoder()

	const initializeDataStructTypes: string[] = [
		'tuple(bool, bool, uint64, uint64)'
	]
	const recipientDataStructTypes = [
		'address',
		'address',
		'tuple(uint256, string)'
	]
	const metadataStructTypes: string[] = ['uint256', 'string']
	const allocateStructTypes: string[] = ['address', 'address', 'uint256']

	const nowTime: Date = new Date()

	const reviewThresholdTimestamp: number = toTimestamp(
		addMinutesToDate(nowTime, 0).toISOString()
	)
	const registrationStartTimestamp: number = toTimestamp(
		addMinutesToDate(nowTime, 30).toISOString()
	)
	const registrationEndTimestamp: number = toTimestamp(
		addMinutesToDate(nowTime, 60).toISOString()
	)
	const allocationStartTimestamp: number = toTimestamp(
		addMinutesToDate(nowTime, 90).toISOString()
	)
	const allocationEndTimestamp: number = toTimestamp(
		addMinutesToDate(nowTime, 120).toISOString()
	)

	beforeEach(async function () {
		const signers = await ethers.getSigners()

		accounts = {
			admin: signers[0],
			alice: signers[1],
			bob: signers[2],
			kyle: signers[3],
			carol: signers[4]
		}

		contracts = await deployContracts()
	})

	it('Happy workflow', async () => {
		// Arrange
		const { alice, bob, kyle } = accounts
		const {
			cUSDMock,
			registryInstance,
			alloInstance,
			directGrantsLiteStrategy
		} = contracts

		const cUSDMockAddress: string = await cUSDMock.getAddress()

		const directGrantsLiteStrategyAddress: string =
			await directGrantsLiteStrategy.getAddress()

		const aliceNonce: number = await ethers.provider.getTransactionCount(
			alice.address
		)
		const aliceName: string = 'alice'
		const aliceMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}
		const aliceProfileMembers: string[] = []

		const alicePoolMetadata: Metadata = {
			protocol: BigInt(1),
			pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
		}

		const alicePoolManagers: string[] = []

		const alicePoolInitStrategyDataObject: InitializeData = {
			useRegistryAnchor: true,
			metadataRequired: false,
			registrationStartTime: registrationStartTimestamp,
			registrationEndTime: registrationEndTimestamp
		}

		const aliceInitStrategyDataValues: any[] = [
			[
				alicePoolInitStrategyDataObject.useRegistryAnchor,
				alicePoolInitStrategyDataObject.metadataRequired,
				alicePoolInitStrategyDataObject.registrationStartTime,
				alicePoolInitStrategyDataObject.registrationEndTime
			]
		]

		const aliceInitStrategyData: BytesLike = abiCoder.encode(
			initializeDataStructTypes,
			aliceInitStrategyDataValues
		)

		const bobData: RecipientData = {
			recipientId: ZeroAddress,
			recipientAddress: bob.address,
			metadata: {
				protocol: BigInt(1),
				pointer: 'ipfs://QmQmQmQmQmQmQmQmQmQmQmQmQm'
			}
		}

		const bobDataArray: any[] = [
			bobData.recipientId,
			bobData.recipientAddress,
			[bobData.metadata.protocol, bobData.metadata.pointer]
		]

		let bobDataBytes: BytesLike = abiCoder.encode(
			recipientDataStructTypes,
			bobDataArray
		)

		let currentBlock: any

		const poolFundingAmount: bigint = toDecimal(1000)

		let transactionReceipt: any
		let transactionBlockNumber: any

		let events: any
		let event: any

		let aliceProfileId: BytesLike
		let aliceProfileDto: any
		let aliceProfile: Profile
		let aliceStrategyContract: any

		let strategyAddress: string

		let alicePoolId: bigint
		let alicePoolDto: any
		let alicePool: Pool

		let bobRecipientId: string
		let bobRecipient: Recipient
		let bobRecipientStatus: bigint

		// Act

		// Create profile
		console.log(' 🚩  1. Create profile')
		const createProfileTx = await registryInstance.connect(alice).createProfile(
			aliceNonce, // _nonce
			aliceName, // _name
			[aliceMetadata.protocol, aliceMetadata.pointer], // _metadata
			alice.address, // ownerAddress
			aliceProfileMembers // _membersAddresses
		)

		await createProfileTx.wait()

		transactionReceipt = await ethers.provider.getTransactionReceipt(
			createProfileTx.hash
		)
		transactionBlockNumber = transactionReceipt.blockNumber

		events = await registryInstance.queryFilter(
			'ProfileCreated',
			transactionBlockNumber
		)

		event = events[events.length - 1]

		aliceProfileId = event.args.profileId

		aliceProfileDto = await registryInstance.getProfileById(aliceProfileId)

		aliceProfile = {
			id: aliceProfileDto[0],
			nonce: aliceProfileDto[1],
			name: aliceProfileDto[2],
			metadata: {
				protocol: aliceProfileDto[3][0],
				pointer: aliceProfileDto[3][1]
			},
			owner: aliceProfileDto[4],
			anchor: aliceProfileDto[5]
		}

		bobData.recipientId = aliceProfile.anchor
		bobDataArray[0] = aliceProfile.anchor
		bobDataBytes = abiCoder.encode(recipientDataStructTypes, bobDataArray)

		// Create pool
		console.log(' 🚩  3. Create pool')

		const mintTx = await cUSDMock.connect(alice).mint(toDecimal(1000))
		await mintTx.wait()

		const approveTx = await cUSDMock
			.connect(alice)
			.approve(await alloInstance.getAddress(), toDecimal(1000))
		await approveTx.wait()

		const aliceBalanceBefore = await cUSDMock.balanceOf(alice.address)

		const createPoolTx = await alloInstance
			.connect(alice)
			.createPoolWithCustomStrategy(
				aliceProfileId, // _profileId
				directGrantsLiteStrategyAddress, // _strategy
				aliceInitStrategyData, // _initStrategyData
				cUSDMockAddress, // _token
				poolFundingAmount, // _amount
				[alicePoolMetadata.protocol, alicePoolMetadata.pointer], // _metadata
				alicePoolManagers // _managers
			)

		await createPoolTx.wait()

		transactionReceipt = await ethers.provider.getTransactionReceipt(
			createPoolTx.hash
		)
		transactionBlockNumber = transactionReceipt.blockNumber

		events = await alloInstance.queryFilter(
			'PoolCreated',
			transactionBlockNumber
		)

		event = events[events.length - 1]

		alicePoolId = event.args.poolId
		alicePoolDto = await alloInstance.getPool(alicePoolId)
		alicePool = {
			profileId: alicePoolDto[0],
			strategy: alicePoolDto[1],
			token: alicePoolDto[2],
			metadata: {
				protocol: alicePoolDto[3][0],
				pointer: alicePoolDto[3][1]
			},
			managerRole: alicePoolDto[4],
			adminRole: alicePoolDto[5]
		}

		aliceStrategyContract = await ethers.getContractAt(
			'DirectGrantsLiteStrategy',
			alicePool.strategy
		)

		currentBlock = await ethers.provider.getBlock('latest')

		if (!currentBlock) {
			throw new Error('No current block found')
		}

		let currentTime = currentBlock.timestamp
		let timeToMoveForward = registrationStartTimestamp - currentTime
		timeToMoveForward += 60
		await moveTime(timeToMoveForward)

		// 4. Add recipient
		console.log(' 🚩  4. Add recipient')
		const addRecipientTx = await alloInstance
			.connect(alice)
			.registerRecipient(alicePoolId, bobDataBytes)

		await addRecipientTx.wait()

		transactionReceipt = await ethers.provider.getTransactionReceipt(
			addRecipientTx.hash
		)
		transactionBlockNumber = transactionReceipt.blockNumber

		events = await aliceStrategyContract.queryFilter(
			'Registered',
			transactionBlockNumber
		)

		event = events[events.length - 1]

		bobRecipientId = event.args.recipientId

		// 5. Set recipient status to Accepted reviewRecipients()
		console.log(' 🚩  5. Set recipient status to Accepted')

		const applicationStatusArray = [
			{ index: 0, statusRow: 2 } // 2 corresponds to 'accepted'
		]

		const recipientsCounter: bigint =
			await aliceStrategyContract.recipientsCounter()

		const setReviewRecipientsTx = await aliceStrategyContract
			.connect(alice)
			.reviewRecipients(applicationStatusArray, recipientsCounter)

		await setReviewRecipientsTx.wait()

		transactionReceipt = await ethers.provider.getTransactionReceipt(
			setReviewRecipientsTx.hash
		)
		transactionBlockNumber = transactionReceipt.blockNumber

		events = await aliceStrategyContract.queryFilter(
			'RecipientStatusUpdated',
			transactionBlockNumber
		)

		event = events[events.length - 1]

		const bobRecipientDto = await aliceStrategyContract.getRecipient(
			bobRecipientId
		)

		bobRecipient = {
			useRegistryAnchor: bobRecipientDto[0],
			recipientAddress: bobRecipientDto[1],
			metadata: {
				protocol: bobRecipientDto[2][0],
				pointer: bobRecipientDto[2][1]
			}
		}

		// 6. Fund pool
		console.log(' 🚩  6. Fund pool')

		const mintTx1 = await cUSDMock.connect(alice).mint(toDecimal(2000))
		await mintTx1.wait()

		const approveTx1 = await cUSDMock
			.connect(alice)
			.approve(await aliceStrategyContract, toDecimal(2000))
		await approveTx1.wait()

		const mintTx2 = await cUSDMock.connect(kyle).mint(toDecimal(2000))
		await mintTx2.wait()

		const approveTx2 = await cUSDMock
			.connect(kyle)
			.approve(await alloInstance.getAddress(), toDecimal(2000))
		await approveTx2.wait()

		const fundPoolTx = await alloInstance
			.connect(kyle)
			.fundPool(alicePoolId, toDecimal(1000))
		await fundPoolTx.wait()

		transactionReceipt = await ethers.provider.getTransactionReceipt(
			fundPoolTx.hash
		)
		transactionBlockNumber = transactionReceipt.blockNumber

		events = await alloInstance.queryFilter(
			'PoolFunded',
			transactionBlockNumber
		)

		event = events[events.length - 1]

		const poolFundedAmount: bigint = event.args.amount

		// 7. Allocate funds
		console.log(' 🚩  7. Allocate funds')

		currentBlock = await ethers.provider.getBlock('latest')

		if (!currentBlock) {
			throw new Error('No current block found')
		}

		currentTime = currentBlock.timestamp
		timeToMoveForward = allocationStartTimestamp - currentTime
		timeToMoveForward += 60
		await moveTime(timeToMoveForward)

		const bobAllocateDataArray: any[] = [
			cUSDMockAddress,
			bobRecipientId,
			poolFundedAmount
		]
		const bobAllocateDataBytes = abiCoder.encode(
			[`tuple(${allocateStructTypes.join(',')})[]`],
			[[bobAllocateDataArray]]
		)

		const allocateFundsTx = await alloInstance
			.connect(alice)
			.allocate(alicePoolId, bobAllocateDataBytes)

		await allocateFundsTx.wait()

		transactionReceipt = await ethers.provider.getTransactionReceipt(
			allocateFundsTx.hash
		)
		transactionBlockNumber = transactionReceipt.blockNumber

		events = await aliceStrategyContract.queryFilter(
			'Allocated',
			transactionBlockNumber
		)

		event = events[events.length - 1]

		const allocatedFunds: bigint = event.args.amount
	})
})

async function deployContracts() {
	const [owner] = await ethers.getSigners()

	// Deploy DAIMock contract

	const cUSDMock = await deployContract('cUSDMock', [])

	// Deploy Registry contract

	const registryArgs: any = [owner.address]
	const Registry: ContractFactory<any[], BaseContract> =
		await ethers.getContractFactory('Registry')

	const registryInstance: Contract = await upgrades.deployProxy(
		Registry,
		registryArgs
	)
	await registryInstance.waitForDeployment()

	const registryInstanceAddress: string = registryInstance.target as string

	// Deploy Allo contract

	const alloArgs: any = [
		owner.address, // owner
		registryInstanceAddress, // registryAddress
		'0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266', // treasury,
		0, // percentFee,
		0 // baseFee,
	]

	const Allo: ContractFactory<any[], BaseContract> =
		await ethers.getContractFactory('Allo')

	const alloInstance: Contract = await upgrades.deployProxy(Allo, alloArgs)
	await alloInstance.waitForDeployment()

	const alloInstanceAddress: string = alloInstance.target as string

	// Deploy Direct Grants Simple Strategy contract

	// Deploy Quadratic Voting Strategy contract
	const directGrantsLiteStrategyArgs: any[] = [
		alloInstanceAddress, // _alloAddress
		'Direct grant strategy' // _strategyName
	]
	const directGrantsLiteStrategy = await deployContract(
		'DirectGrantsLiteStrategy',
		directGrantsLiteStrategyArgs
	)

	// Return all deployed contracts
	return {
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

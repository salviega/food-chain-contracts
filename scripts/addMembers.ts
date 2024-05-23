import adminJson from '../admin/alfajores/admin.json'
import contractsJson from '../deployments/alfajores/deployments.json'

import dotenv from 'dotenv'
import { ethers } from 'ethers'

dotenv.config()

const {
	CELO_ALFAJORES_RPC_URL,
	WALLET1_PRIVATE_KEY,
	WALLET2_PRIVATE_KEY,
	WALLET3_PRIVATE_KEY,
	WALLET4_PRIVATE_KEY,
	WALLET5_PRIVATE_KEY,
	WALLET6_PRIVATE_KEY,
	WALLET7_PRIVATE_KEY,
	WALLET8_PRIVATE_KEY
} = process.env

if (!CELO_ALFAJORES_RPC_URL) {
	throw new Error('CELO_ALFAJORES_RPC_URL is not set')
}

if (!WALLET1_PRIVATE_KEY) {
	throw new Error('WALLET1_PRIVATE_KEY is not set')
}

if (!WALLET2_PRIVATE_KEY) {
	throw new Error('WALLET2_PRIVATE_KEY is not set')
}

if (!WALLET3_PRIVATE_KEY) {
	throw new Error('WALLET3_PRIVATE_KEY is not set')
}

if (!WALLET4_PRIVATE_KEY) {
	throw new Error('WALLET4_PRIVATE_KEY is not set')
}

if (!WALLET5_PRIVATE_KEY) {
	throw new Error('WALLET5_PRIVATE_KEY is not set')
}

if (!WALLET6_PRIVATE_KEY) {
	throw new Error('WALLET6_PRIVATE_KEY is not set')
}

if (!WALLET7_PRIVATE_KEY) {
	throw new Error('WALLET7_PRIVATE_KEY is not set')
}

if (!WALLET8_PRIVATE_KEY) {
	throw new Error('WALLET8_PRIVATE_KEY is not set')
}

const provider = new ethers.JsonRpcProvider(CELO_ALFAJORES_RPC_URL)
const signer = new ethers.Wallet(WALLET1_PRIVATE_KEY, provider)

const registryContract = new ethers.Contract(
	contractsJson.registryInstance.address,
	contractsJson.registryInstance.abi,
	signer
)

const recipients = [
	new ethers.Wallet(WALLET2_PRIVATE_KEY).address,
	new ethers.Wallet(WALLET3_PRIVATE_KEY).address,
	new ethers.Wallet(WALLET4_PRIVATE_KEY).address,
	new ethers.Wallet(WALLET5_PRIVATE_KEY).address,
	new ethers.Wallet(WALLET6_PRIVATE_KEY).address,
	new ethers.Wallet(WALLET7_PRIVATE_KEY).address,
	new ethers.Wallet(WALLET8_PRIVATE_KEY).address
]

async function addMembers() {
	try {
		console.log('Adding members to the registry... \n')

		const addMemberTx = await registryContract.addMembers(
			adminJson.profile.id,
			recipients
		)
		await addMemberTx.wait()
		console.log('✅ Successfully added members to the registry')
	} catch (error) {
		console.error('Failed to add members to the registry:', error)
	}
}

addMembers()

import contractsJson from '../deployments/alfajores/deployments.json'
import verify from '../helper-functions'

import { ContractFactory } from 'ethers'
import { ethers } from 'hardhat'

async function main() {
	await deployContracts()
}

async function deployContracts() {
	// Deploy Quadratic Voting Strategy contract
	const qVSimpleStrategyArgs: any[] = [
		contractsJson.alloInstance.address, // _alloAddress
		'Direct grant strategy' // _strategyName
	]
	const DirectGrantsLiteStrategyContract = await deployContract(
		'DirectGrantsLiteStrategy',
		qVSimpleStrategyArgs
	)
	await verify(
		await DirectGrantsLiteStrategyContract.getAddress(),
		qVSimpleStrategyArgs
	)

	// Log deployed contracts
	console.log('\n 📜 Deployed contracts')
	console.table({
		directGrantsLiteStrategy:
			await DirectGrantsLiteStrategyContract.getAddress()
	})
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

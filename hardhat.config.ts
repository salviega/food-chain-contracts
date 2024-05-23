import { CustomHardhatConfig } from './models/custom-hardhat-config.model'

import '@nomiclabs/hardhat-etherscan'
import '@nomiclabs/hardhat-ethers'
import '@openzeppelin/hardhat-upgrades'
import '@typechain/hardhat'
import 'dotenv/config'
import 'hardhat-celo'
import 'hardhat-deploy'

import dotenv from 'dotenv'

dotenv.config()

const {
	CELO_SCAN_API_KEY,
	CELO_ALFAJORES_RPC_URL,
	WALLET_PRIVATE_KEY,
	WALLET1_PRIVATE_KEY,
	WALLET2_PRIVATE_KEY,
	WALLET3_PRIVATE_KEY,
	WALLET4_PRIVATE_KEY,
	WALLET5_PRIVATE_KEY,
	WALLET6_PRIVATE_KEY,
	WALLET7_PRIVATE_KEY,
	WALLET8_PRIVATE_KEY
} = process.env

if (!CELO_SCAN_API_KEY) {
	throw new Error('CELO_SCAN_API_KEY is not set')
}

if (!CELO_ALFAJORES_RPC_URL) {
	throw new Error('CELO_ALFAJORES_RPC_URL is not set')
}

if (!WALLET_PRIVATE_KEY) {
	throw new Error('WALLET_PRIVATE_KEY is not set')
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

const ACCOUNTS: string[] = [
	WALLET_PRIVATE_KEY,
	WALLET1_PRIVATE_KEY,
	WALLET2_PRIVATE_KEY,
	WALLET3_PRIVATE_KEY,
	WALLET4_PRIVATE_KEY,
	WALLET5_PRIVATE_KEY,
	WALLET6_PRIVATE_KEY,
	WALLET7_PRIVATE_KEY,
	WALLET8_PRIVATE_KEY
]

const GAS: number = 30000000 // gas limit (max 30000000)
const GAS_PRICE: number = 10000000000

const SOLC_SETTINGS = {
	optimizer: {
		enabled: true,
		runs: 200
	}
	// viaIR: true
}

const defaultNetwork = 'hardhat' // change the defaul network if you want to deploy onchain
const config: CustomHardhatConfig = {
	defaultNetwork,
	networks: {
		hardhat: {
			chainId: 1337,
			allowUnlimitedContractSize: true
		},
		localhost: {
			accounts: [ACCOUNTS[0], ACCOUNTS[1]],
			allowUnlimitedContractSize: true,
			chainId: 1337,
			url: 'http://127.0.0.1:7545'
		},
		alfajores: {
			accounts: ACCOUNTS,
			chainId: 44787,
			gas: GAS,
			gasPrice: GAS_PRICE,
			url: CELO_ALFAJORES_RPC_URL || 'https://alfajores-forno.celo-testnet.org'
		}
	},
	etherscan: {
		apiKey: {
			alfajores: CELO_SCAN_API_KEY
		},
		customChains: [
			{
				network: 'alfajores',
				chainId: 44787,
				urls: {
					apiURL: 'https://api-alfajores.celoscan.io/api',
					browserURL: 'https://alfajores.celoscan.io'
				}
			}
		]
	},
	namedAccounts: {
		deployer: {
			default: 0,
			1: 0
		}
	},
	solidity: {
		compilers: [
			{
				version: '0.8.20',
				settings: SOLC_SETTINGS
			},
			{
				version: '0.8.19',
				settings: SOLC_SETTINGS
			},
			{
				version: '0.8.7',
				settings: SOLC_SETTINGS
			},
			{
				version: '0.7.0',
				settings: SOLC_SETTINGS
			},
			{
				version: '0.6.6',
				settings: SOLC_SETTINGS
			},
			{
				version: '0.4.24',
				settings: SOLC_SETTINGS
			}
		]
	},
	mocha: {
		timeout: 200000
	}
}

export default config

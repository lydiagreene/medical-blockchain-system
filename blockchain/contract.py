"""
blockchain/contract.py
Loads the smart contract ABI and connects to Ethereum
"""

import json
import os
from web3 import Web3
from django.conf import settings
import logging

logger = logging.getLogger(__name__)


def get_web3():
    """
    Returns a Web3 connection to the Ethereum network
    """
    provider_url = settings.BLOCKCHAIN['PROVIDER_URL']
    w3 = Web3(Web3.HTTPProvider(provider_url))

    if not w3.is_connected():
        logger.error("Failed to connect to Ethereum network")
        raise ConnectionError("Cannot connect to Ethereum network")

    logger.info("Connected to Ethereum network successfully")
    return w3


def get_contract():
    """
    Returns the deployed VerifyDoc smart contract instance
    """
    w3 = get_web3()

    # Load the ABI
    abi_path = os.path.join(
        os.path.dirname(__file__),
        'abi',
        'VerifyDoc.json'
    )

    with open(abi_path, 'r') as f:
        contract_abi = json.load(f)

    # Get contract address from settings
    contract_address = settings.BLOCKCHAIN['CONTRACT_ADDRESS']

    if not contract_address or contract_address == 'your-contract-address-after-deployment':
        raise ValueError("Contract address not configured in .env file")

    # Create contract instance
    contract = w3.eth.contract(
        address=Web3.to_checksum_address(contract_address),
        abi=contract_abi
    )

    return w3, contract
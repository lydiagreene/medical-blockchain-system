"""
blockchain/utils.py
Helper functions for all blockchain interactions
"""

from web3 import Web3
from django.conf import settings
from .contract import get_contract
import logging

logger = logging.getLogger(__name__)


def issue_credential_on_chain(
    license_number,
    practitioner_name,
    practitioner_id,
    qualification,
    ipfs_document_hash,
    ipfs_photo_hash
):
    """
    Records a new credential on the Ethereum blockchain.
    Returns the transaction hash if successful.
    """
    try:
        w3, contract = get_contract()

        deployer_address = settings.BLOCKCHAIN['DEPLOYER_ADDRESS']
        private_key = settings.BLOCKCHAIN['DEPLOYER_PRIVATE_KEY']

        # Build the transaction
        transaction = contract.functions.issueCredential(
            license_number,
            practitioner_name,
            practitioner_id,
            qualification,
            ipfs_document_hash or '',
            ipfs_photo_hash or ''
        ).build_transaction({
            'from': deployer_address,
            'nonce': w3.eth.get_transaction_count(deployer_address),
            'gas': 300000,
            'gasPrice': w3.eth.gas_price,
        })

        # Sign the transaction with private key
        signed_tx = w3.eth.account.sign_transaction(
            transaction,
            private_key=private_key
        )

        # Send the transaction
        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)

        # Wait for confirmation
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        logger.info(
            f"Credential issued on blockchain: "
            f"{license_number} | tx: {tx_hash.hex()}"
        )

        return {
            'success': True,
            'tx_hash': tx_hash.hex(),
            'block_number': receipt['blockNumber'],
        }

    except Exception as e:
        logger.error(f"Blockchain issue error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
        }


def get_tx_status(tx_hash):
    """
    Returns live confirmation count and block details for a transaction hash.
    Used by the credential detail page's async blockchain status indicator.
    """
    try:
        w3, _ = get_contract()

        receipt = w3.eth.get_transaction_receipt(tx_hash)
        if receipt is None:
            return {'success': True, 'pending': True, 'confirmations': 0}

        tx_block = receipt['blockNumber']
        current_block = w3.eth.block_number
        confirmations = max(0, current_block - tx_block)

        return {
            'success': True,
            'pending': False,
            'tx_block': tx_block,
            'current_block': current_block,
            'confirmations': confirmations,
            'status': receipt.get('status', 1),  # 1 = success, 0 = reverted
        }

    except Exception as e:
        logger.warning(f"get_tx_status error for {tx_hash}: {e}")
        return {'success': False, 'error': str(e)}


def verify_credential_on_chain(license_number):
    """
    Checks the blockchain to verify a credential.
    Returns credential details and active status.
    """
    try:
        w3, contract = get_contract()

        # Use getCredential (read-only, no gas needed)
        result = contract.functions.getCredential(license_number).call()

        exists = result[0]
        is_active = result[1]
        practitioner_name = result[2]
        practitioner_id = result[3]
        qualification = result[4]
        ipfs_document_hash = result[5]
        ipfs_photo_hash = result[6]
        issued_at = result[7]

        return {
            'success': True,
            'exists': exists,
            'is_active': is_active,
            'practitioner_name': practitioner_name,
            'practitioner_id': practitioner_id,
            'qualification': qualification,
            'ipfs_document_hash': ipfs_document_hash,
            'ipfs_photo_hash': ipfs_photo_hash,
            'issued_at': issued_at,
        }

    except Exception as e:
        logger.error(f"Blockchain verify error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
        }


def revoke_credential_on_chain(license_number):
    """
    Revokes a credential on the blockchain.
    Returns the transaction hash if successful.
    """
    try:
        w3, contract = get_contract()

        deployer_address = settings.BLOCKCHAIN['DEPLOYER_ADDRESS']
        private_key = settings.BLOCKCHAIN['DEPLOYER_PRIVATE_KEY']

        # Build the transaction
        transaction = contract.functions.revokeCredential(
            license_number
        ).build_transaction({
            'from': deployer_address,
            'nonce': w3.eth.get_transaction_count(deployer_address),
            'gas': 100000,
            'gasPrice': w3.eth.gas_price,
        })

        # Sign and send
        signed_tx = w3.eth.account.sign_transaction(
            transaction,
            private_key=private_key
        )

        tx_hash = w3.eth.send_raw_transaction(signed_tx.rawTransaction)
        receipt = w3.eth.wait_for_transaction_receipt(tx_hash, timeout=120)

        logger.info(
            f"Credential revoked on blockchain: "
            f"{license_number} | tx: {tx_hash.hex()}"
        )

        return {
            'success': True,
            'tx_hash': tx_hash.hex(),
            'block_number': receipt['blockNumber'],
        }

    except Exception as e:
        logger.error(f"Blockchain revoke error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
        }
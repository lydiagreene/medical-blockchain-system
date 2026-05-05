"""
ipfs/pinata_utils.py
Handles uploading and retrieving files from IPFS via Pinata
"""

import requests
import json
import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def get_pinata_headers():
    """
    Returns the authentication headers for Pinata API
    """
    return {
        'pinata_api_key': settings.PINATA['API_KEY'],
        'pinata_secret_api_key': settings.PINATA['SECRET_KEY'],
    }


def upload_file_to_ipfs(file_obj, filename):
    """
    Uploads a file to IPFS via Pinata.
    Returns the IPFS hash (CID) if successful.

    file_obj: Django InMemoryUploadedFile or file object
    filename: name to give the file on IPFS
    """
    try:
        url = f"{settings.PINATA['BASE_URL']}/pinning/pinFileToIPFS"

        # Prepare the file for upload
        files = {
            'file': (filename, file_obj.read(), file_obj.content_type)
        }

        # Add metadata
        metadata = json.dumps({
            'name': filename,
            'keyvalues': {
                'project': 'VerifyDoc Uganda',
                'type': 'credential_document'
            }
        })

        data = {
            'pinataMetadata': metadata,
        }

        response = requests.post(
            url,
            files=files,
            data=data,
            headers=get_pinata_headers(),
            timeout=30,
        )

        if response.status_code == 200:
            ipfs_hash = response.json()['IpfsHash']
            logger.info(f"File uploaded to IPFS: {ipfs_hash}")
            return {
                'success': True,
                'ipfs_hash': ipfs_hash,
                'ipfs_url': f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}",
            }
        else:
            logger.error(
                f"Pinata upload failed: {response.status_code} "
                f"- {response.text}"
            )
            return {
                'success': False,
                'error': f"Upload failed: {response.text}",
            }

    except Exception as e:
        logger.error(f"IPFS upload error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
        }


def upload_photo_to_ipfs(photo_file, practitioner_name):
    """
    Specifically uploads a practitioner photo to IPFS.
    Returns the IPFS hash if successful.
    """
    filename = f"photo_{practitioner_name.replace(' ', '_')}.jpg"
    return upload_file_to_ipfs(photo_file, filename)


def upload_document_to_ipfs(document_file, practitioner_name):
    """
    Specifically uploads a credential document to IPFS.
    Returns the IPFS hash if successful.
    """
    filename = f"credential_{practitioner_name.replace(' ', '_')}.pdf"
    return upload_file_to_ipfs(document_file, filename)


def get_file_from_ipfs(ipfs_hash):
    """
    Returns the public URL for accessing a file on IPFS
    """
    return f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"


def test_pinata_connection():
    """
    Tests if Pinata credentials are working correctly
    """
    try:
        url = f"{settings.PINATA['BASE_URL']}/data/testAuthentication"
        response = requests.get(
            url,
            headers=get_pinata_headers(),
            timeout=10,
        )

        if response.status_code == 200:
            return {'success': True, 'message': 'Pinata connected successfully'}
        else:
            return {
                'success': False,
                'error': f"Authentication failed: {response.text}"
            }

    except Exception as e:
        return {'success': False, 'error': str(e)}
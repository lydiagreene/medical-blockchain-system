"""
biometrics/face_utils.py
Facial recognition logic using DeepFace
Compares a live photo against a registered practitioner photo
"""

import os
import base64
import logging
import tempfile
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def download_image_from_ipfs(ipfs_hash):
    """
    Downloads an image from IPFS using the Pinata gateway
    Returns the local temp file path
    """
    try:
        url = f"https://gateway.pinata.cloud/ipfs/{ipfs_hash}"
        response = requests.get(url, timeout=30)

        if response.status_code == 200:
            # Save to a temporary file
            suffix = '.jpg'
            temp_file = tempfile.NamedTemporaryFile(
                delete=False,
                suffix=suffix
            )
            temp_file.write(response.content)
            temp_file.close()
            return {
                'success': True,
                'file_path': temp_file.name
            }
        else:
            return {
                'success': False,
                'error': f"Failed to download image: {response.status_code}"
            }

    except Exception as e:
        logger.error(f"IPFS image download error: {str(e)}")
        return {'success': False, 'error': str(e)}


def save_base64_image(base64_string):
    """
    Saves a base64 encoded image to a temporary file
    Returns the file path
    Used for webcam captured images
    """
    try:
        # Remove the data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        # Decode base64 to bytes
        image_bytes = base64.b64decode(base64_string)

        # Save to temp file
        temp_file = tempfile.NamedTemporaryFile(
            delete=False,
            suffix='.jpg'
        )
        temp_file.write(image_bytes)
        temp_file.close()

        return {
            'success': True,
            'file_path': temp_file.name
        }

    except Exception as e:
        logger.error(f"Base64 image save error: {str(e)}")
        return {'success': False, 'error': str(e)}


def compare_faces(registered_image_path, live_image_path):
    """
    Compares two face images using DeepFace.
    Returns match result and confidence score.

    registered_image_path: path to the registered practitioner photo
    live_image_path: path to the live webcam capture
    """
    try:
        from deepface import DeepFace

        # Perform face verification
        result = DeepFace.verify(
            img1_path=registered_image_path,
            img2_path=live_image_path,
            model_name='VGG-Face',
            enforce_detection=False,
            detector_backend='opencv',
            distance_metric='cosine',
        )

        is_match = result['verified']
        distance = result['distance']
        threshold = result['threshold']

        # Convert distance to a similarity score (0 to 1)
        # Lower distance = more similar
        similarity_score = max(0, 1 - (distance / threshold))

        logger.info(
            f"Raw result: verified={result['verified']}, "
            f"distance={result['distance']}, "
            f"threshold={result['threshold']}"
        )

        return {
            'success': True,
            'is_match': is_match,
            'similarity_score': round(similarity_score, 3),
            'distance': round(distance, 3),
            'threshold': round(threshold, 3),
        }

    except Exception as e:
        logger.error(f"Face comparison error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'is_match': False,
            'similarity_score': 0.0,
        }


def verify_practitioner_face(ipfs_photo_hash, live_image_base64):
    """
    Main function — verifies that the person presenting a credential
    matches the registered photo stored on IPFS.

    ipfs_photo_hash: the IPFS hash of the registered photo
    live_image_base64: base64 encoded webcam capture

    Returns match result and confidence score
    """
    registered_image_path = None
    live_image_path = None

    try:
        # Step 1 — Download registered photo from IPFS
        if not ipfs_photo_hash:
            return {
                'success': False,
                'error': 'No photo registered for this credential',
                'is_match': False,
                'similarity_score': 0.0,
            }

        download_result = download_image_from_ipfs(ipfs_photo_hash)
        if not download_result['success']:
            return {
                'success': False,
                'error': download_result['error'],
                'is_match': False,
                'similarity_score': 0.0,
            }

        registered_image_path = download_result['file_path']

        # Step 2 — Save live webcam image
        if not live_image_base64:
            return {
                'success': False,
                'error': 'No live photo captured',
                'is_match': False,
                'similarity_score': 0.0,
            }

        live_result = save_base64_image(live_image_base64)
        if not live_result['success']:
            return {
                'success': False,
                'error': live_result['error'],
                'is_match': False,
                'similarity_score': 0.0,
            }

        live_image_path = live_result['file_path']

        # Step 3 — Compare faces
        comparison = compare_faces(
            registered_image_path,
            live_image_path
        )

        return comparison

    except Exception as e:
        logger.error(f"Face verification error: {str(e)}")
        return {
            'success': False,
            'error': str(e),
            'is_match': False,
            'similarity_score': 0.0,
        }

    finally:
        # Clean up temp files
        if registered_image_path and os.path.exists(registered_image_path):
            os.unlink(registered_image_path)
        if live_image_path and os.path.exists(live_image_path):
            os.unlink(live_image_path)
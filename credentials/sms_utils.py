"""
credentials/sms_utils.py
Africa's Talking SMS wrapper for VerifyDoc Uganda.

Usage:
    from credentials.sms_utils import send_sms
    send_sms("Your message here", "+256712345678")

SMS is silently skipped when:
  - AT_USERNAME / AT_API_KEY are not configured in settings
  - The africastalking package is not installed
  - The phone number is blank

Phone numbers are normalised to E.164 (+256...) automatically.
The country code defaults to Uganda (256) — override with AT_COUNTRY_CODE in settings.
"""

import logging
from django.conf import settings

logger = logging.getLogger(__name__)


def normalize_phone(phone: str) -> str | None:
    """Normalize any Ugandan phone format to E.164 (+256XXXXXXXXX)."""
    if not phone:
        return None
    # Strip everything except digits and leading +
    cleaned = ''.join(c for c in phone.strip() if c.isdigit() or c == '+')
    if not cleaned:
        return None

    country_code = str(getattr(settings, 'AT_COUNTRY_CODE', '256'))

    if cleaned.startswith('+'):
        return cleaned                               # Already E.164
    if cleaned.startswith('00'):
        return '+' + cleaned[2:]                     # 00256... → +256...
    if cleaned.startswith('0') and len(cleaned) >= 10:
        return '+' + country_code + cleaned[1:]      # 0712345678 → +256712345678
    if cleaned.startswith(country_code):
        return '+' + cleaned                         # 256712345678 → +256712345678
    return '+' + country_code + cleaned              # 712345678 → +256712345678


def _sms_service():
    """Return an initialized Africa's Talking SMS object, or None if not available."""
    username = getattr(settings, 'AT_USERNAME', '').strip()
    api_key  = getattr(settings, 'AT_API_KEY', '').strip()
    if not username or not api_key:
        return None

    try:
        import africastalking
        africastalking.initialize(username, api_key)
        return africastalking.SMS
    except ImportError:
        logger.warning("africastalking package not installed — SMS notifications disabled.")
        return None
    except Exception as exc:
        logger.error(f"Africa's Talking init error: {exc}")
        return None


def send_sms(message: str, phone: str) -> bool:
    """
    Send a single SMS via Africa's Talking.
    Returns True on success, False if SMS is disabled or the send fails.
    Never raises — SMS failure must never crash the application.
    """
    e164 = normalize_phone(phone)
    if not e164:
        logger.debug(f"SMS skipped — invalid/empty phone: {phone!r}")
        return False

    sms = _sms_service()
    if sms is None:
        return False

    sender_id = (
        getattr(settings, 'AT_SENDER_ID', None) or
        getattr(settings, 'AT_SHORTCODE', None)
    )

    try:
        kwargs = {'message': message, 'recipients': [e164]}
        if sender_id:
            kwargs['sender_id'] = sender_id
        response = sms.send(**kwargs)

        recipients = response.get('SMSMessageData', {}).get('Recipients', [])
        if recipients and recipients[0].get('status') == 'Success':
            logger.info(f"SMS sent → {e164}: {message[:50]}…")
            return True
        logger.warning(f"SMS to {e164} returned unexpected response: {response}")
        return False
    except Exception as exc:
        logger.error(f"SMS send error → {e164}: {exc}")
        return False

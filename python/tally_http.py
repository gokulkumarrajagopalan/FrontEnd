"""Shared low-level Tally HTTP transport.

All Tally XML/HTTP calls in the sync layer should go through `post_xml_with_retry`
so that retry/backoff/timeout policy is applied uniformly. Previously retry lived
only in tally_api.TallyAPIClient (which returns parsed JSON), while the master /
voucher / bills sync paths used raw `requests.post` with no retry, so a single
transient Tally hiccup failed a whole entity for the cycle.

This helper returns the raw response text (Tally XML) so existing ElementTree
parsing in the sync modules keeps working unchanged.
"""

import logging
import random
import time

import requests

logger = logging.getLogger(__name__)

# Retryable transport/HTTP conditions
_RETRYABLE_STATUS = {429, 500, 502, 503, 504}
DEFAULT_MAX_RETRIES = 3
DEFAULT_INITIAL_DELAY = 1.0   # seconds
DEFAULT_BACKOFF_FACTOR = 2.0


def post_xml_with_retry(host: str, port: int, xml: str, timeout: int = 30,
                        max_retries: int = DEFAULT_MAX_RETRIES,
                        content_type: str = 'application/xml') -> str | None:
    """POST an XML request to Tally with exponential backoff + jitter.

    Returns the raw response text on success, or None on failure (after retries).
    Never raises — callers expect None to mean "fetch failed".
    """
    url = f"http://{host}:{port}"
    data = xml.encode('utf-8') if isinstance(xml, str) else xml

    for attempt in range(max_retries + 1):
        try:
            if attempt > 0:
                delay = DEFAULT_INITIAL_DELAY * (DEFAULT_BACKOFF_FACTOR ** (attempt - 1)) + random.uniform(0, 0.5)
                logger.warning(f"Retrying Tally request in {delay:.2f}s (attempt {attempt}/{max_retries})")
                time.sleep(delay)

            response = requests.post(
                url, data=data,
                headers={'Content-Type': content_type},
                timeout=timeout,
            )

            if response.status_code == 200:
                if attempt > 0:
                    logger.info(f"✅ Tally request succeeded on retry {attempt}")
                return response.text

            # Retry transient server errors; give up on the rest immediately.
            if response.status_code in _RETRYABLE_STATUS and attempt < max_retries:
                logger.warning(f"⚠️ Tally HTTP {response.status_code} (retryable), attempt {attempt + 1}")
                continue
            logger.error(f"❌ Tally returned HTTP {response.status_code}")
            return None

        except (requests.exceptions.ConnectionError, requests.exceptions.Timeout) as e:
            logger.warning(f"⚠️ Tally connection/timeout on attempt {attempt + 1}: {e}")
            if attempt == max_retries:
                logger.error(f"❌ Could not reach Tally after {max_retries} retries: {e}")
                return None
        except requests.exceptions.RequestException as e:
            logger.warning(f"⚠️ Tally request error on attempt {attempt + 1}: {e}")
            if attempt == max_retries:
                logger.error(f"❌ Tally request failed after {max_retries} retries: {e}")
                return None
        except Exception as e:
            logger.error(f"❌ Unexpected error during Tally request: {e}")
            return None

    return None

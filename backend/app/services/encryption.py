"""
Encryption service for secure connection string storage
"""

import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.config import get_settings


def _get_fernet() -> Fernet:
    """Get Fernet instance with derived key from encryption key"""
    settings = get_settings()
    # Derive a proper 32-byte key from the encryption key
    kdf = PBKDF2HMAC(
        algorithm=hashes.SHA256(),
        length=32,
        salt=b"querylite_salt_v1",  # Static salt for consistency
        iterations=100000,
    )
    key = base64.urlsafe_b64encode(kdf.derive(settings.encryption_key.encode()))
    return Fernet(key)


def encrypt_connection_string(connection_string: str) -> str:
    """Encrypt a connection string for secure storage"""
    fernet = _get_fernet()
    encrypted = fernet.encrypt(connection_string.encode())
    return base64.urlsafe_b64encode(encrypted).decode()


def decrypt_connection_string(encrypted_string: str) -> str:
    """Decrypt a stored connection string"""
    fernet = _get_fernet()
    encrypted = base64.urlsafe_b64decode(encrypted_string.encode())
    return fernet.decrypt(encrypted).decode()

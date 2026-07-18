"""管理员密码哈希与校验。"""

import base64
import hashlib
import hmac
import os


PASSWORD_HASH_PREFIX = "pbkdf2_sha256"
PBKDF2_ITERATIONS = 600_000
PBKDF2_DKLEN = 32


def _b64encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def hash_password(password: str) -> str:
    """使用带随机盐的 PBKDF2-SHA256 生成不可逆密码哈希。"""
    salt = os.urandom(16)
    derived_key = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
        dklen=PBKDF2_DKLEN,
    )
    return "$".join([
        PASSWORD_HASH_PREFIX,
        str(PBKDF2_ITERATIONS),
        _b64encode(salt),
        _b64encode(derived_key),
    ])


def is_password_hash(value: str) -> bool:
    """判断数据库值是否为本项目生成的密码哈希。"""
    return value.startswith(f"{PASSWORD_HASH_PREFIX}$")


def verify_password(password: str, stored_value: str) -> bool:
    """校验密码，并兼容数据库迁移前的明文值。"""
    if not is_password_hash(stored_value):
        return hmac.compare_digest(password, stored_value)

    try:
        prefix, iterations, salt, expected_key = stored_value.split("$", 3)
        if prefix != PASSWORD_HASH_PREFIX:
            return False
        expected_key_bytes = _b64decode(expected_key)
        derived_key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            _b64decode(salt),
            int(iterations),
            dklen=len(expected_key_bytes),
        )
        return hmac.compare_digest(derived_key, expected_key_bytes)
    except (TypeError, ValueError):
        return False

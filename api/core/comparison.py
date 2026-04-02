"""
Binary comparison engine
"""

import hashlib
from typing import List, Dict, Optional


def compute_md5(data: bytes) -> str:
    """Compute MD5 hash of binary data"""
    return hashlib.md5(data[:1024]).hexdigest()[:32]


def compare_binary_files(data_a: bytes, data_b: bytes) -> List[Dict]:
    """
    Compare two binary files and return differences

    Returns list of difference blocks with:
    - offset: Starting byte position
    - length: Number of bytes in the difference
    - change_type: ADDED, REMOVED, or MODIFIED
    """
    differences = []
    max_length = max(len(data_a), len(data_b))

    diff_start = None

    for i in range(max_length):
        byte_a = data_a[i] if i < len(data_a) else None
        byte_b = data_b[i] if i < len(data_b) else None

        if byte_a != byte_b:
            if diff_start is None:
                diff_start = i
        elif diff_start is not None:
            differences.append({
                'offset': diff_start,
                'length': i - diff_start,
                'change_type': determine_change_type(diff_start, i, len(data_a), len(data_b)),
                'bytes_a': list(data_a[diff_start:i]) if diff_start < len(data_a) else [],
                'bytes_b': list(data_b[diff_start:i]) if diff_start < len(data_b) else []
            })
            diff_start = None

    if diff_start is not None:
        differences.append({
            'offset': diff_start,
            'length': max_length - diff_start,
            'change_type': determine_change_type(diff_start, max_length, len(data_a), len(data_b)),
            'bytes_a': list(data_a[diff_start:]) if diff_start < len(data_a) else [],
            'bytes_b': list(data_b[diff_start:]) if diff_start < len(data_b) else []
        })

    return differences


def determine_change_type(start: int, end: int, len_a: int, len_b: int) -> str:
    """Determine the type of change"""
    if start >= len_a:
        return 'ADDED'
    if end > len_b:
        return 'ADDED'
    if start >= len_b:
        return 'REMOVED'
    return 'MODIFIED'


def format_hex_bytes(data: List[int], length: int = 0) -> str:
    """Format bytes as space-separated hex string"""
    if not data:
        return '-- ' * length if length else ''
    sliced = data[:length] if length else data
    return ' '.join(f'{b:02X}' for b in sliced)


def bytes_to_int_little_endian(data: List[int]) -> Optional[int]:
    """Convert bytes to integer (little-endian)"""
    if not data:
        return None
    result = 0
    for i, b in enumerate(data[:4]):
        result |= b << (i * 8)
    return result

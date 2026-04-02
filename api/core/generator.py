"""
Sample binary data generator for demo purposes
"""

from typing import List


def generate_sample_binary(size: int = 32768) -> bytes:
    """
    Generate sample ECU binary data for demo

    Creates a realistic-ish binary with known parameters at fixed addresses:
    - Engine_Speed_Limit at 0x1234 (2 bytes)
    - Idle_Speed at 0x1238 (2 bytes)
    - RPM_Axis at 0x4000 (32 bytes, 16 values)
    - Fuel_Map at 0x5000 (256 bytes, 16x16)
    - Ignition_Map at 0x6000 (144 bytes, 12x12)
    """
    data = bytearray(size)

    # Engine Speed Limit at 0x1234 (8000 RPM in little-endian)
    data[0x1234] = 0x40
    data[0x1235] = 0x1F

    # Idle Speed at 0x1238 (2000 RPM)
    data[0x1238] = 0xD0
    data[0x1239] = 0x07

    # Throttle Position at 0x1240 (25%)
    data[0x1240] = 0x40

    # RPM Axis at 0x4000 (16 values: 500, 1000, 1500... 8000 RPM)
    for i in range(16):
        rpm = 500 + i * 500
        data[0x4000 + i * 2] = rpm & 0xFF
        data[0x4000 + i * 2 + 1] = (rpm >> 8) & 0xFF

    # Load Axis at 0x4100 (16 values: 0, 10, 20... 150%)
    for i in range(16):
        load = i * 10
        data[0x4100 + i * 2] = load & 0xFF
        data[0x4100 + i * 2 + 1] = (load >> 8) & 0xFF

    # Fuel Map at 0x5000 (16x16 table, values 100-200)
    for row in range(16):
        for col in range(16):
            fuel = min(255, 100 + row * 5 + col * 2)
            data[0x5000 + row * 16 + col] = fuel

    # Ignition Map at 0x6000 (12x12 table, values 10-50 degrees)
    for row in range(12):
        for col in range(12):
            ignition = min(255, 20 + row * 3 + col)
            data[0x6000 + row * 12 + col] = ignition

    # Fill rest with pattern for visual interest
    for i in range(size):
        if data[i] == 0:
            data[i] = (i * 7 + 3) % 256

    return bytes(data)


def generate_modified_binary(original: bytes) -> bytes:
    """
    Generate a modified version for comparison demo

    Changes made:
    - Engine Speed Limit: 8000 -> 9000 RPM
    - Idle Speed: 2000 -> 2100 RPM
    - Fuel Map cells: modified values at various points
    - Ignition Map: slight adjustments
    """
    modified = bytearray(original)

    # Modify Engine Speed Limit (+1000 RPM = 0x03E8)
    modified[0x1234] = 0xE8
    modified[0x1235] = 0x03

    # Modify Idle Speed (+100 RPM = 0x0064)
    modified[0x1238] = 0x64
    modified[0x1239] = 0x08

    # Modify some Fuel Map cells
    modified[0x5005] = 130   # was 112
    modified[0x5010] = 145   # was 120
    modified[0x5020] = 160   # was 135
    modified[0x5030] = 175   # was 150
    modified[0x5040] = 185   # was 160
    modified[0x5080] = 190   # was 170

    # Modify Ignition Map
    modified[0x6005] = 30    # was 25
    modified[0x6010] = 35    # was 28
    modified[0x6020] = 40    # was 31

    return bytes(modified)


def get_parameter_at_address(data: bytes, address: int, size: int = 2) -> List[int]:
    """Get bytes at a specific address"""
    if address >= len(data):
        return []
    return list(data[address:min(address + size, len(data))])


def read_uint16(data: bytes, address: int) -> int:
    """Read unsigned 16-bit value at address (little-endian)"""
    if address + 2 > len(data):
        return 0
    return data[address] | (data[address + 1] << 8)


def read_uint8(data: bytes, address: int) -> int:
    """Read unsigned 8-bit value at address"""
    if address >= len(data):
        return 0
    return data[address]

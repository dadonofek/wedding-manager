import pytest

from wedding_sender.phone import is_valid_il, normalize_il_number


@pytest.mark.parametrize(
    ("raw", "expected"),
    [
        ("050-1234567", "972501234567"),
        ("0501234567", "972501234567"),
        ("+972 50 123 4567", "972501234567"),
        ("972501234567", "972501234567"),
        ("50-1234567", "972501234567"),      # bare mobile, no leading 0
        ("  052.765.4321 ", "972527654321"),
        ("03-5551234", "97235551234"),       # landline (8 digits after 972)
        ("", ""),
        ("abc", ""),
    ],
)
def test_normalize(raw, expected):
    assert normalize_il_number(raw) == expected


@pytest.mark.parametrize(
    ("num", "valid"),
    [
        ("972501234567", True),   # 972 + 9 digits
        ("97235551234", True),    # 972 + 8 digits
        ("9725012345", False),    # too short
        ("9725012345678", False), # too long
        ("15551234567", False),   # not Israeli
        ("", False),
    ],
)
def test_is_valid_il(num, valid):
    assert is_valid_il(num) is valid

from pathlib import Path

import pytest

FIXTURES = Path(__file__).parent / "fixtures"


@pytest.fixture
def export_csv() -> Path:
    """The committed sample export (3 valid Hebrew invite rows, UTF-8 BOM)."""
    return FIXTURES / "export_sample.csv"

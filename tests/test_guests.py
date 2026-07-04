import pytest

from wedding_sender.guests import Guest, load_guests


def test_load_fixture_happy_path(export_csv):
    guests, warnings = load_guests(export_csv)
    assert warnings == []
    assert [g.name for g in guests] == ["משפחת כהן", "דנה ויוסי לוי", "סבתא רחל"]
    assert [g.phone for g in guests] == [
        "972501234567", "972527654321", "972537654321",
    ]
    assert all(g.kind == "invite" for g in guests)
    assert guests[0].link.endswith("token=ab12cd34ef")


def test_skips_bad_rows_with_warnings(tmp_path):
    csv_text = (
        "id,name,phone,link,kind\n"
        "aaa,טובים,0501234567,https://x/exec?token=aaa,invite\n"
        "bbb,בלי טלפון,,https://x/exec?token=bbb,invite\n"
        "ccc,טלפון שגוי,12,https://x/exec?token=ccc,invite\n"
        "ddd,בלי קישור,0521111111,,invite\n"
        "eee,כפול,050-1234567,https://x/exec?token=eee,invite\n"
    )
    p = tmp_path / "export.csv"
    p.write_text(csv_text, encoding="utf-8")

    guests, warnings = load_guests(p)
    assert [g.id for g in guests] == ["aaa"]
    assert len(warnings) == 4
    assert "line 3" in warnings[0] and "missing" in warnings[0]
    assert "line 4" in warnings[1] and "invalid phone" in warnings[1]
    assert "line 5" in warnings[2] and "missing" in warnings[2]
    assert "line 6" in warnings[3] and "duplicate" in warnings[3]


def test_column_order_does_not_matter(tmp_path):
    p = tmp_path / "export.csv"
    p.write_text(
        "kind,link,phone,name,id\n"
        "reminder_1,https://x/exec?token=aaa,0501234567,רות,aaa\n",
        encoding="utf-8",
    )
    guests, warnings = load_guests(p)
    assert warnings == []
    assert guests == [
        Guest(id="aaa", name="רות", phone="972501234567",
              link="https://x/exec?token=aaa", kind="reminder_1")
    ]


def test_missing_column_raises(tmp_path):
    p = tmp_path / "export.csv"
    p.write_text("id,name,phone\naaa,x,0501234567\n", encoding="utf-8")
    with pytest.raises(ValueError, match="missing column"):
        load_guests(p)

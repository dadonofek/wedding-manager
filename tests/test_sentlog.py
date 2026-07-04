import re

from wedding_sender.guests import Guest
from wedding_sender.sentlog import SentLog


def guest(gid="aaa", kind="invite"):
    return Guest(id=gid, name="א", phone="972501234567",
                 link="https://x/exec?token=" + gid, kind=kind)


def test_missing_file_means_nothing_sent(tmp_path):
    log = SentLog(tmp_path / "sent_log.csv")
    assert not log.is_sent(guest())


def test_mark_then_reload_persists(tmp_path):
    path = tmp_path / "sent_log.csv"
    SentLog(path).mark(guest())

    reloaded = SentLog(path)
    assert reloaded.is_sent(guest())
    assert not reloaded.is_sent(guest(gid="bbb"))


def test_invite_does_not_block_reminders(tmp_path):
    path = tmp_path / "sent_log.csv"
    log = SentLog(path)
    log.mark(guest(kind="invite"))

    assert log.is_sent(guest(kind="invite"))
    assert not log.is_sent(guest(kind="reminder_1"))

    log.mark(guest(kind="reminder_1"))
    assert log.is_sent(guest(kind="reminder_1"))
    assert not log.is_sent(guest(kind="reminder_2"))


def test_file_format_matches_sheet_import_contract(tmp_path):
    path = tmp_path / "sent_log.csv"
    log = SentLog(path)
    log.mark(guest())
    log.mark(guest(gid="bbb", kind="reminder_1"))

    lines = path.read_text(encoding="utf-8").strip().splitlines()
    assert lines[0] == "id,phone,kind,sent_at"
    assert re.fullmatch(
        r"aaa,972501234567,invite,\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}", lines[1]
    )
    assert lines[2].startswith("bbb,972501234567,reminder_1,")

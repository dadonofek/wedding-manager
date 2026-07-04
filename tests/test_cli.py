import subprocess
import sys

import pytest

from wedding_sender import cli
from wedding_sender.desktop import FocusLostError
from wedding_sender.sentlog import SentLog


@pytest.fixture
def forbid_send(monkeypatch):
    def explode(*args, **kwargs):
        raise AssertionError("send_via_whatsapp_desktop must not be called")

    monkeypatch.setattr(cli, "send_via_whatsapp_desktop", explode)


@pytest.fixture
def live_env(monkeypatch):
    """Pretend we're on macOS with instant sleeps and a recording sender."""
    sent = []
    monkeypatch.setattr(sys, "platform", "darwin")
    monkeypatch.setattr(cli.time, "sleep", lambda s: None)
    monkeypatch.setattr(cli.random, "uniform", lambda a, b: a)
    monkeypatch.setattr(
        cli, "send_via_whatsapp_desktop",
        lambda phone, message, **kw: sent.append((phone, message)),
    )
    return sent


def run(args):
    return cli.main(args)


def test_dry_run_is_default_and_sends_nothing(export_csv, forbid_send, tmp_path, capsys):
    log = tmp_path / "sent_log.csv"
    rc = run(["invite", "--csv", str(export_csv), "--sent-log", str(log)])

    assert rc == 0
    assert not log.exists()
    out = capsys.readouterr().out
    assert "DRY RUN" in out
    assert "משפחת כהן" in out          # rendered preview
    assert out.count("would send") == 3


def test_live_refuses_on_non_macos(export_csv, forbid_send, monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(sys, "platform", "linux")
    rc = run(["invite", "--csv", str(export_csv), "--live",
              "--sent-log", str(tmp_path / "log.csv")])

    assert rc == 2
    assert "only works on macOS" in capsys.readouterr().err


def test_live_sends_marks_and_reports(export_csv, live_env, tmp_path, capsys):
    log = tmp_path / "sent_log.csv"
    rc = run(["invite", "--csv", str(export_csv), "--live", "--sent-log", str(log)])

    assert rc == 0
    assert [phone for phone, _ in live_env] == [
        "972501234567", "972527654321", "972537654321",
    ]
    assert all("token=" in msg for _, msg in live_env)
    assert log.read_text(encoding="utf-8").count("invite") == 3
    assert "✓ sent" in capsys.readouterr().out


def test_live_resumes_from_sent_log(export_csv, live_env, tmp_path):
    log = tmp_path / "sent_log.csv"
    first = SentLog(log)

    from wedding_sender.guests import load_guests
    guests, _ = load_guests(export_csv)
    first.mark(guests[0])

    rc = run(["invite", "--csv", str(export_csv), "--live", "--sent-log", str(log)])

    assert rc == 0
    assert [phone for phone, _ in live_env] == ["972527654321", "972537654321"]


def test_limit_caps_the_batch(export_csv, live_env, tmp_path):
    rc = run(["invite", "--csv", str(export_csv), "--live", "--limit", "1",
              "--sent-log", str(tmp_path / "log.csv")])

    assert rc == 0
    assert len(live_env) == 1


def test_focus_lost_aborts_run(export_csv, monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(sys, "platform", "darwin")
    monkeypatch.setattr(cli.time, "sleep", lambda s: None)
    monkeypatch.setattr(cli.random, "uniform", lambda a, b: a)

    calls = []

    def sender(phone, message, **kw):
        calls.append(phone)
        if len(calls) == 2:
            raise FocusLostError("WhatsApp is not frontmost (found: Finder)")

    monkeypatch.setattr(cli, "send_via_whatsapp_desktop", sender)
    log = tmp_path / "sent_log.csv"
    rc = run(["invite", "--csv", str(export_csv), "--live", "--sent-log", str(log)])

    assert rc == 1
    assert len(calls) == 2                    # stopped, third never attempted
    assert log.read_text(encoding="utf-8").count("invite") == 1
    assert "Aborted" in capsys.readouterr().out


def test_send_failure_continues_and_exits_nonzero(export_csv, monkeypatch, tmp_path, capsys):
    monkeypatch.setattr(sys, "platform", "darwin")
    monkeypatch.setattr(cli.time, "sleep", lambda s: None)
    monkeypatch.setattr(cli.random, "uniform", lambda a, b: a)

    calls = []

    def sender(phone, message, **kw):
        calls.append(phone)
        if len(calls) == 1:
            raise subprocess.CalledProcessError(1, ["osascript"], stderr="boom")

    monkeypatch.setattr(cli, "send_via_whatsapp_desktop", sender)
    log = tmp_path / "sent_log.csv"
    rc = run(["invite", "--csv", str(export_csv), "--live", "--sent-log", str(log)])

    assert rc == 1
    assert len(calls) == 3                    # kept going after the failure
    assert log.read_text(encoding="utf-8").count("invite") == 2
    assert "Failed (1)" in capsys.readouterr().out


def test_kind_mismatch_rows_are_skipped(export_csv, forbid_send, tmp_path, capsys):
    rc = run(["reminder", "--csv", str(export_csv),
              "--sent-log", str(tmp_path / "log.csv")])

    assert rc == 0
    out = capsys.readouterr().out
    assert "Nothing to send" in out
    assert out.count("does not match") == 3


def test_reminder_rounds_use_reminder_template(tmp_path, live_env):
    p = tmp_path / "reminders.csv"
    p.write_text(
        "id,name,phone,link,kind\n"
        "aaa,רות,0501234567,https://x/exec?token=aaa,reminder_1\n"
        "bbb,דוד,0521111111,https://x/exec?token=bbb,reminder_2\n",
        encoding="utf-8",
    )
    rc = run(["reminder", "--csv", str(p), "--live",
              "--sent-log", str(tmp_path / "log.csv")])

    assert rc == 0
    assert len(live_env) == 2
    assert all("להזכיר" in msg for _, msg in live_env)
    log_text = (tmp_path / "log.csv").read_text(encoding="utf-8")
    assert "aaa,972501234567,reminder_1," in log_text
    assert "bbb,972521111111,reminder_2," in log_text

import subprocess

import pytest

from wedding_sender.desktop import (
    FocusLostError,
    build_osascript,
    build_url,
    send_via_whatsapp_desktop,
)


def test_build_url_percent_encodes_message():
    url = build_url("972501234567", "שלום!\nhttps://x/exec?token=aaa")
    assert url.startswith("whatsapp://send?phone=972501234567&text=")
    assert "\n" not in url and "שלום" not in url
    assert "%0A" in url  # newline survives as an encoded char


def test_build_osascript_guards_focus():
    osa = build_osascript("whatsapp://send?phone=1&text=x", chat_load_delay=3.5)
    assert 'open location "whatsapp://send?phone=1&text=x"' in osa
    assert "delay 3.5" in osa
    assert "frontmost" in osa
    assert "keystroke return" in osa


def test_send_invokes_osascript_runner():
    calls = []

    def runner(cmd, **kwargs):
        calls.append((cmd, kwargs))

    send_via_whatsapp_desktop("972501234567", "היי", runner=runner)

    (cmd, kwargs), = calls
    assert cmd[0:2] == ["osascript", "-e"]
    assert "whatsapp://send?phone=972501234567" in cmd[2]
    assert kwargs == {"check": True, "capture_output": True, "text": True}


def test_focus_lost_raises_dedicated_error():
    def runner(cmd, **kwargs):
        raise subprocess.CalledProcessError(
            1, cmd, stderr="execution error: WhatsApp is not frontmost (found: Finder)"
        )

    with pytest.raises(FocusLostError, match="not frontmost"):
        send_via_whatsapp_desktop("972501234567", "היי", runner=runner)


def test_other_failures_propagate():
    def runner(cmd, **kwargs):
        raise subprocess.CalledProcessError(1, cmd, stderr="some osascript error")

    with pytest.raises(subprocess.CalledProcessError):
        send_via_whatsapp_desktop("972501234567", "היי", runner=runner)

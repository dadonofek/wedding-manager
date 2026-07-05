import subprocess
from pathlib import Path

import pytest

from wedding_sender.desktop import (
    FocusLostError,
    applescript_quote,
    build_chat_url,
    build_osascript,
    build_osascript_with_image,
    build_url,
    clipboard_image_clause,
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


def test_applescript_quote_escapes_specials():
    assert applescript_quote('של"ום \\ שלום') == 'של\\"ום \\\\ שלום'
    assert applescript_quote("a\nb\rc") == "a\\nb\\rc"


def test_clipboard_image_clause_picks_class_by_extension():
    png = clipboard_image_clause(Path("/tmp/invite.PNG"))
    assert "«class PNGf»" in png and "/tmp/invite.PNG" in png
    jpg = clipboard_image_clause(Path("/tmp/invite.jpg"))
    assert "JPEG picture" in jpg


def test_clipboard_image_clause_rejects_unknown_extension():
    with pytest.raises(ValueError, match="unsupported image extension"):
        clipboard_image_clause(Path("/tmp/invite.gif"))


def test_build_osascript_with_image_pastes_then_captions():
    osa = build_osascript_with_image(
        build_chat_url("972501234567"),
        Path("/tmp/invite.png"),
        'שלום "רות"',
        chat_load_delay=3.0,
        attach_delay=2.0,
    )
    assert 'open location "whatsapp://send?phone=972501234567"' in osa
    assert "text=" not in osa                      # no prefilled draft
    assert "«class PNGf»" in osa                   # image on the clipboard
    assert 'set the clipboard to "שלום \\"רות\\""' in osa  # quoted caption
    assert "delay 3.0" in osa and "delay 2.0" in osa
    assert osa.count('keystroke "v" using command down') == 2
    assert osa.count("keystroke return") == 1
    # a focus check guards every keystroke
    keystrokes = osa.count("keystroke")
    assert osa.count("not frontmost") == keystrokes


def test_send_with_image_uses_image_script(tmp_path):
    img = tmp_path / "invite.png"
    img.write_bytes(b"png")
    calls = []

    def runner(cmd, **kwargs):
        calls.append(cmd)

    send_via_whatsapp_desktop("972501234567", "היי", image=img, runner=runner)

    (cmd,) = calls
    osa = cmd[2]
    assert "«class PNGf»" in osa
    assert str(img) in osa
    assert "text=" not in osa


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

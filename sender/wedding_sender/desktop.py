"""WhatsApp Desktop automation (macOS).

Opens whatsapp://send?... to prefill the message, then uses osascript /
System Events to press Return — after verifying WhatsApp is actually the
frontmost app, so a stray keystroke never lands in another window.

With an image, the whatsapp:// scheme can't attach media, so the script
pastes instead: copy the image file to the clipboard, Cmd+V into the chat
(WhatsApp opens its media preview with the caption box focused), copy the
message text, Cmd+V again as the caption, then press Return.
"""

from __future__ import annotations

import subprocess
import urllib.parse
from pathlib import Path

_IMAGE_CLIPBOARD_CLASS = {
    ".png": "«class PNGf»",
    ".jpg": "JPEG picture",
    ".jpeg": "JPEG picture",
}

# Verify focus; abort instead of typing into the wrong app.
_FOCUS_CHECK = '''set frontApp to name of first application process whose frontmost is true
        if frontApp is not "WhatsApp" then
            error "WhatsApp is not frontmost (found: " & frontApp & ")"
        end if'''


class FocusLostError(RuntimeError):
    """WhatsApp was not frontmost when we were about to press a key."""


def build_url(phone: str, message: str) -> str:
    return f"whatsapp://send?phone={phone}&text={urllib.parse.quote(message)}"


def build_chat_url(phone: str) -> str:
    """Chat URL with no prefilled text (used when the text goes in a caption)."""
    return f"whatsapp://send?phone={phone}"


def applescript_quote(s: str) -> str:
    """Escape a Python string for use inside an AppleScript string literal."""
    return (
        s.replace("\\", "\\\\")
        .replace('"', '\\"')
        .replace("\r", "\\r")
        .replace("\n", "\\n")
    )


def clipboard_image_clause(path: Path) -> str:
    """AppleScript that puts an image file's pixels on the clipboard."""
    cls = _IMAGE_CLIPBOARD_CLASS.get(path.suffix.lower())
    if cls is None:
        raise ValueError(
            f"unsupported image extension {path.suffix!r} (use .png/.jpg/.jpeg)"
        )
    posix = applescript_quote(str(path.resolve()))
    return f'set the clipboard to (read (POSIX file "{posix}") as {cls})'


def build_osascript(url: str, chat_load_delay: float) -> str:
    return f'''
    -- Open the chat with the prefilled message
    open location "{url}"

    -- Wait for WhatsApp to open the chat
    delay {chat_load_delay}

    -- Make absolutely sure WhatsApp is the frontmost app before typing
    tell application "WhatsApp" to activate
    delay 0.5

    tell application "System Events"
        {_FOCUS_CHECK}
        keystroke return
    end tell
    '''


def build_osascript_with_image(
    url: str,
    image_path: Path,
    message: str,
    chat_load_delay: float,
    attach_delay: float,
) -> str:
    caption = applescript_quote(message)
    return f'''
    -- Open the chat (no prefilled text — the message is pasted as the caption)
    open location "{url}"

    -- Wait for WhatsApp to open the chat
    delay {chat_load_delay}

    -- Make absolutely sure WhatsApp is the frontmost app before typing
    tell application "WhatsApp" to activate
    delay 0.5

    -- Paste the invitation image into the chat
    {clipboard_image_clause(image_path)}
    tell application "System Events"
        {_FOCUS_CHECK}
        keystroke "v" using command down
    end tell

    -- Wait for the media preview to open (its caption box takes focus)
    delay {attach_delay}

    -- Paste the message text as the caption, then send
    set the clipboard to "{caption}"
    tell application "System Events"
        {_FOCUS_CHECK}
        keystroke "v" using command down
        delay 0.5
        {_FOCUS_CHECK}
        keystroke return
    end tell
    '''


def send_via_whatsapp_desktop(
    phone: str,
    message: str,
    *,
    chat_load_delay: float = 2.5,
    image: Path | None = None,
    attach_delay: float = 1.5,
    runner=subprocess.run,
) -> None:
    """Send one message (optionally an image with the message as caption).
    Raises FocusLostError if focus verification failed, or
    subprocess.CalledProcessError for any other osascript failure."""
    if image is not None:
        osa = build_osascript_with_image(
            build_chat_url(phone), image, message,
            chat_load_delay=chat_load_delay, attach_delay=attach_delay,
        )
    else:
        osa = build_osascript(build_url(phone, message), chat_load_delay)
    try:
        runner(
            ["osascript", "-e", osa],
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.CalledProcessError as e:
        if "not frontmost" in (e.stderr or ""):
            raise FocusLostError((e.stderr or "").strip()) from e
        raise

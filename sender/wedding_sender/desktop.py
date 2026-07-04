"""WhatsApp Desktop automation (macOS).

Opens whatsapp://send?... to prefill the message, then uses osascript /
System Events to press Return — after verifying WhatsApp is actually the
frontmost app, so a stray keystroke never lands in another window.
"""

from __future__ import annotations

import subprocess
import urllib.parse


class FocusLostError(RuntimeError):
    """WhatsApp was not frontmost when we were about to press Return."""


def build_url(phone: str, message: str) -> str:
    return f"whatsapp://send?phone={phone}&text={urllib.parse.quote(message)}"


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
        -- Verify focus; abort instead of typing into the wrong app
        set frontApp to name of first application process whose frontmost is true
        if frontApp is not "WhatsApp" then
            error "WhatsApp is not frontmost (found: " & frontApp & ")"
        end if
        keystroke return
    end tell
    '''


def send_via_whatsapp_desktop(
    phone: str,
    message: str,
    *,
    chat_load_delay: float = 2.5,
    runner=subprocess.run,
) -> None:
    """Send one message. Raises FocusLostError if focus verification failed,
    or subprocess.CalledProcessError for any other osascript failure."""
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

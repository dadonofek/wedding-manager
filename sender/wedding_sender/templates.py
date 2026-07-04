"""Message templates: plain text with {name} and {link} placeholders."""

from __future__ import annotations

import re
from importlib.resources import files
from pathlib import Path

from .guests import Guest

ALLOWED_PLACEHOLDERS = {"name", "link"}
_PLACEHOLDER_RE = re.compile(r"\{([^{}]*)\}")


class TemplateError(ValueError):
    pass


def default_template_path(kind: str) -> Path:
    """Packaged template for a CLI subcommand ('invite' / 'reminder')."""
    return Path(str(files("wedding_sender").joinpath(f"templates/{kind}.txt")))


def load_template(path: Path | str) -> str:
    text = Path(path).read_text(encoding="utf-8")
    validate_template(text)
    return text


def validate_template(template: str) -> None:
    placeholders = set(_PLACEHOLDER_RE.findall(template))
    unknown = placeholders - ALLOWED_PLACEHOLDERS
    if unknown:
        raise TemplateError(
            f"unknown placeholder(s) {sorted(unknown)}; only "
            f"{sorted(ALLOWED_PLACEHOLDERS)} are supported"
        )
    if "link" not in placeholders:
        raise TemplateError("template must contain the {link} placeholder")


def render_message(template: str, guest: Guest) -> str:
    validate_template(template)
    return template.replace("{name}", guest.name).replace("{link}", guest.link)

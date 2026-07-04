import pytest

from wedding_sender.guests import Guest
from wedding_sender.templates import (
    TemplateError,
    default_template_path,
    load_template,
    render_message,
)

GUEST = Guest(id="aaa", name="משפחת כהן", phone="972501234567",
              link="https://x/exec?token=aaa", kind="invite")


def test_render_substitutes_name_and_link():
    out = render_message("שלום {name}!\n{link}", GUEST)
    assert out == "שלום משפחת כהן!\nhttps://x/exec?token=aaa"


def test_hebrew_and_emoji_preserved():
    template = "מזל טוב 🎉💍 {name} — נתראה!\n{link}"
    out = render_message(template, GUEST)
    assert "🎉💍" in out
    assert out.startswith("מזל טוב")


def test_unknown_placeholder_raises():
    with pytest.raises(TemplateError, match="unknown placeholder"):
        render_message("שלום {first_name} {link}", GUEST)


def test_missing_link_raises():
    with pytest.raises(TemplateError, match="{link}"):
        render_message("שלום {name}, מתחתנים!", GUEST)


@pytest.mark.parametrize("kind", ["invite", "reminder"])
def test_builtin_templates_are_valid(kind):
    template = load_template(default_template_path(kind))
    out = render_message(template, GUEST)
    assert "משפחת כהן" in out
    # RTL hygiene: the link sits alone on the last non-empty line
    assert out.rstrip().splitlines()[-1] == GUEST.link

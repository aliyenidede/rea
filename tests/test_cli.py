from pathlib import Path

from typer.testing import CliRunner

from rea import __version__
from rea.cli import app

runner = CliRunner()

# The legacy 0.7.x template tree. It is kept in the repo as the record of what
# rea-dev 0.7.1/0.7.2 shipped, but 0.7.3 no longer copies it and the wheel no
# longer carries it — so this path is resolved from the repo, not the package.
TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "rea" / "templates"


# --- version command ---


def test_version():
    result = runner.invoke(app, ["version"])
    assert result.exit_code == 0
    assert "rea" in result.output
    # `rea version` must stay clean of the setup deprecation notice (4a-2 invariant).
    assert "Deprecation notice" not in result.output


def test_version_shows_current_version():
    result = runner.invoke(app, ["version"])
    assert __version__ in result.output


# --- setup command: the signpost ---


def test_setup_exits_non_zero(tmp_path: Path):
    # A script that still calls `rea setup` must fail loudly rather than look
    # like it installed something.
    result = runner.invoke(app, ["setup", str(tmp_path)])
    assert result.exit_code == 1


def test_setup_writes_nothing(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])
    assert list(tmp_path.iterdir()) == []


def test_setup_creates_no_claude_dir(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])
    assert not (tmp_path / ".claude").exists()


def test_setup_creates_no_rea_dir(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])
    assert not (tmp_path / ".rea").exists()


def test_setup_prints_deprecation_notice(tmp_path: Path):
    result = runner.invoke(app, ["setup", str(tmp_path)])
    assert "Deprecation notice" in result.output


def test_setup_points_at_the_npx_installer(tmp_path: Path):
    result = runner.invoke(app, ["setup", str(tmp_path)])
    assert "npx readev-tools setup" in result.output


def test_setup_mentions_the_migrate_path(tmp_path: Path):
    result = runner.invoke(app, ["setup", str(tmp_path)])
    assert "npx readev-tools migrate" in result.output


def test_setup_names_the_pinned_fallback(tmp_path: Path):
    # The rollback plan (.rea/decisions/0001) pins 0.7.1 as the frozen
    # fallback — the signpost must say so, or removing the copy behaviour
    # leaves users with no route back.
    result = runner.invoke(app, ["setup", str(tmp_path)])
    assert "rea-dev==0.7.1" in result.output


def test_setup_without_a_path_still_only_prints(tmp_path: Path, monkeypatch):
    monkeypatch.chdir(tmp_path)
    result = runner.invoke(app, ["setup"])
    assert result.exit_code == 1
    assert list(tmp_path.iterdir()) == []


def test_cli_module_is_ascii_only():
    # A legacy Windows console (cp1252) cannot encode characters like the em
    # dash or the arrow: rich raises UnicodeEncodeError mid-render and the
    # user gets a traceback instead of the signpost. Found by running the
    # built wheel in cmd.exe before publishing 0.7.3.
    #
    # The assertion is on the source, not on rendered output: rich picks its
    # own box-drawing characters from the terminal (Unicode on a modern one,
    # ASCII on a legacy console), so only the strings we author are ours to
    # keep encodable.
    import rea.cli

    source = Path(rea.cli.__file__).read_text(encoding="utf-8")
    source.encode("ascii")


def test_setup_never_raises_on_normal_invocation(tmp_path: Path):
    result = runner.invoke(app, ["setup", str(tmp_path)])
    assert result.exception is None or isinstance(result.exception, SystemExit)


# --- bare invocation ---


def test_bare_invocation_prints_deprecation_notice():
    result = runner.invoke(app, [])
    assert "Deprecation notice" in result.output
    assert "npx readev-tools setup" in result.output


def test_bare_invocation_does_not_advertise_rea_setup():
    # The old panel walked the user through `rea setup .` — that instruction
    # is now wrong and must not survive anywhere in the output.
    result = runner.invoke(app, [])
    assert "rea setup ." not in result.output


# --- legacy template tree (repo record; no longer shipped or copied) ---


def test_templates_dir_exists():
    assert TEMPLATES_DIR.is_dir()


def test_command_templates_have_frontmatter():
    commands_dir = TEMPLATES_DIR / ".claude" / "commands"
    for f in commands_dir.iterdir():
        content = f.read_text(encoding="utf-8")
        assert content.startswith("---"), f"{f.name} missing frontmatter"
        # Check frontmatter closes
        second_dash = content.index("---", 3)
        assert second_dash > 3, f"{f.name} has unclosed frontmatter"


def test_agent_templates_have_frontmatter():
    agents_dir = TEMPLATES_DIR / ".claude" / "agents"
    for f in agents_dir.iterdir():
        content = f.read_text(encoding="utf-8")
        assert content.startswith("---"), f"{f.name} missing frontmatter"
        second_dash = content.index("---", 3)
        assert second_dash > 3, f"{f.name} has unclosed frontmatter"


def test_agent_templates_specify_model():
    agents_dir = TEMPLATES_DIR / ".claude" / "agents"
    for f in agents_dir.iterdir():
        content = f.read_text(encoding="utf-8")
        assert "model:" in content.lower(), f"{f.name} missing model field"

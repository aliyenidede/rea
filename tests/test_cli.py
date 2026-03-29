from pathlib import Path

from typer.testing import CliRunner

from rea import __version__
from rea.cli import TEMPLATES_DIR, app

runner = CliRunner()


# --- version command ---


def test_version():
    result = runner.invoke(app, ["version"])
    assert result.exit_code == 0
    assert "rea" in result.output


def test_version_shows_current_version():
    result = runner.invoke(app, ["version"])
    assert __version__ in result.output


# --- init command: directory structure ---


def test_init_creates_claude_commands_dir(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])
    assert (tmp_path / ".claude" / "commands").is_dir()


def test_init_creates_claude_agents_dir(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])
    assert (tmp_path / ".claude" / "agents").is_dir()


def test_init_creates_rea_log_dir(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])
    assert (tmp_path / ".rea" / "log").is_dir()


def test_init_creates_rea_plans_dir(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])
    assert (tmp_path / ".rea" / "plans").is_dir()


# --- init command: template files ---


def test_init_copies_all_command_templates(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])
    src_commands = list((TEMPLATES_DIR / ".claude" / "commands").iterdir())
    dst_commands = list((tmp_path / ".claude" / "commands").iterdir())
    assert len(dst_commands) == len(src_commands)
    src_names = {f.name for f in src_commands}
    dst_names = {f.name for f in dst_commands}
    assert dst_names == src_names


def test_init_copies_all_agent_templates(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])
    src_agents = list((TEMPLATES_DIR / ".claude" / "agents").iterdir())
    dst_agents = list((tmp_path / ".claude" / "agents").iterdir())
    assert len(dst_agents) == len(src_agents)
    src_names = {f.name for f in src_agents}
    dst_names = {f.name for f in dst_agents}
    assert dst_names == src_names


def test_init_copied_files_match_source_content(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])
    for dirname in ["commands", "agents"]:
        src_dir = TEMPLATES_DIR / ".claude" / dirname
        for src_file in src_dir.iterdir():
            dst_file = tmp_path / ".claude" / dirname / src_file.name
            assert dst_file.read_text(encoding="utf-8") == src_file.read_text(
                encoding="utf-8"
            ), f"Content mismatch: {src_file.name}"


# --- init command: idempotency ---


def test_init_is_idempotent(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])
    result = runner.invoke(app, ["setup", str(tmp_path)])
    assert result.exit_code == 0

    src_commands = list((TEMPLATES_DIR / ".claude" / "commands").iterdir())
    dst_commands = list((tmp_path / ".claude" / "commands").iterdir())
    assert len(dst_commands) == len(src_commands)


def test_init_updates_existing_files(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])

    # Modify a copied file
    target_file = tmp_path / ".claude" / "commands" / "rea-plan.md"
    target_file.write_text("modified content")

    # Re-run init
    runner.invoke(app, ["setup", str(tmp_path)])

    # Should be overwritten with source content
    src_file = TEMPLATES_DIR / ".claude" / "commands" / "rea-plan.md"
    assert target_file.read_text() == src_file.read_text()


def test_init_preserves_extra_user_files(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])

    # User adds their own command
    user_file = tmp_path / ".claude" / "commands" / "my-custom.md"
    user_file.write_text("custom command")

    # Re-run init
    runner.invoke(app, ["setup", str(tmp_path)])

    # User's file should still be there
    assert user_file.read_text() == "custom command"


# --- init command: output messages ---


def test_init_shows_copied_files_on_fresh_init(tmp_path: Path):
    result = runner.invoke(app, ["setup", str(tmp_path)])
    assert "+" in result.output
    assert "files synced" in result.output


def test_init_shows_updated_files_on_reinit(tmp_path: Path):
    runner.invoke(app, ["setup", str(tmp_path)])
    result = runner.invoke(app, ["setup", str(tmp_path)])
    assert "~" in result.output
    assert "files synced" in result.output


def test_init_shows_next_step(tmp_path: Path):
    result = runner.invoke(app, ["setup", str(tmp_path)])
    assert "/rea-init" in result.output


# --- init command: error handling ---


def test_init_fails_on_nonexistent_path(tmp_path: Path):
    bad_path = tmp_path / "does-not-exist"
    result = runner.invoke(app, ["setup", str(bad_path)])
    assert result.exit_code == 1
    assert "Error" in result.output


# --- template integrity ---


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


def test_expected_commands_exist():
    commands_dir = TEMPLATES_DIR / ".claude" / "commands"
    expected = {
        "rea-init.md",
        "rea-plan.md",
        "rea-commit.md",
        "rea-verify.md",
        "rea-brainstorm.md",
        "rea-execute.md",
        "rea-worktree.md",
        "rea-write-skill.md",
    }
    actual = {f.name for f in commands_dir.iterdir()}
    assert expected.issubset(actual), f"Missing: {expected - actual}"


def test_expected_agents_exist():
    agents_dir = TEMPLATES_DIR / ".claude" / "agents"
    expected = {
        "explorer.md",
        "implementer.md",
        "spec-reviewer.md",
        "code-reviewer.md",
        "debugger.md",
        "plan-reviewer.md",
        "dispatcher.md",
        "skill-writer.md",
    }
    actual = {f.name for f in agents_dir.iterdir()}
    assert expected.issubset(actual), f"Missing: {expected - actual}"

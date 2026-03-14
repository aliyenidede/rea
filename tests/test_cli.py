from pathlib import Path

from typer.testing import CliRunner

from rea.cli import app

runner = CliRunner()


def test_version():
    result = runner.invoke(app, ["version"])
    assert result.exit_code == 0
    assert "rea" in result.output


def test_init_creates_structure(tmp_path: Path):
    result = runner.invoke(app, ["init", str(tmp_path)])
    assert result.exit_code == 0
    assert (tmp_path / ".claude" / "commands").is_dir()
    assert (tmp_path / ".rea" / "log").is_dir()
    assert (tmp_path / ".rea" / "plans").is_dir()

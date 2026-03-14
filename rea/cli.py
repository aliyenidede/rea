import shutil
from pathlib import Path

import typer

app = typer.Typer(help="REA — personal development toolkit")

TEMPLATES_DIR = Path(__file__).parent / "templates"


@app.command("init")
def init(
    path: Path = typer.Argument(
        default=None,
        help="Project directory (defaults to current directory)",
    ),
):
    """Copy REA command templates into a project. Run /rea-init in Claude Code after this."""
    target = (path or Path.cwd()).resolve()

    if not target.is_dir():
        typer.echo(f"Error: {target} is not a directory", err=True)
        raise typer.Exit(1)

    commands_src = TEMPLATES_DIR / ".claude" / "commands"
    commands_dst = target / ".claude" / "commands"
    commands_dst.mkdir(parents=True, exist_ok=True)

    copied = []
    skipped = []

    for src_file in commands_src.iterdir():
        dst_file = commands_dst / src_file.name
        if dst_file.exists():
            shutil.copy2(src_file, dst_file)
            skipped.append(src_file.name)
        else:
            shutil.copy2(src_file, dst_file)
            copied.append(src_file.name)

    rea_dir = target / ".rea"
    (rea_dir / "log").mkdir(parents=True, exist_ok=True)
    (rea_dir / "plans").mkdir(parents=True, exist_ok=True)

    typer.echo(f"\nREA initialized in {target}/\n")

    if copied:
        typer.echo("Copied:")
        for f in copied:
            typer.echo(f"  [+] .claude/commands/{f}")

    if skipped:
        typer.echo("\nUpdated (already existed):")
        for f in skipped:
            typer.echo(f"  [~] .claude/commands/{f}")

    typer.echo("\nNext step: open Claude Code and run /rea-init")


@app.command("version")
def version():
    """Show REA version."""
    from rea import __version__

    typer.echo(f"rea {__version__}")

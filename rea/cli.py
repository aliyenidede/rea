import shutil
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from rich.text import Text

console = Console()


def _version_callback(value: bool):
    if value:
        from rea import __version__

        console.print(f"rea [bold cyan]{__version__}[/]")
        raise typer.Exit()


app = typer.Typer(add_completion=False)

TEMPLATES_DIR = Path(__file__).parent / "templates"


@app.callback(invoke_without_command=True)
def main(
    ctx: typer.Context,
    version: bool = typer.Option(
        False,
        "--version",
        "-v",
        help="Show version.",
        callback=_version_callback,
        is_eager=True,
    ),
):
    """REA - structured development workflow for Claude Code."""
    if ctx.invoked_subcommand is not None:
        return

    from rea import __version__

    # Header
    header = Text()
    header.append("rea", style="bold cyan")
    header.append(f" {__version__}\n\n", style="dim")
    header.append("Structured development workflow for Claude Code.\n", style="")
    header.append(
        "Plan, execute, review, commit — with agents doing the heavy lifting.",
        style="dim",
    )
    console.print(Panel(header, border_style="cyan", padding=(1, 2)))

    # Quick start
    console.print()
    console.print("  [bold]Quick start[/]")
    console.print()
    console.print("  [cyan]1.[/] rea setup .")
    console.print("  [cyan]2.[/] Open Claude Code in your project")
    console.print("  [cyan]3.[/] Type [bold green]/rea-init[/] to finish setup")
    console.print()

    # Commands table
    table = Table(show_header=False, box=None, padding=(0, 2), pad_edge=False)
    table.add_column(style="bold cyan", no_wrap=True)
    table.add_column(style="")
    table.add_row("rea setup .", "Install REA into your project")
    table.add_row("rea version", "Show installed version")
    table.add_row("rea --help", "Show all options")
    console.print("  [bold]Commands[/]")
    console.print()
    console.print(table)
    console.print()


@app.command("setup")
def init(
    path: Path = typer.Argument(
        default=None,
        help="Project directory (defaults to current directory)",
    ),
):
    """Install REA slash commands and agents into a project."""
    target = (path or Path.cwd()).resolve()

    if not target.is_dir():
        console.print(f"[red]Error:[/] {target} is not a directory")
        raise typer.Exit(1)

    copied = []
    skipped = []

    claude_dirs = ["commands", "agents"]
    for dirname in claude_dirs:
        src_dir = TEMPLATES_DIR / ".claude" / dirname
        if not src_dir.exists():
            continue
        dst_dir = target / ".claude" / dirname
        dst_dir.mkdir(parents=True, exist_ok=True)
        for src_file in src_dir.iterdir():
            dst_file = dst_dir / src_file.name
            if dst_file.exists():
                shutil.copy2(src_file, dst_file)
                skipped.append(f".claude/{dirname}/{src_file.name}")
            else:
                shutil.copy2(src_file, dst_file)
                copied.append(f".claude/{dirname}/{src_file.name}")

    # Copy root-level .claude/ files (e.g., skill-writer-patterns.md)
    claude_root = TEMPLATES_DIR / ".claude"
    if claude_root.exists():
        dst_claude = target / ".claude"
        dst_claude.mkdir(parents=True, exist_ok=True)
        for src_file in claude_root.iterdir():
            if src_file.is_file():
                dst_file = dst_claude / src_file.name
                if dst_file.exists():
                    shutil.copy2(src_file, dst_file)
                    skipped.append(f".claude/{src_file.name}")
                else:
                    shutil.copy2(src_file, dst_file)
                    copied.append(f".claude/{src_file.name}")

    rea_dir = target / ".rea"
    (rea_dir / "log").mkdir(parents=True, exist_ok=True)
    (rea_dir / "plans").mkdir(parents=True, exist_ok=True)

    total = len(copied) + len(skipped)

    # File list
    console.print()
    if copied:
        for f in copied:
            console.print(f"  [green]+[/] {f}")
    if skipped:
        for f in skipped:
            console.print(f"  [yellow]~[/] {f}")

    console.print()
    console.print(f"  [bold]{total}[/] files synced to [cyan]{target}[/]")
    console.print()

    # First install — show onboarding
    if copied:
        # Workflow table
        wf = Table(show_header=False, box=None, padding=(0, 2), pad_edge=False)
        wf.add_column(style="bold green", no_wrap=True, min_width=18)
        wf.add_column(style="")
        wf.add_row("/rea-plan", "Write a spec + todo, adversarial review, get approval")
        wf.add_row("/rea-execute", "Agents implement in parallel with code review")
        wf.add_row("/rea-commit", "Commit, push, open PR to the right branch")
        wf.add_row("", "")
        wf.add_row("/rea-brainstorm", "Explore ideas before committing to a plan")
        wf.add_row("/rea-verify", "Health check — CI, branches, config")
        wf.add_row("/rea-write-skill", "Create a new custom agent or command")
        wf.add_row("/rea-wrap", "End-of-session summary + save lessons")
        wf.add_row("/rea-update", "Update REA + sync templates")

        body = Text()
        body.append("REA gives Claude Code a structured workflow: planning with\n")
        body.append("adversarial review, parallel agents, automated code review,\n")
        body.append("and a safe branch strategy.\n\n")
        body.append("Next step\n", style="bold")
        body.append("1. Open Claude Code in this project\n")
        body.append("2. Type ")
        body.append("/rea-init", style="bold green")
        body.append(" to set up CI, branches, and CLAUDE.md")

        console.print(
            Panel(
                body,
                title="[bold]Getting started[/]",
                border_style="cyan",
                padding=(1, 2),
            )
        )
        console.print()
        console.print("  [bold]Slash commands[/] (use inside Claude Code)")
        console.print()
        console.print(wf)
        console.print()
    else:
        console.print("  [green]All templates up to date.[/]")
        console.print()


@app.command("version")
def version():
    """Show REA version."""
    from rea import __version__

    console.print(f"rea [bold cyan]{__version__}[/]")

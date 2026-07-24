from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel
from rich.text import Text

console = Console()

NPX_SETUP = "npx readev-tools setup <project>"
NPX_MIGRATE = "npx readev-tools migrate <project>"
OLD_VERSION_PIN = "pip install rea-dev==0.7.1"


def _version_callback(value: bool):
    if value:
        from rea import __version__

        console.print(f"rea [bold cyan]{__version__}[/]")
        raise typer.Exit()


app = typer.Typer(add_completion=False)


def _print_deprecation_notice():
    console.print(
        "[yellow]Deprecation notice:[/] rea-dev (this Python CLI) is frozen and no longer "
        "installs anything. The maintained path is [bold cyan]npx readev-tools setup[/]."
    )
    console.print()


def _print_signpost():
    """The whole product of this package: where to go instead."""
    body = Text()
    body.append("This Python CLI has been replaced by ")
    body.append("readev-tools", style="bold cyan")
    body.append(
        ",\nan npx installer that works with any AI coding tool\nthat reads AGENTS.md - not only Claude Code.\n\n"
    )
    body.append("Install\n", style="bold")
    body.append(f"  {NPX_SETUP}\n\n", style="cyan")
    body.append("Coming from rea-dev 0.7.x\n", style="bold")
    body.append(f"  {NPX_MIGRATE}\n", style="cyan")
    body.append("  archives the old layout, never deletes\n\n", style="dim")
    body.append("Needs Node.js 20 or later.\n", style="dim")
    body.append("To keep the old 0.7.x behaviour instead:\n", style="dim")
    body.append(f"  {OLD_VERSION_PIN}", style="dim")

    console.print(
        Panel(
            body,
            title="[bold]rea-dev -> readev-tools[/]",
            border_style="cyan",
            padding=(1, 2),
        )
    )
    console.print()
    console.print("  Source: [cyan]https://github.com/aliyenidede/rea[/]")
    console.print()


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
    """REA - frozen. Use `npx readev-tools setup` instead."""
    if ctx.invoked_subcommand is not None:
        return

    _print_deprecation_notice()
    _print_signpost()


@app.command("setup")
def setup(
    path: Path = typer.Argument(
        default=None,
        help="Ignored - this CLI no longer writes to a project.",
    ),
):
    """Print where the maintained installer lives. Installs nothing."""
    # Exits non-zero on purpose: a script that still calls `rea setup` in a
    # pipeline must fail loudly rather than appear to have installed
    # something. The old copy behaviour stays available at 0.7.1, which the
    # redesign's rollback plan pins as the frozen fallback.
    _print_deprecation_notice()
    _print_signpost()
    raise typer.Exit(1)


@app.command("version")
def version():
    """Show REA version."""
    from rea import __version__

    console.print(f"rea [bold cyan]{__version__}[/]")

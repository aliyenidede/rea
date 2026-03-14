#!/bin/bash
ruff format . 2>/dev/null || true
ruff check . --fix 2>/dev/null || true

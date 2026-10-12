# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A Python data analysis project exploring historical FIFA World Cup data. The main script (`analise_copa.py`) reads three CSV datasets, computes statistics, and generates a 4-panel visualization saved as `analise_copa.png`.

## Environment Setup

This project uses [Poetry](https://python-poetry.org/) with Python 3.12+.

```bash
# Install dependencies
poetry install

# Activate the virtual environment
poetry shell
# or run commands directly:
poetry run python analise_copa.py
```

The virtual environment is stored in `.venv/` at the project root.

## Running the Analysis

```bash
poetry run python analise_copa.py
```

This reads from `data/` (CSV files must be present), prints statistics to stdout, and saves `analise_copa.png`.

## Dependencies

- `pandas` — data loading and manipulation
- `matplotlib` + `seaborn` — visualization
- `kagglehub` — available for downloading datasets from Kaggle

## Data

Three CSV files under `data/`:
- `WorldCups.csv` — one row per tournament (year, host country, winner, attendance, goals, teams)
- `WorldCupMatches.csv` — one row per match (teams, scores, stage, city)
- `WorldCupPlayers.csv` — one row per player appearance, with an `Event` column encoding goals (`G`), own goals (`OG`), cards, etc.

Goals scored by each player are derived from `Event` as `count("G") - count("OG")`.

## Key Files

| File | Purpose |
|------|---------|
| `analise_copa.py` | Main analysis script |
| `main.py` | Entry point (currently empty — intended for future use) |
| `pyproject.toml` | Poetry project and dependency config |
| `data/*.csv` | Raw World Cup datasets |

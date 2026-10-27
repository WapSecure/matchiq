"""Runs the worker's Zod contracts (built `libs/contracts/dist`) against JSON produced here."""

import json
import os
import shutil
import subprocess
from pathlib import Path
from typing import Any

import pytest

SCRIPT = Path(__file__).with_name("zod_check.mjs")
DIST = Path(__file__).parents[4] / "libs" / "contracts" / "dist" / "index.js"


def zod_issues(contract: str, items: list[Any]) -> list[list[str]]:
    """One list of Zod issues per item; empty means the worker would accept it.

    CI builds the contracts before this project's tests (codegen depends on the build), so a
    missing build is a failure there and only a skip on a bare local checkout.
    """
    node = shutil.which("node")
    if node is None or not DIST.exists():
        message = "node or libs/contracts/dist is missing; run `pnpm nx build contracts`"
        if os.environ.get("CI"):
            pytest.fail(message)
        pytest.skip(message)
    done = subprocess.run(  # noqa: S603
        [node, str(SCRIPT)],
        input=json.dumps({"contract": contract, "items": items}),
        capture_output=True,
        text=True,
        check=True,
        timeout=60,
    )
    issues: list[list[str]] = json.loads(done.stdout)
    return issues

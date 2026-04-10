from __future__ import annotations

import os
import shutil
import subprocess
import sys
from pathlib import Path

from test_smoke import ensure_python_venv, env_bool, select_base_python


def log(message: str) -> None:
    print(f"[test_full] {message}")


def run_checked(command: list[str], cwd: Path, env: dict[str, str] | None = None) -> None:
    subprocess.run(command, cwd=cwd, env=env, check=True)


def resolve_command(name: str) -> str:
    candidates = [name]
    if os.name == "nt":
        candidates.insert(0, f"{name}.cmd")
    for candidate in candidates:
        path = shutil.which(candidate)
        if path:
            return path
    raise FileNotFoundError(f"Unable to locate {name} on PATH")


def ensure_frontend_deps(frontend_dir: Path, install_deps: bool, npm_cmd: str) -> None:
    if install_deps or not (frontend_dir / "node_modules").exists():
        log("Installing frontend dependencies")
        run_checked([npm_cmd, "install"], frontend_dir)
    else:
        log("Frontend dependencies already installed")


def main() -> int:
    script_dir = Path(__file__).resolve().parent
    root_dir = script_dir.parent
    backend_dir = root_dir / "backend"
    frontend_dir = root_dir / "frontend"

    base_python = select_base_python(os.getenv("PYTHON_BIN"))
    log("Using base Python command: " + " ".join(base_python))
    install_deps = env_bool("INSTALL_DEPS", True)
    mode = os.getenv("MODE", "mock")
    backend_host = os.getenv("BACKEND_HOST", "127.0.0.1")
    backend_port = os.getenv("BACKEND_PORT", "")
    frontend_coverage_dir = Path(
        os.getenv("FRONTEND_COVERAGE_DIR", str(root_dir / "tmp" / "frontend-coverage"))
    )
    smoke_tmp_root = Path(os.getenv("SMOKE_TMP_ROOT", str(root_dir / "tmp" / "test_full" / "smoke")))
    npm_cmd = resolve_command("npm")
    npx_cmd = resolve_command("npx")

    backend_venv = Path(os.getenv("BACKEND_VENV", str(backend_dir / ".venv")))
    backend_test_venv = Path(os.getenv("BACKEND_TEST_VENV", str(backend_dir / ".venv-test")))

    _backend_python = ensure_python_venv(
        backend_venv,
        backend_dir / "requirements.txt",
        base_python,
        "always" if install_deps else "auto",
    )
    backend_test_python = ensure_python_venv(
        backend_test_venv,
        backend_dir / "requirements.txt",
        base_python,
        "always" if install_deps else "auto",
    )

    ensure_frontend_deps(frontend_dir, install_deps, npm_cmd)

    log("Running backend unit tests")
    run_checked([str(backend_test_python), "-m", "unittest", "discover", "-s", "tests"], backend_dir)

    log("Running frontend lint")
    run_checked([npm_cmd, "run", "lint"], frontend_dir)

    log("Running frontend tests with coverage")
    if frontend_coverage_dir.exists():
        if frontend_coverage_dir.is_dir():
            shutil.rmtree(frontend_coverage_dir)
        else:
            frontend_coverage_dir.unlink()
    run_checked(
        [
            npx_cmd,
            "vitest",
            "run",
            "--coverage",
            "--coverage.reportsDirectory",
            str(frontend_coverage_dir),
        ],
        frontend_dir,
    )

    log("Running frontend production build")
    run_checked([npm_cmd, "run", "build"], frontend_dir)

    log("Running backend smoke test")
    smoke_env = os.environ.copy()
    smoke_env["MODE"] = mode
    smoke_env["BACKEND_HOST"] = backend_host
    if backend_port:
        smoke_env["BACKEND_PORT"] = backend_port
    smoke_env["TMP_ROOT"] = str(smoke_tmp_root)
    smoke_env["INSTALL_BACKEND_DEPS"] = "never"
    smoke_env["BACKEND_VENV"] = str(backend_venv)
    smoke_env.setdefault("PYTHON_BIN", sys.executable)
    run_checked([sys.executable, str(script_dir / "test_smoke.py")], root_dir, smoke_env)

    print("mode=" + mode)
    print("frontend_coverage_dir=" + str(frontend_coverage_dir))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.CalledProcessError as exc:
        print(f"[test_full] ERROR: {exc}", file=sys.stderr)
        raise SystemExit(1)

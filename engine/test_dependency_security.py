from pathlib import Path


def _minimum_version(requirements: str, package: str) -> tuple[int, ...]:
    dependency = next(
        (line.strip() for line in requirements.splitlines()
         if line.strip().lower().startswith(package.lower())),
        None,
    )
    assert dependency is not None, f"{package} must remain an explicit dependency"
    assert ">=" in dependency, f"{package} must declare a patched minimum version"
    minimum = dependency.split(">=", 1)[1].split(",", 1)[0].strip()
    return tuple(int(part) for part in minimum.split("."))


def test_python_multipart_minimum_version_covers_known_2026_advisories():
    requirements = Path(__file__).with_name("requirements.txt").read_text(encoding="utf-8")
    assert _minimum_version(requirements, "python-multipart") >= (0, 0, 31), (
        "Known 2026 python-multipart advisories require >=0.0.31: "
        "CVE-2026-42561, CVE-2026-53537, CVE-2026-53538, "
        "CVE-2026-53539, and CVE-2026-53540"
    )


def test_starlette_minimum_version_covers_current_form_and_host_advisories():
    requirements = Path(__file__).with_name("requirements.txt").read_text(encoding="utf-8")
    assert _minimum_version(requirements, "starlette") >= (1, 3, 1), (
        "Starlette must be >=1.3.1 for CVE-2026-54283; this also exceeds "
        "the CVE-2026-48710 fix in 1.0.1"
    )

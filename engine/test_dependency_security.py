from pathlib import Path


def test_python_multipart_minimum_version_includes_cve_2026_42561_fix():
    requirements = Path(__file__).with_name("requirements.txt").read_text(encoding="utf-8")
    dependency = next(
        (line.strip() for line in requirements.splitlines()
         if line.strip().lower().startswith("python-multipart")),
        None,
    )

    assert dependency is not None, "python-multipart must remain an explicit dependency"
    assert ">=" in dependency, "the patched minimum version must be explicit"

    minimum = dependency.split(">=", 1)[1].split(",", 1)[0].strip()
    version = tuple(int(part) for part in minimum.split("."))
    assert version >= (0, 0, 27), (
        "CVE-2026-42561 affects python-multipart versions below 0.0.27"
    )

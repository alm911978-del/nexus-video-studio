from pathlib import Path


def test_python_multipart_minimum_version_covers_known_2026_advisories():
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
    assert version >= (0, 0, 31), (
        "Known 2026 python-multipart advisories require >=0.0.31: "
        "CVE-2026-42561, CVE-2026-53537, CVE-2026-53538, "
        "CVE-2026-53539, and CVE-2026-53540"
    )

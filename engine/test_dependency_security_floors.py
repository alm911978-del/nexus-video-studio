from pathlib import Path
import re


REQUIREMENTS = Path(__file__).with_name("requirements.txt")


def _minimum_version(package: str) -> tuple[int, ...]:
    for raw_line in REQUIREMENTS.read_text(encoding="utf-8").splitlines():
        line = raw_line.split("#", 1)[0].strip()
        if not line or not line.lower().startswith(package.lower()):
            continue
        match = re.search(r">=\s*(\d+(?:\.\d+)*)", line)
        assert match is not None, f"{package} must declare an explicit minimum version"
        return tuple(int(part) for part in match.group(1).split("."))
    raise AssertionError(f"{package} must remain an explicit dependency")


def test_fastapi_and_starlette_minimums_are_security_compatible():
    # FastAPI 0.162.4 declares Starlette >=0.46.0; 1.3.1 includes the
    # request.form() resource-limit fix tracked as CVE-2026-54283.
    assert _minimum_version("fastapi") >= (0, 162, 4)
    assert _minimum_version("starlette") >= (1, 3, 1)


def test_python_multipart_minimum_covers_2026_advisories():
    # 0.0.31 fixes the negative Content-Length parse_form() issue and is
    # newer than the 0.0.27 and 0.0.30 floors for earlier advisories.
    assert _minimum_version("python-multipart") >= (0, 0, 31)

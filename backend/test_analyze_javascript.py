
from pathlib import Path
from tempfile import TemporaryDirectory

from app.services.repository_service import analyze_javascript_files


with TemporaryDirectory() as temp_dir:
    root = Path(temp_dir)

    (root / "app.js").write_text(
        """
        function greet(name) {
            return name;
        }

        const formatName = (name) => name.trim();

        class UserService {
            getUser(id) {
                return id;
            }
        }
        """,
        encoding="utf-8",
    )

    (root / "helper.ts").write_text(
        """
        function add(a: number, b: number): number {
            return a + b;
        }
        """,
        encoding="utf-8",
    )

    result = analyze_javascript_files(str(root))

    print(result)

    assert result["total_files_analyzed"] == 2
    assert result["total_functions"] == 4
    assert result["total_classes"] == 1
    assert result["total_files_failed"] == 0

    print("All analyzer tests passed!")

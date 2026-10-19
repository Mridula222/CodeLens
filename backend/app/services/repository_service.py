
import ast
from pathlib import Path
from git import Repo
from git.exc import InvalidGitRepositoryError

from app.services.javascript_service import (
    parse_javascript_file,
    resolve_local_import,
)

# Absolute path to backend/repositories/
REPOSITORIES_DIR = (
    Path(__file__).resolve().parents[2] / "repositories"
)


def clone_repository(repo_url: str) -> dict:
    """Clone a public GitHub repository or reuse an existing clone."""

    REPOSITORIES_DIR.mkdir(parents=True, exist_ok=True)

    repo_url = repo_url.strip().rstrip("/")

    repo_name = repo_url.split("/")[-1]
    if repo_name.endswith(".git"):
        repo_name = repo_name[:-4]

    destination = REPOSITORIES_DIR / repo_name

    def normalize_url(url: str) -> str:
        return url.strip().rstrip("/").removesuffix(".git").lower()

    # Reuse the existing clone if it belongs to this same repository.
    if destination.exists():
        try:
            existing_repo = Repo(destination)
            origin_url = existing_repo.remotes.origin.url

            if normalize_url(origin_url) == normalize_url(repo_url):
                return {
                    "message": "Existing repository reused successfully",
                    "repository": repo_name,
                    "local_path": str(destination),
                    "reused": True,
                }

        except (InvalidGitRepositoryError, AttributeError, IndexError):
            pass

        raise ValueError(
            f"Repository folder '{repo_name}' already exists "
            "and does not match the requested repository. "
            "Please remove that folder or resolve the name conflict."
        )

    Repo.clone_from(
        repo_url,
        str(destination),
        depth=1,
    )

    return {
        "message": "Repository cloned successfully",
        "repository": repo_name,
        "local_path": str(destination),
        "reused": False,
    }


# Directories that should not be scanned.
IGNORED_DIRS = {
    ".git",
    "node_modules",
    "venv",
    ".venv",
    "__pycache__",
    "dist",
    "build",
}


LANGUAGE_MAP = {
    ".py": "Python",
    ".js": "JavaScript",
    ".jsx": "JavaScript (React JSX)",
    ".ts": "TypeScript",
    ".tsx": "TypeScript (React TSX)",
    ".java": "Java",
    ".c": "C",
    ".h": "C/C++ Header",
    ".cpp": "C++",
    ".hpp": "C++ Header",
    ".cs": "C#",
    ".go": "Go",
    ".rs": "Rust",
    ".php": "PHP",
    ".rb": "Ruby",
    ".html": "HTML",
    ".css": "CSS",
    ".scss": "SCSS",
    ".sql": "SQL",
    ".json": "JSON",
    ".xml": "XML",
    ".yaml": "YAML",
    ".yml": "YAML",
    ".md": "Markdown",
    ".sh": "Shell",
}


def scan_repository(repository_path: str) -> dict:
    """
    Scan a cloned repository and identify file types.
    """

    root = Path(repository_path).resolve()

    if not root.is_dir():
        raise ValueError("Repository directory does not exist")

    files = []
    file_details = []
    directories = set()

    for path in root.rglob("*"):
        relative_path = path.relative_to(root)
        parts = relative_path.parts

        if any(part in IGNORED_DIRS for part in parts):
            continue

        if path.is_dir():
            directories.add(relative_path.as_posix())

        elif path.is_file():
            relative_name = relative_path.as_posix()
            extension = path.suffix.lower()

            language = LANGUAGE_MAP.get(
                extension,
                "Unknown"
            )

            files.append(relative_name)

            file_details.append({
                "path": relative_name,
                "extension": extension,
                "language": language,
            })

    files.sort()
    file_details.sort(key=lambda item: item["path"])

    return {
        "total_files": len(files),
        "total_directories": len(directories),
        "files": files,
        "file_details": file_details,
    }


def read_python_files(
    repository_path: str,
    max_files: int = 100,
    max_file_bytes: int = 200_000,
) -> list[dict]:
    """
    Find and read a limited number of Python source files.
    """

    root = Path(repository_path).resolve()

    if not root.is_dir():
        raise ValueError("Repository directory does not exist")

    python_files = []

    for path in root.rglob("*"):
        relative_path = path.relative_to(root)
        parts = relative_path.parts

        # Ignore dependency, metadata, and build directories.
        if any(part in IGNORED_DIRS for part in parts):
            continue

        if not path.is_file() or path.suffix.lower() != ".py":
            continue

        # Avoid reading unusually large files.
        if path.stat().st_size > max_file_bytes:
            continue

        try:
            content = path.read_text(
                encoding="utf-8",
                errors="replace",
            )
        except OSError:
            # Skip files that cannot be read.
            continue

        python_files.append({
            "path": relative_path.as_posix(),
            "content": content,
            "line_count": len(content.splitlines()),
        })

        if len(python_files) >= max_files:
            break

    return python_files


def parse_python_file(content: str) -> dict:
    """
    Extract functions, classes, and imports from Python source code.
    Does not execute the source code.
    """

    try:
        tree = ast.parse(content)
    except SyntaxError as exc:
        return {
            "success": False,
            "error": str(exc),
            "functions": [],
            "classes": [],
            "imports": [],
        }

    functions = []
    classes = []
    imports = []

    for node in ast.walk(tree):

        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            functions.append({
                "name": node.name,
                "line": node.lineno,
                "parameters": [
                    arg.arg for arg in node.args.args
                ],
                "is_async": isinstance(
                    node, ast.AsyncFunctionDef
                ),
            })

        elif isinstance(node, ast.ClassDef):
            classes.append({
                "name": node.name,
                "line": node.lineno,
                "bases": [
                    base.id
                    for base in node.bases
                    if isinstance(base, ast.Name)
                ],
            })

        elif isinstance(node, ast.Import):
            for alias in node.names:
                imports.append({
                    "module": alias.name,
                    "line": node.lineno,
                })

        elif isinstance(node, ast.ImportFrom):
            imports.append({
                "module": node.module or "",
                "line": node.lineno,
            })

    return {
        "success": True,
        "functions": functions,
        "classes": classes,
        "imports": imports,
    }



def analyze_python_files(repository_path: str) -> dict:
    """
    Read Python files and extract code structures and dependencies.
    """

    source_files = read_python_files(repository_path)

    analyzed_files = []
    failed_files = []

    for source_file in source_files:
        content = source_file["content"]

        # Extract functions, classes, and imports.
        parsed = parse_python_file(content)

        if not parsed["success"]:
            failed_files.append({
                "path": source_file["path"],
                "error": parsed["error"],
            })
            continue

        # Extract function-call relationships.
        dependency_result = build_dependency_edges(content)

        analyzed_files.append({
            "path": source_file["path"],
            "line_count": source_file["line_count"],
            "functions": parsed["functions"],
            "classes": parsed["classes"],
            "imports": parsed["imports"],
            "dependency_edges": dependency_result["edges"],
            "unresolved_calls": dependency_result["unresolved_calls"],
        })

    return {
        "total_python_files_read": len(source_files),
        "total_files_analyzed": len(analyzed_files),
        "total_files_failed": len(failed_files),
        "files": analyzed_files,
        "failed_files": failed_files,
    }



def extract_function_calls(content: str) -> dict:
    """
    Extract function calls and identify their caller functions.
    Does not execute the source code.
    """

    try:
        tree = ast.parse(content)
    except SyntaxError as exc:
        return {
            "success": False,
            "error": str(exc),
            "calls": [],
        }

    calls = []

    class CallVisitor(ast.NodeVisitor):
        def __init__(self):
            self.function_stack = []

        def visit_FunctionDef(self, node):
            self.function_stack.append(node.name)
            self.generic_visit(node)
            self.function_stack.pop()

        def visit_AsyncFunctionDef(self, node):
            self.function_stack.append(node.name)
            self.generic_visit(node)
            self.function_stack.pop()

        def visit_Call(self, node):
            called_function = node.func

            if isinstance(called_function, ast.Name):
                name = called_function.id

            elif isinstance(called_function, ast.Attribute):
                name = called_function.attr

            else:
                name = "<dynamic call>"

            calls.append({
                "caller": (
                    self.function_stack[-1]
                    if self.function_stack
                    else "<module>"
                ),
                "callee": name,
                "line": node.lineno,
            })

            self.generic_visit(node)

    visitor = CallVisitor()
    visitor.visit(tree)

    return {
        "success": True,
        "calls": calls,
    }


def build_dependency_edges(content: str) -> dict:
    """
    Build function dependency edges within one Python file.
    A -> B means function A calls function B.
    """

    try:
        tree = ast.parse(content)
    except SyntaxError as exc:
        return {
            "success": False,
            "error": str(exc),
            "edges": [],
            "unresolved_calls": [],
        }

    # Collect function definitions in this file.
    defined_functions = set()

    for node in ast.walk(tree):
        if isinstance(
            node,
            (ast.FunctionDef, ast.AsyncFunctionDef),
        ):
            defined_functions.add(node.name)

    calls_result = extract_function_calls(content)

    if not calls_result["success"]:
        return {
            "success": False,
            "error": calls_result["error"],
            "edges": [],
            "unresolved_calls": [],
        }

    edges = []
    unresolved_calls = []

    for call in calls_result["calls"]:
        caller = call["caller"]
        callee = call["callee"]

        # Calls outside a function are not function dependencies.
        if caller == "<module>":
            continue

        if callee in defined_functions:
            edges.append({
                "source": caller,
                "target": callee,
                "line": call["line"],
                "relationship": "calls",
            })
        else:
            unresolved_calls.append({
                "caller": caller,
                "callee": callee,
                "line": call["line"],
            })

    return {
        "success": True,
        "defined_functions": sorted(defined_functions),
        "edges": edges,
        "unresolved_calls": unresolved_calls,
    }


from app.services.javascript_service import parse_javascript_file


def analyze_javascript_files(repository_path: str) -> dict:
    """Analyze JavaScript and TypeScript files in a repository."""

    root = Path(repository_path).resolve()

    if not root.is_dir():
        raise ValueError("Repository directory does not exist")

    supported_extensions = {".js", ".jsx", ".ts", ".tsx"}

    analyzed_files = []
    failed_files = []
    max_file_bytes = 200_000
    max_files = 100

    for path in root.rglob("*"):
        relative_path = path.relative_to(root)
        parts = relative_path.parts

        if any(part in IGNORED_DIRS for part in parts):
            continue

        if not path.is_file():
            continue

        extension = path.suffix.lower()

        if extension not in supported_extensions:
            continue

        if path.stat().st_size > max_file_bytes:
            continue

        try:
            content = path.read_text(
                encoding="utf-8",
                errors="replace",
            )

            parsed = parse_javascript_file(content, extension)

            analyzed_files.append({
                "path": relative_path.as_posix(),
                "functions": parsed["functions"],
                "classes": parsed["classes"],
                "function_count": parsed["function_count"],
                "class_count": parsed["class_count"],
                "has_syntax_errors": parsed["has_syntax_errors"],

                # New: retain imports extracted by the parser
                "imports": parsed["imports"],
                "import_count": parsed["import_count"],
            })

        except (OSError, ValueError) as exc:
            failed_files.append({
                "path": relative_path.as_posix(),
                "error": str(exc),
            })

        if len(analyzed_files) + len(failed_files) >= max_files:
            break

    return {
        "total_files_analyzed": len(analyzed_files),
        "total_files_failed": len(failed_files),
        "total_functions": sum(
            item["function_count"] for item in analyzed_files
        ),
        "total_classes": sum(
            item["class_count"] for item in analyzed_files
        ),
        "files": analyzed_files,
        "failed_files": failed_files,
    }


from pathlib import Path


def read_repository_file(repository_path: str, file_path: str) -> dict:
    """Read a source file safely from a cloned repository."""

    root = Path(repository_path).resolve()
    target = (root / file_path).resolve()

    # Prevent paths from escaping the repository directory.
    if not target.is_relative_to(root):
        raise ValueError("Invalid file path.")

    if not target.is_file():
        raise ValueError("File not found.")

    # Avoid reading very large files.
    if target.stat().st_size > 500_000:
        raise ValueError("File is too large to display (limit: 500 KB).")

    try:
        content = target.read_text(encoding="utf-8")
    except UnicodeDecodeError as exc:
        raise ValueError("This file is not a supported text file.") from exc

    return {
        "path": file_path,
        "content": content,
        "size": len(content),
    }



def build_javascript_dependency_edges(
    repository_path: str,
    analyzed_files: list[dict],
) -> dict:
    """Build local file-to-file dependencies from JavaScript/TypeScript imports."""

    edges = []
    external_imports = []
    unresolved_imports = []

    for file_info in analyzed_files:
        source_file = file_info["path"]

        for import_source in file_info.get("imports", []):
            # Ignore external packages such as "express".
            if not import_source.startswith("."):
                external_imports.append({
                    "file": source_file,
                    "package": import_source,
                })
                continue

            target_file = resolve_local_import(
                repository_path,
                source_file,
                import_source,
            )

            if target_file:
                edges.append({
                    "source": source_file,
                    "target": target_file,
                    "import": import_source,
                })
            else:
                unresolved_imports.append({
                    "file": source_file,
                    "import": import_source,
                })

    return {
        "total_edges": len(edges),
        "edges": edges,
        "total_external_imports": len(external_imports),
        "external_imports": external_imports,
        "total_unresolved_imports": len(unresolved_imports),
        "unresolved_imports": unresolved_imports,
    }

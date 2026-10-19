
from pathlib import Path
import os
import re

SUPPORTED_EXTENSIONS = {
    ".py", ".js", ".jsx", ".ts", ".tsx",
    ".java", ".c", ".cpp", ".h", ".hpp",
    ".go", ".rs", ".php", ".rb",
}

IGNORED_DIRECTORIES = {
    ".git", "node_modules", "venv", ".venv",
    "__pycache__", "dist", "build", ".next",
}

MAX_FILES_TO_SEARCH = 300
MAX_FILE_SIZE = 200_000
MAX_MATCHED_FILES = 8
MAX_CHARS_PER_FILE = 5_000
MAX_TOTAL_CONTEXT_CHARS = 20_000

SYNONYMS = {
    "authentication": {
        "auth", "login", "logout", "password", "token",
        "jwt", "user", "credential", "verify", "middleware",
        "bcrypt", "session", "protect",
    },
    "authorization": {
        "permission", "role", "access", "protect", "middleware",
    },
    "login": {"authentication", "auth", "password", "jwt", "user"},
    "jwt": {"token", "authentication", "auth", "verify"},
    "password": {"bcrypt", "hash", "compare", "login", "user"},
    "database": {"db", "mongo", "mongoose", "model", "schema"},
    "api": {"route", "endpoint", "request", "response", "controller"},
}


def tokenize(text: str) -> set[str]:
    # Split camelCase and PascalCase names such as authMiddleware.
    text = re.sub(r"([a-z0-9])([A-Z])", r"\1 \2", text)
    return {
        word.lower()
        for word in re.findall(r"[A-Za-z][A-Za-z0-9_]*", text)
        if len(word) > 1
    }


def expand_words(words: set[str]) -> set[str]:
    expanded = set(words)

    for word in words:
        expanded.update(SYNONYMS.get(word, set()))

    return expanded


def retrieve_repository_context(repository_path: str, question: str) -> dict:
    root = Path(repository_path).resolve()

    if not root.exists() or not root.is_dir():
        raise ValueError("The analyzed repository directory was not found.")

    question_words = expand_words(tokenize(question))

    if not question_words:
        return {
            "files_searched": 0,
            "sources": [],
            "context": "",
        }

    candidates = []
    files_searched = 0

    for current_dir, directories, filenames in os.walk(root):
        directories[:] = sorted(
            directory
            for directory in directories
            if directory not in IGNORED_DIRECTORIES
        )

        for filename in sorted(filenames):
            path = Path(current_dir) / filename

            if path.suffix.lower() not in SUPPORTED_EXTENSIONS:
                continue

            try:
                if path.stat().st_size > MAX_FILE_SIZE:
                    continue
                content = path.read_text(
                    encoding="utf-8",
                    errors="replace",
                )
            except OSError:
                continue

            files_searched += 1

            relative_path = path.relative_to(root).as_posix()
            filename_words = expand_words(tokenize(relative_path))
            content_words = expand_words(tokenize(content))

            filename_score = len(question_words & filename_words) * 5
            content_score = len(question_words & content_words)
            score = filename_score + content_score

            # Keep the best files even if there is no exact keyword match.
            if score > 0:
                candidates.append({
                    "path": relative_path,
                    "content": content[:MAX_CHARS_PER_FILE],
                    "score": score,
                })

            if files_searched >= MAX_FILES_TO_SEARCH:
                break

        if files_searched >= MAX_FILES_TO_SEARCH:
            break

    candidates.sort(
        key=lambda item: (-item["score"], item["path"])
    )

    selected = candidates[:MAX_MATCHED_FILES]
    sources = []
    context_parts = []
    total_chars = 0

    for item in selected:
        remaining = MAX_TOTAL_CONTEXT_CHARS - total_chars

        if remaining <= 0:
            break

        snippet = item["content"][:remaining]

        sources.append({
            "path": item["path"],
            "score": item["score"],
        })

        context_parts.append(
            f"File: {item['path']}\n"
            f"```text\n{snippet}\n```"
        )

        total_chars += len(snippet)

    return {
        "files_searched": files_searched,
        "sources": sources,
        "context": "\n\n".join(context_parts),
    }


from tree_sitter_language_pack import get_parser


LANGUAGE_MAP = {
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "typescript",
    ".tsx": "tsx",
}


def parse_javascript_file(content: str, extension: str) -> dict:
    """Extract functions, classes, and imports from JS/TS source code."""

    language = LANGUAGE_MAP.get(extension.lower())

    if language is None:
        raise ValueError(f"Unsupported file extension: {extension}")

    parser = get_parser(language)
    tree = parser.parse(content.encode("utf-8"))

    functions = []
    classes = []
    imports = []

    def visit(node):
        # Existing function detection.
        if node.type == "variable_declarator":
            name_node = node.child_by_field_name("name")
            value_node = node.child_by_field_name("value")

            if (
                name_node
                and value_node
                and value_node.type in {
                    "arrow_function",
                    "function_expression",
                }
            ):
                functions.append(name_node.text.decode("utf-8"))

        elif node.type in {
            "function_declaration",
            "generator_function_declaration",
            "method_definition",
        }:
            name_node = node.child_by_field_name("name")

            if name_node:
                functions.append(name_node.text.decode("utf-8"))

        # Existing class detection.
        elif node.type in {"class_declaration", "class"}:
            name_node = node.child_by_field_name("name")

            if name_node:
                classes.append(name_node.text.decode("utf-8"))

        # New: detect ES module imports.
        elif node.type == "import_statement":
            source_node = node.child_by_field_name("source")

            if source_node:
                source = source_node.text.decode("utf-8")

                # Remove the surrounding quotes.
                source = source[1:-1] if len(source) >= 2 else source

                imports.append(source)

        # New: detect re-exports such as:
        # export { default } from "./Booking.js"
        elif node.type == "export_statement":
            source_node = node.child_by_field_name("source")

            if source_node:
                source = source_node.text.decode("utf-8")
                source = source[1:-1] if len(source) >= 2 else source

                imports.append(source)
            
        # Detect CommonJS imports: require("express")
        if node.type == "call_expression":
            function_node = node.child_by_field_name("function")
            arguments_node = node.child_by_field_name("arguments")

            if (
                function_node
                and function_node.type == "identifier"
                and function_node.text.decode("utf-8") == "require"
                and arguments_node
                and arguments_node.named_child_count > 0
            ):
                argument = arguments_node.named_child(0)

                if argument.type == "string":
                    import_source = (
                        argument.text.decode("utf-8")[1:-1]
                    )
                    imports.append(import_source)


        for child in node.children:
            visit(child)

    visit(tree.root_node)

    return {
        "functions": functions,
        "classes": classes,
        "imports": sorted(set(imports)),
        "function_count": len(functions),
        "class_count": len(classes),
        "import_count": len(set(imports)),
        "has_syntax_errors": tree.root_node.has_error,
    }


from pathlib import Path


SOURCE_EXTENSIONS = (".js", ".jsx", ".ts", ".tsx")


def resolve_local_import(
    repository_path: str,
    importing_file: str,
    import_source: str,
) -> str | None:
    """Resolve a relative JS/TS import to a repository-relative file path."""

    # Packages like "express" are not relative file imports.
    if not import_source.startswith("."):
        return None

    root = Path(repository_path).resolve()
    source_file = (root / importing_file).resolve()

    # The importing file must belong to this repository.
    if not source_file.is_relative_to(root):
        return None

    target = (source_file.parent / import_source).resolve()

    # Prevent imports from escaping the repository.
    if not target.is_relative_to(root):
        return None

    candidates = [target]

    # Try extensions when the import doesn't specify one.
    if not target.suffix:
        candidates.extend(
            Path(str(target) + extension)
            for extension in SOURCE_EXTENSIONS
        )

    # Support directory imports such as "./services".
    if target.is_dir():
        candidates.extend(
            target / f"index{extension}"
            for extension in SOURCE_EXTENSIONS
        )

    for candidate in candidates:
        if candidate.is_file() and candidate.suffix.lower() in SOURCE_EXTENSIONS:
            return candidate.relative_to(root).as_posix()

    return None

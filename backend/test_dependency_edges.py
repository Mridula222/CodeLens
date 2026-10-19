
from pathlib import Path
from tempfile import TemporaryDirectory

from app.services.javascript_service import (
    parse_javascript_file,
    resolve_local_import,
)
from app.services.repository_service import (
    build_javascript_dependency_edges,
)


with TemporaryDirectory() as temp:
    root = Path(temp)

    (root / "controllers").mkdir()
    (root / "models").mkdir()

    controller_code = (
        'import Booking from "../models/Booking.js";\n'
        'import express from "express";\n'
    )

    model_code = "export default class Booking {}"

    controller_path = root / "controllers" / "bookingController.js"
    model_path = root / "models" / "Booking.js"

    controller_path.write_text(controller_code, encoding="utf-8")
    model_path.write_text(model_code, encoding="utf-8")

    parsed = parse_javascript_file(controller_code, ".js")

    analyzed_files = [
        {
            "path": "controllers/bookingController.js",
            "imports": parsed["imports"],
        }
    ]

    result = build_javascript_dependency_edges(
        str(root),
        analyzed_files,
    )

    print("Dependency edges:", result["edges"])
    print("External imports:", result["external_imports"])
    print("Unresolved imports:", result["unresolved_imports"])


from pathlib import Path
from tempfile import TemporaryDirectory

from app.services.javascript_service import resolve_local_import


with TemporaryDirectory() as temp:
    root = Path(temp)

    (root / "controllers").mkdir()
    (root / "models").mkdir()

    (root / "controllers" / "bookingController.js").write_text(
        'import Booking from "../models/Booking.js";',
        encoding="utf-8",
    )
    (root / "models" / "Booking.js").write_text(
        "export default class Booking {}",
        encoding="utf-8",
    )

    result = resolve_local_import(
        str(root),
        "controllers/bookingController.js",
        "../models/Booking.js",
    )

    print("Resolved file:", result)

    external = resolve_local_import(
        str(root),
        "controllers/bookingController.js",
        "express",
    )

    print("External package:", external)

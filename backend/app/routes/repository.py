
from fastapi import APIRouter, HTTPException
from pathlib import Path

from app.schemas.repository import RepositoryRequest
from app.services.repository_service import (
    clone_repository,
    scan_repository,
    analyze_python_files,
    analyze_javascript_files,
    read_repository_file,
    build_javascript_dependency_edges,
)

router = APIRouter(
    prefix="/api/repositories",
    tags=["Repositories"],
)


@router.post("/analyze")
def analyze_repository(request: RepositoryRequest):
    try:
        # Step 1: Clone the repository.
        clone_result = clone_repository(request.repo_url)

        # Step 2: Scan the repository structure.
        scan_result = scan_repository(
            clone_result["local_path"]
        )

        # Step 3: Analyze Python source code.
        code_analysis = analyze_python_files(
            clone_result["local_path"]
        )

        # Step 4: Analyze JavaScript and TypeScript source code.
        javascript_analysis = analyze_javascript_files(
            clone_result["local_path"]
        )

        
        # Step 5: Build JavaScript/TypeScript file dependencies.
        javascript_dependencies = build_javascript_dependency_edges(
            clone_result["local_path"],
            javascript_analysis["files"],
        )


        # Step 6: Return all results.
        return {
            **clone_result,
            "statistics": {
                "total_files": scan_result["total_files"],
                "total_directories": scan_result["total_directories"],
                "python_files_read": code_analysis[
                    "total_python_files_read"
                ],
                "python_files_analyzed": code_analysis[
                    "total_files_analyzed"
                ],
                "python_files_failed": code_analysis[
                    "total_files_failed"
                ],
                "javascript_files_analyzed": javascript_analysis[
                    "total_files_analyzed"
                ],
                "javascript_files_failed": javascript_analysis[
                    "total_files_failed"
                ],
                "total_functions": (
                    sum(
                       len(file["functions"])
                       for file in code_analysis["files"]
                    )
                    + javascript_analysis["total_functions"]
                ),
                "total_classes": (
                    sum(
                       len(file["classes"])
                       for file in code_analysis["files"]
                    )
                    + javascript_analysis["total_classes"]
                ),
                "total_dependencies": sum(
                    len(file["dependency_edges"])
                    for file in code_analysis["files"]
                )
                + javascript_dependencies["total_edges"]
            },

            "files": scan_result["files"],
            "file_details": scan_result["file_details"],
            "code_analysis": code_analysis["files"],
            "javascript_analysis": javascript_analysis["files"],
            "javascript_dependencies": javascript_dependencies,
            "failed_python_files": code_analysis["failed_files"],
            "failed_javascript_files": javascript_analysis["failed_files"],
        }

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Repository analysis failed. Check server logs.",
        ) from exc


@router.get("/file")
def get_repository_file(repository: str, path: str):
    try:
        # Locate the existing cloned repository.
        repositories_root = (
            Path(__file__).resolve().parents[2] / "repositories"
        ).resolve()

        repository_root = (repositories_root / repository).resolve()

        # Ensure the repository is inside the repositories directory.
        if (
            repository_root.parent != repositories_root
            or not repository_root.is_dir()
        ):
            raise HTTPException(
                status_code=404,
                detail="Repository not found. Analyze it first.",
            )

        # Read the requested file safely.
        result = read_repository_file(
            str(repository_root),
            path,
        )

        return result

    except ValueError as exc:
        raise HTTPException(
            status_code=400,
            detail=str(exc),
        ) from exc

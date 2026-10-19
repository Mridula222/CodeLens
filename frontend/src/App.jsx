import { useState, useEffect } from "react";
import "./App.css";
import AssistantPage from "./AssistantPage";

import Prism from "prismjs";
import "prismjs/themes/prism-tomorrow.css";

import "prismjs/components/prism-javascript";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-json";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-css";
import "prismjs/plugins/line-numbers/prism-line-numbers";
import "prismjs/plugins/line-numbers/prism-line-numbers.css";

import DependencyGraph from "./DependencyGraph";

/* ------------------------------------------------------------------
   MOCK DATA
   Everything below is sample data used to preview the dashboard.
   Replace it with real responses once the FastAPI backend is connected.
------------------------------------------------------------------- */

const MOCK_STATS = [
  { id: "files", label: "Files Scanned", value: "1,284", hint: "Sample value" },
  {
    id: "languages",
    label: "Languages Detected",
    value: "6",
    hint: "Sample value",
  },
  {
    id: "symbols",
    label: "Functions & Classes",
    value: "3,917",
    hint: "Sample value",
  },
  { id: "deps", label: "Dependencies", value: "142", hint: "Sample value" },
];

const MOCK_LANGUAGES = [
  { name: "Python", percent: 48, color: "#818cf8" },
  { name: "TypeScript", percent: 24, color: "#38bdf8" },
  { name: "JavaScript", percent: 12, color: "#facc15" },
  { name: "CSS", percent: 8, color: "#f472b6" },
  { name: "Shell", percent: 5, color: "#4ade80" },
  { name: "Other", percent: 3, color: "#71717a" },
];

const MOCK_RECENT = [
  {
    repo: "example-org/web-platform",
    when: "Sample · 2 hours ago",
    status: "Complete",
  },
  {
    repo: "example-org/data-pipeline",
    when: "Sample · Yesterday",
    status: "Complete",
  },
  {
    repo: "example-org/mobile-client",
    when: "Sample · 3 days ago",
    status: "Failed",
  },
];

const MOCK_FILE_TREE = [
  {
    name: "src",
    type: "folder",
    children: [
      {
        name: "api",
        type: "folder",
        children: [
          { name: "routes.py", type: "file", lang: "Python" },
          { name: "schemas.py", type: "file", lang: "Python" },
        ],
      },
      {
        name: "services",
        type: "folder",
        children: [
          { name: "parser.py", type: "file", lang: "Python" },
          { name: "graph.py", type: "file", lang: "Python" },
        ],
      },
      { name: "main.py", type: "file", lang: "Python" },
    ],
  },
  {
    name: "web",
    type: "folder",
    children: [
      { name: "App.tsx", type: "file", lang: "TypeScript" },
      { name: "index.css", type: "file", lang: "CSS" },
    ],
  },
  { name: "requirements.txt", type: "file", lang: "Text" },
  { name: "README.md", type: "file", lang: "Markdown" },
];

const MOCK_DEPENDENCIES = [
  { name: "fastapi", version: "0.115.0", usedBy: 14 },
  { name: "pydantic", version: "2.9.2", usedBy: 22 },
  { name: "sqlalchemy", version: "2.0.35", usedBy: 9 },
  { name: "react", version: "19.0.0", usedBy: 31 },
];

const NAV_ITEMS = [
  { id: "overview", label: "Overview", icon: "grid" },
  { id: "files", label: "Files", icon: "folder" },
  { id: "dependencies", label: "Dependencies", icon: "share" },
  { id: "assistant", label: "AI Assistant", icon: "sparkle" },
  { id: "settings", label: "Settings", icon: "gear" },
];

/* Accepts URLs like https://github.com/owner/repo (optional .git or trailing slash). */
const GITHUB_URL_PATTERN =
  /^(https?:\/\/)?(www\.)?github\.com\/[\w.-]+\/[\w.-]+?(\.git)?\/?$/i;

/* ------------------------------------------------------------------
   SMALL REUSABLE COMPONENTS
------------------------------------------------------------------- */

function Icon({ name, size = 16 }) {
  const paths = {
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
    folder: (
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    ),
    file: (
      <>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
        <path d="M14 3v5h5" />
      </>
    ),
    share: (
      <>
        <circle cx="6" cy="12" r="2.5" />
        <circle cx="18" cy="6" r="2.5" />
        <circle cx="18" cy="18" r="2.5" />
        <path d="M8.2 10.9l7.6-3.8M8.2 13.1l7.6 3.8" />
      </>
    ),
    sparkle: (
      <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
    ),
    gear: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" />
      </>
    ),
    github: (
      <path d="M9 19c-4.3 1.4-4.3-2.5-6-3m12 5v-3.5c0-1 .1-1.4-.5-2 2.8-.3 5.5-1.4 5.5-6a4.6 4.6 0 0 0-1.3-3.2 4.2 4.2 0 0 0-.1-3.2s-1.1-.3-3.5 1.3a12.3 12.3 0 0 0-6.2 0C6.5 2.8 5.4 3.1 5.4 3.1a4.2 4.2 0 0 0-.1 3.2A4.6 4.6 0 0 0 4 9.5c0 4.6 2.7 5.7 5.5 6-.6.6-.6 1.2-.5 2V21" />
    ),
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 8v4M12 16h.01" />
      </>
    ),
    chevron: <path d="M9 6l6 6-6 6" />,
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {paths[name]}
    </svg>
  );
}

function MockBadge() {
  return <span className="mock-badge">Sample data</span>;
}

function Panel({ title, description, action, children, className = "" }) {
  return (
    <section className={`panel ${className}`} aria-label={title}>
      <header className="panel-header">
        <div>
          <h2 className="panel-title">{title}</h2>
          {description && <p className="panel-description">{description}</p>}
        </div>
        {action}
      </header>
      <div className="panel-body">{children}</div>
    </section>
  );
}

function StatCard({ label, value, hint }) {
  return (
    <div className="stat-card">
      <p className="stat-label">{label}</p>
      <p className="stat-value">{value}</p>
      <p className="stat-hint">{hint}</p>
    </div>
  );
}

/* ------------------------------------------------------------------
   LAYOUT: SIDEBAR + TOP BAR
------------------------------------------------------------------- */

function Sidebar({ activePage, onNavigate }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-mark" aria-hidden="true">
          {"</>"}
        </span>
        <span className="brand-name">CodeLens</span>
      </div>

      <nav aria-label="Main navigation">
        <ul className="nav-list">
          {NAV_ITEMS.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                className={`nav-item ${activePage === item.id ? "is-active" : ""}`}
                aria-current={activePage === item.id ? "page" : undefined}
                onClick={() => onNavigate(item.id)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </nav>

      
    </aside>
  );
}

function TopBar({ title, repoStatus }) {
  const statusText = {
    idle: "No repository connected",
    loading: "Validating repository…",
    queued: "Ready for analysis",
  };

  return (
    <header className="topbar">
      <h1 className="topbar-title">{title}</h1>
      <div
        className={`repo-status status-${repoStatus}`}
        role="status"
        aria-live="polite"
      >
        <span className="status-dot" aria-hidden="true" />
        <span>{statusText[repoStatus]}</span>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------
   REPOSITORY INPUT FORM
------------------------------------------------------------------- */

function RepoForm({ onSubmitted, onStatusChange }) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    const trimmedUrl = url.trim();

    if (trimmedUrl === "") {
      setError("Please enter a GitHub repository URL.");
      return;
    }

    if (!GITHUB_URL_PATTERN.test(trimmedUrl)) {
      setError("Enter a valid GitHub URL: https://github.com/owner/repo");
      return;
    }

    setError("");
    setIsLoading(true);
    onStatusChange("loading");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/api/repositories/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            repo_url: trimmedUrl,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Repository analysis failed.");
      }

      console.log("Backend analysis response:", data);

      onStatusChange("queued");
      onSubmitted({
        url: trimmedUrl,
        data,
      });
    } catch (error) {
      console.error("Repository analysis error:", error);
      setError(error.message || "Could not connect to the CodeLens backend.");
      onStatusChange("idle");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <form className="repo-form" onSubmit={handleSubmit} noValidate>
      <label htmlFor="repo-url" className="repo-label">
        GitHub repository URL
      </label>
      <div className="repo-row">
        <div className={`input-wrap ${error ? "has-error" : ""}`}>
          <Icon name="github" />
          <input
            id="repo-url"
            type="url"
            inputMode="url"
            autoComplete="off"
            spellCheck="false"
            placeholder="https://github.com/owner/repository"
            value={url}
            onChange={(event) => {
              setUrl(event.target.value);
              if (error) setError("");
            }}
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? "repo-url-error" : "repo-url-help"}
            disabled={isLoading}
          />
        </div>
        <button type="submit" className="primary-button" disabled={isLoading}>
          {isLoading && <span className="spinner" aria-hidden="true" />}
          {isLoading ? "Analyzing…" : "Analyze Repository"}
        </button>
      </div>

      {error ? (
        <p id="repo-url-error" className="field-error" role="alert">
          <Icon name="alert" size={14} />
          {error}
        </p>
      ) : (
        <p id="repo-url-help" className="field-help">
          Public repositories only. Analysis runs on the CodeLens backend once
          connected.
        </p>
      )}
    </form>
  );
}

/* ------------------------------------------------------------------
   DASHBOARD PANELS
------------------------------------------------------------------- */

function LanguageDistribution({ fileDetails = [], hasAnalysis = false }) {
  const LANGUAGE_COLORS = {
    Python: "#3776AB",
    JavaScript: "#F7DF1E",
    "JavaScript (React JSX)": "#61DAFB",
    TypeScript: "#3178C6",
    "TypeScript (React TSX)": "#3178C6",
    Java: "#ED8B00",
    "C++": "#00599C",
    C: "#A8B9CC",
    HTML: "#E34F26",
    CSS: "#1572B6",
    SCSS: "#CD6799",
    SQL: "#CC9900",
    JSON: "#8BC34A",
    Markdown: "#9CA3AF",
  };

  const languages = Object.entries(
    fileDetails.reduce((counts, file) => {
      const language = file.language || "Unknown";
      counts[language] = (counts[language] || 0) + 1;
      return counts;
    }, {}),
  )
    .map(([name, count]) => ({
      name,
      count,
      percent: fileDetails.length
        ? Math.round((count / fileDetails.length) * 100)
        : 0,
      color: LANGUAGE_COLORS[name] || "#8B8FA3",
    }))
    .sort((a, b) => b.count - a.count);

  if (!hasAnalysis) {
    return (
      <p className="empty-state">
        Analyze a repository to see its language distribution.
      </p>
    );
  }

  if (languages.length === 0) {
    return <p className="empty-state">No files found in this repository.</p>;
  }

  return (
    <div>
      <div
        className="lang-bar"
        role="img"
        aria-label={`Language distribution by file count: ${languages
          .map((lang) => `${lang.name} ${lang.percent}%`)
          .join(", ")}`}
      >
        {languages.map((lang) => (
          <span
            key={lang.name}
            title={`${lang.name}: ${lang.count} files (${lang.percent}%)`}
            style={{
              width: `${lang.percent}%`,
              backgroundColor: lang.color,
            }}
          />
        ))}
      </div>

      <ul className="lang-list">
        {languages.map((lang) => (
          <li key={lang.name}>
            <span
              className="lang-dot"
              style={{ backgroundColor: lang.color }}
              aria-hidden="true"
            />
            <span className="lang-name">{lang.name}</span>
            <span className="lang-percent">
              {lang.count} files · {lang.percent}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function RecentAnalyses() {
  return (
    <ul className="recent-list">
      {MOCK_RECENT.map((item) => (
        <li key={item.repo} className="recent-item">
          <div>
            <p className="recent-repo">{item.repo}</p>
            <p className="recent-when">{item.when}</p>
          </div>
          <span
            className={`pill ${item.status === "Complete" ? "pill-success" : "pill-danger"}`}
          >
            {item.status}
          </span>
        </li>
      ))}
    </ul>
  );
}

function buildFileTree(files) {
  const root = [];

  for (const file of files) {
    const parts = file.path.replace(/\\/g, "/").split("/");
    let currentLevel = root;

    parts.forEach((part, index) => {
      let node = currentLevel.find((item) => item.name === part);

      if (!node) {
        const isFile = index === parts.length - 1;

        node = {
          name: part,
          type: isFile ? "file" : "folder",
          children: [],
          lang: isFile ? file.language : undefined,
          path: isFile ? file.path : undefined,
        };

        currentLevel.push(node);
      }

      if (index < parts.length - 1) {
        currentLevel = node.children;
      }
    });
  }

  return root;
}

function FileTreeNode({ node, depth, onFileSelect }) {
  const [isOpen, setIsOpen] = useState(depth === 0);
  const indent = { paddingLeft: `${depth * 16 + 8}px` };

  if (node.type === "file") {
    return (
      <li key={node.name}>
        <button
          type="button"
          className="tree-row tree-file"
          style={indent}
          onClick={() => onFileSelect?.(node)}
          title={`Open ${node.name}`}
        >
          <Icon name="file" size={14} />
          <span className="tree-name">{node.name}</span>
          <span className="tree-meta">{node.lang}</span>
        </button>
      </li>
    );
  }

  return (
    <li>
      <button
        type="button"
        className="tree-row tree-folder"
        style={indent}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className={`tree-chevron ${isOpen ? "is-open" : ""}`}>
          <Icon name="chevron" size={12} />
        </span>
        <Icon name="folder" size={14} />
        <span className="tree-name">{node.name}</span>
      </button>
      {isOpen && (
        <ul>
          {node.children.map((child) => (
            <FileTreeNode
              key={child.name}
              node={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

function FileExplorer({ files, onFileSelect }) {
  const fileTree = buildFileTree(files);

  if (files.length === 0) {
    return (
      <p className="placeholder-text">
        Analyze a repository to see its files here.
      </p>
    );
  }

  return (
    <ul className="file-tree" aria-label="Repository file tree">
      {fileTree.map((node) => (
        <FileTreeNode
          key={node.name}
          node={node}
          depth={0}
          onFileSelect={onFileSelect}
        />
      ))}
    </ul>
  );
}

function RepositoryStructureGraph({ fileDetails = [], hasAnalysis = false }) {
  if (!hasAnalysis) {
    return (
      <div className="graph-placeholder">
        <Icon name="share" size={22} />
        <p className="graph-title">Analyze a repository first</p>
        <p className="graph-text">
          Your repository structure will appear here.
        </p>
      </div>
    );
  }

  if (fileDetails.length === 0) {
    return (
      <div className="graph-placeholder">
        <p className="graph-title">No files to visualize</p>
        <p className="graph-text">
          This repository did not return any file details.
        </p>
      </div>
    );
  }

  const groups = {};

  fileDetails.forEach((file) => {
    const parts = file.path.split("/");
    const folder = parts.length > 1 ? parts[0] : "(root)";

    if (!groups[folder]) groups[folder] = [];
    groups[folder].push(file);
  });

  const folders = Object.entries(groups).slice(0, 8);

  const nodeWidth = 180;
  const nodeHeight = 44;
  const columnGap = 32;
  const rowGap = 24;
  const left = 24;
  const top = 30;
  const rootWidth = 200;
  const rootHeight = 54;

  const columns = 2;
  const totalWidth = left * 2 + columns * nodeWidth + (columns - 1) * columnGap;

  const childRows = folders.map(([name, files]) => ({
    name,
    files: files.slice(0, 4),
    total: files.length,
  }));

  const rows = childRows.map((group) => ({
    ...group,
    height:
      nodeHeight +
      12 +
      Math.max(1, group.files.length) * (24 + 6) +
      (group.total > 4 ? 22 : 0),
  }));

  const maxRowHeight = Math.max(...rows.map((row) => row.height), 100);
  const rootX = (totalWidth - rootWidth) / 2;
  const rootY = top;
  const branchY = rootY + rootHeight + 42;

  const positions = rows.map((row, index) => {
    const column = index % columns;
    const rowIndex = Math.floor(index / columns);
    const x = left + column * (nodeWidth + columnGap);
    const y = branchY + rowIndex * (maxRowHeight + rowGap);

    return { ...row, x, y };
  });

  const totalHeight =
    positions.length > 0
      ? Math.max(...positions.map((p) => p.y + p.height)) + 30
      : branchY + 100;

  return (
    <div className="repo-graph-svg-wrap">
      <svg
        className="repo-graph-svg"
        viewBox={`0 0 ${totalWidth} ${totalHeight}`}
        role="img"
        aria-label="Repository folder and file structure graph"
      >
        <defs>
          <marker
            id="repo-arrow"
            markerWidth="7"
            markerHeight="7"
            refX="5"
            refY="3.5"
            orient="auto"
          >
            <path d="M0,0 L7,3.5 L0,7 Z" fill="#7185ff" />
          </marker>
        </defs>

        {/* Connections from repository to each folder */}
        {positions.map((node) => {
          const startX = rootX + rootWidth / 2;
          const startY = rootY + rootHeight;
          const endX = node.x + nodeWidth / 2;
          const endY = node.y;

          return (
            <path
              key={`edge-${node.name}`}
              d={`M ${startX} ${startY} C ${startX} ${startY + 24}, ${endX} ${endY - 24}, ${endX} ${endY}`}
              fill="none"
              stroke="#7185ff"
              strokeWidth="1.5"
              markerEnd="url(#repo-arrow)"
            />
          );
        })}

        {/* Repository root node */}
        <rect
          x={rootX}
          y={rootY}
          width={rootWidth}
          height={rootHeight}
          rx="10"
          fill="#252b43"
          stroke="#7185ff"
          strokeWidth="1.5"
        />
        <text
          x={rootX + rootWidth / 2}
          y={rootY + 22}
          textAnchor="middle"
          fill="#ffffff"
          fontSize="14"
          fontWeight="600"
        >
          Repository
        </text>
        <text
          x={rootX + rootWidth / 2}
          y={rootY + 40}
          textAnchor="middle"
          fill="#b8c0d9"
          fontSize="11"
        >
          {fileDetails.length} files
        </text>

        {/* Folder nodes and their file nodes */}
        {positions.map((node) => (
          <g key={node.name}>
            <rect
              x={node.x}
              y={node.y}
              width={nodeWidth}
              height={nodeHeight}
              rx="8"
              fill="#252b43"
              stroke="#5667c8"
            />
            <text x={node.x + 12} y={node.y + 18} fill="#aab8ff" fontSize="12">
              {node.name.length > 19 ? `${node.name.slice(0, 17)}…` : node.name}
            </text>
            <text x={node.x + 12} y={node.y + 34} fill="#b8c0d9" fontSize="10">
              {node.total} files
            </text>

            {node.files.map((file, index) => {
              const fileY = node.y + nodeHeight + 12 + index * 30;
              const fileName = file.path.split("/").pop();

              return (
                <g key={file.path}>
                  <path
                    d={`M ${node.x + nodeWidth / 2} ${node.y + nodeHeight} L ${node.x + nodeWidth / 2} ${fileY} L ${node.x + 8} ${fileY}`}
                    fill="none"
                    stroke="#5667c8"
                    strokeWidth="1"
                  />
                  <rect
                    x={node.x + 8}
                    y={fileY}
                    width={nodeWidth - 8}
                    height="24"
                    rx="5"
                    fill="#191d28"
                    stroke="#30384d"
                  />
                  <text
                    x={node.x + 16}
                    y={fileY + 16}
                    fill="#e0e5f5"
                    fontSize="10"
                  >
                    {fileName.length > 23
                      ? `${fileName.slice(0, 21)}…`
                      : fileName}
                  </text>
                </g>
              );
            })}

            {node.total > 4 && (
              <text
                x={node.x + 12}
                y={node.y + nodeHeight + 12 + 4 * 30 + 8}
                fill="#a4acc4"
                fontSize="10"
              >
                +{node.total - 4} more files
              </text>
            )}
          </g>
        ))}
      </svg>
    </div>
  );
}

function DependencyInsights({ fileDetails = [], hasAnalysis = false }) {
  const extensionCounts = fileDetails.reduce((counts, file) => {
    const extension = file.extension || "No extension";
    counts[extension] = (counts[extension] || 0) + 1;
    return counts;
  }, {});

  const fileTypes = Object.entries(extensionCounts)
    .map(([extension, count]) => ({ extension, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return (
    <div className="deps">
      <RepositoryStructureGraph
        fileDetails={fileDetails}
        hasAnalysis={hasAnalysis}
      />

      <table className="deps-table">
        <caption className="sr-only">
          Most common file extensions in the analyzed repository
        </caption>
        <thead>
          <tr>
            <th scope="col">File type</th>
            <th scope="col">Extension</th>
            <th scope="col">Files</th>
          </tr>
        </thead>
        <tbody>
          {!hasAnalysis ? (
            <tr>
              <td colSpan={3}>No repository analyzed yet.</td>
            </tr>
          ) : fileTypes.length === 0 ? (
            <tr>
              <td colSpan={3}>No files found.</td>
            </tr>
          ) : (
            fileTypes.map((item) => (
              <tr key={item.extension}>
                <td className="mono">
                  {item.extension === "No extension"
                    ? "Files without extension"
                    : item.extension}
                </td>
                <td className="mono muted">{item.extension}</td>
                <td>{item.count}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------
   PAGES
------------------------------------------------------------------- */

function OverviewPage({ onStatusChange, analysis, setAnalysis }) {
  const stat = analysis?.data?.statistics;
  console.log("Real repository files:", analysis?.data?.file_details);

  const files = analysis?.data?.file_details ?? [];
  const stats = analysis?.data?.statistics;
  console.log("CodeLens statistics:", stats);
  console.log("Function count:", stats?.total_functions);
  console.log("Class count:", stats?.total_classes);

  const detectedLanguages = [
    ...new Set(
      files
        .map((file) => file.language)
        .filter((language) => language && language !== "Unknown"),
    ),
  ];

  const displayStats = MOCK_STATS.map((stat) => {
    if (stat.id === "files" && stats) {
      return {
        ...stat,
        value: stats.total_files ?? 0,
        hint: "Actual repository data",
      };
    }

    if (stat.id === "languages" && analysis) {
      return {
        ...stat,
        value: detectedLanguages.length,
        hint: "Detected from file extensions",
      };
    }

    if (stat.id === "symbols" && stats) {
      return {
        ...stat,
        value: (stats.total_functions ?? 0) + (stats.total_classes ?? 0),
        hint: `${stats.total_functions ?? 0} functions · ${
          stats.total_classes ?? 0
        } classes`,
      };
    }

    if (stat.id === "deps" && analysis) {
      return {
        ...stat,
        value: stats.total_dependencies ?? -1,
        hint: "Detected Python function calls",
      };
    }

    return {
      ...stat,
      value: analysis ? "—" : stat.value,
      hint: analysis ? "Not available from API yet" : stat.hint,
    };
  });

  return (
    <>
      <section className="hero" aria-labelledby="hero-heading">
        <h2 id="hero-heading" className="hero-heading">
          Understand your codebase.
        </h2>
        <p className="hero-text">
          Paste a GitHub repository to map its files, languages, symbols, and
          dependencies.
        </p>
        <RepoForm onSubmitted={setAnalysis} onStatusChange={onStatusChange} />

        {analysis && (
          <p className="notice" role="status">
            <strong>{analysis.url}</strong> was analyzed successfully. The
            backend response has been received.
          </p>
        )}
      </section>

      <div className="section-label">
        <span>Dashboard preview</span>
        <MockBadge />
      </div>

      <section
        className="stats-grid"
        aria-label="Repository statistics (sample data)"
      >
        {displayStats.map((stat) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={stat.value}
            hint={stat.hint}
          />
        ))}
      </section>

      <div className="panel-grid">
        <Panel
          title="Repository Overview"
          description="Language distribution by file count"
          action={analysis ? null : <MockBadge />}
        >
          <LanguageDistribution
            fileDetails={analysis?.data?.file_details ?? []}
            hasAnalysis={Boolean(analysis)}
          />
          <h3 className="subheading">Recent analysis</h3>
          <RecentAnalyses />
        </Panel>

        <Panel
          title="File Explorer"
          description="Folders and source files"
          action={analysis ? null : <MockBadge />}
        >
          <FileExplorer files={analysis?.data?.file_details ?? []} />
        </Panel>

        <Panel
          title="Dependency Insights"
          description="Most-used packages across the project"
          action={<MockBadge />}
          className="panel-wide"
        >
          <DependencyInsights
            fileDetails={analysis?.data?.file_details ?? []}
            hasAnalysis={Boolean(analysis)}
          />
        </Panel>
      </div>
    </>
  );
}

function SettingsPage() {
  return (
    <div className="panel-grid">
      <Panel
        title="AI Configuration"
        description="AI provider information for this CodeLens instance."
      >
        <div className="settings-item">
          <div>
            <strong>AI Provider</strong>
            <p className="panel-description">
              Used to generate repository explanations.
            </p>
          </div>
          <span className="pill pill-success">Groq</span>
        </div>

        <div className="settings-item">
          <div>
            <strong>API key</strong>
            <p className="panel-description">
              Managed securely by the backend environment.
            </p>
          </div>
          <span className="pill pill-success">Backend managed</span>
        </div>
      </Panel>

      <Panel title="Appearance" description="Interface preferences.">
        <div className="settings-item">
          <div>
            <strong>Theme</strong>
            <p className="panel-description">
              CodeLens currently uses its dark interface.
            </p>
          </div>
          <span className="pill">Dark</span>
        </div>
      </Panel>

      <Panel
        title="About CodeLens"
        description="Your AI-powered codebase intelligence tool."
      >
        <div className="settings-item">
          <strong>Version</strong>
          <span className="pill">v0.1 MVP</span>
        </div>

        <p className="placeholder-text">
          CodeLens helps developers explore repository files, understand
          dependencies, and ask questions about their code.
        </p>
      </Panel>
    </div>
  );
}

function PlaceholderPage({ title }) {
  return (
    <Panel title={title} description="This section is not built yet.">
      <p className="placeholder-text">
        {title} will be available once the CodeLens backend is connected. Head
        back to Overview to try the repository input.
      </p>
    </Panel>
  );
}

function DependenciesPage({ analysis }) {
  const dependencies = analysis?.data?.javascript_dependencies;
  const [searchTerm, setSearchTerm] = useState("");

  if (!analysis || !dependencies) {
    return (
      <Panel
        title="Dependencies"
        description="Explore relationships between files."
      >
        <p className="placeholder-text">
          Analyze a repository from Overview to see its dependencies.
        </p>
      </Panel>
    );
  }

  const filteredEdges = dependencies.edges.filter((edge) => {
    const query = searchTerm.toLowerCase().trim();

    return (
      edge.source.toLowerCase().includes(query) ||
      edge.target.toLowerCase().includes(query) ||
      edge.import.toLowerCase().includes(query)
    );
  });

  return (
    <Panel
      title="Dependencies"
      description="Explore how files connect inside your repository."
    >
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Local Connections</span>
          <strong className="stat-value">{dependencies.total_edges}</strong>
        </div>

        <div className="stat-card">
          <span className="stat-label">External Imports</span>
          <strong className="stat-value">
            {dependencies.total_external_imports}
          </strong>
        </div>

        <div className="stat-card">
          <span className="stat-label">Unresolved Imports</span>
          <strong className="stat-value">
            {dependencies.total_unresolved_imports}
          </strong>
        </div>
      </div>

      <div className="dependency-graph-section">
        <div className="dependency-browser-header">
          <div>
            <h3 className="section-title">Dependency graph</h3>
            <p className="dependency-help">
              Explore how your repository files connect.
            </p>
          </div>
          <span className="dependency-count">
            {dependencies.edges.length} connections
          </span>
        </div>

        <DependencyGraph dependencies={dependencies} />
      </div>

      <div className="dependency-browser">
        <div className="dependency-browser-header">
          <div>
            <h3 className="section-title">File connections</h3>
            <p className="dependency-help">
              See which files import other files.
            </p>
          </div>

          <span className="dependency-count">
            {filteredEdges.length} of {dependencies.edges.length}
          </span>
        </div>

        <div className="dependency-search">
          <span className="dependency-search-icon">⌕</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search files or import paths..."
            aria-label="Search file dependencies"
          />

          {searchTerm && (
            <button
              type="button"
              className="dependency-clear"
              onClick={() => setSearchTerm("")}
            >
              Clear
            </button>
          )}
        </div>

        {filteredEdges.length === 0 ? (
          <p className="dependency-empty">
            {dependencies.edges.length === 0
              ? "No local file connections were detected."
              : "No connections match your search. Try another filename."}
          </p>
        ) : (
          <div className="dependency-table">
            <div className="dependency-table-header">
              <span>Source file</span>
              <span>Imports</span>
              <span>Import path</span>
            </div>

            {filteredEdges.map((edge, index) => (
              <div
                className="dependency-row"
                key={`${edge.source}-${edge.target}-${index}`}
              >
                <div className="dependency-source">
                  <span className="dependency-file-icon">JS</span>
                  <span title={edge.source}>{edge.source}</span>
                </div>

                <div className="dependency-target">
                  <span className="dependency-arrow-inline">→</span>
                  <span title={edge.target}>{edge.target}</span>
                </div>

                <div className="dependency-path" title={edge.import}>
                  {edge.import}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Panel>
  );
}

function getPrismLanguage(filePath) {
  const extension = filePath.split(".").pop().toLowerCase();

  const languages = {
    js: "javascript",
    jsx: "jsx",
    ts: "typescript",
    tsx: "tsx",
    py: "python",
    json: "json",
    html: "markup",
    htm: "markup",
    css: "css",
    md: "markdown",
  };

  return languages[extension] || "clike";
}

function FilesPage({ analysis }) {
  const files = analysis?.data?.file_details ?? [];
  const repository = analysis?.data?.repository;

  const [selectedFile, setSelectedFile] = useState(null);
  const [sourceCode, setSourceCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (sourceCode !== "" && selectedFile) {
      Prism.highlightAll();
    }
  }, [sourceCode, selectedFile]);

  async function handleFileSelect(file) {
    setSelectedFile(file);
    setSourceCode("");
    setError("");
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        repository,
        path: file.path,
      });

      const response = await fetch(
        `http://127.0.0.1:8000/api/repositories/file?${params.toString()}`,
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Could not load this file.");
      }

      setSourceCode(data.content);
    } catch (err) {
      setError(err.message || "Could not connect to the backend.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="files-workspace">
      <Panel
        title="Repository Files"
        description={
          analysis
            ? `${files.length} files · ${analysis.url}`
            : "Browse your repository"
        }
      >
        {analysis ? (
          <FileExplorer files={files} onFileSelect={handleFileSelect} />
        ) : (
          <p className="placeholder-text">
            Analyze a GitHub repository in Overview first.
          </p>
        )}
      </Panel>

      <Panel
        title={selectedFile?.path || "Source Code"}
        description="Selected file contents"
        className="source-panel"
      >
        {!selectedFile ? (
          <p className="placeholder-text">
            Select a file from the tree to view its source code.
          </p>
        ) : isLoading ? (
          <p className="placeholder-text">Loading source code...</p>
        ) : error ? (
          <p className="field-error" role="alert">
            {error}
          </p>
        ) : (
          <div className="source-code-container">
            <div className="source-code-header">
              <span>
                {selectedFile.name || selectedFile.path.split("/").pop()}
              </span>
              <span>{sourceCode.split("\n").length} lines</span>
            </div>

            <pre className="source-code line-numbers">
              <code
                className={`language-${getPrismLanguage(selectedFile.path)}`}
              >
                {sourceCode}
              </code>
            </pre>
          </div>
        )}
      </Panel>
    </div>
  );
}

/* ------------------------------------------------------------------
   APP ROOT
------------------------------------------------------------------- */

export default function App() {
  const [activePage, setActivePage] = useState("overview");
  const [repoStatus, setRepoStatus] = useState("idle");
  const [analysis, setAnalysis] = useState(null);

  const activeItem = NAV_ITEMS.find((item) => item.id === activePage);

  return (
    <div className="app">
      <Sidebar activePage={activePage} onNavigate={setActivePage} />

      <div className="main">
        <TopBar title={activeItem.label} repoStatus={repoStatus} />

        <main className="content">
          {activePage === "overview" ? (
            <OverviewPage
              onStatusChange={setRepoStatus}
              analysis={analysis}
              setAnalysis={setAnalysis}
            />
          ) : activePage === "dependencies" ? (
            <DependenciesPage analysis={analysis} />
          ) : activePage === "files" ? (
            <FilesPage analysis={analysis} />
          ) : activePage === "assistant" ? (
            <AssistantPage analysis={analysis} />
          ) : activePage === "settings" ? (
            <SettingsPage />
          ) : (
            <PlaceholderPage title={activeItem.label} />
          )}
        </main>
      </div>
    </div>
  );
}

# CodeLens
AI-powered codebase analysis platform that helps developers explore repositories, understand source code, visualize dependencies, and ask questions about their code using AI.


# CodeLens 🔍

**AI-Powered Codebase Analysis and Understanding Platform**

CodeLens is a web application designed to help developers understand code repositories more easily. It analyzes a repository, displays its files, helps explore source code and dependencies, and provides an AI assistant that answers questions using relevant code context.

## ✨ Features

- **Repository Analysis:** Analyze a GitHub repository and view summary information about its codebase.
- **File Explorer:** Browse repository files and inspect source code.
- **Dependency View:** Explore available dependency information for the analyzed codebase.
- **AI Code Assistant:** Ask questions about your code and receive context-aware explanations.
- **Source References:** View the source files used to provide context for AI answers.
- **Simple Web Interface:** Navigate between the overview, files, dependencies, AI assistant, and settings.

## 🛠️ Tech Stack

**Frontend**
- React
- Vite
- CSS

**Backend**
- Python
- FastAPI
- Uvicorn

**AI**
- Groq API
- Large Language Models (LLMs)
- Context retrieval from repository source files

**Development Tools**
- Git and GitHub
- VS Code
- Swagger UI for API testing

## 🏗️ Project Structure

```text
CodeLens/
├── backend/
│   ├── app/
│   │   ├── main.py
│   │   ├── routes/
│   │   └── services/
│   ├── requirements.txt
│   └── .env.example
│
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

*Note: The structure above is illustrative. Update it if your actual project folders differ.*

## 🚀 Getting Started

### Prerequisites

- Python 3.10 or a compatible version for the project's dependencies
- Node.js and npm
- Git
- A Groq API key for AI assistant functionality

### 1. Clone the repository

```bash
git clone https://github.com/Mridula222/CodeLens.git
cd CodeLens
```

### 2. Set up the backend

```bash
cd backend
python -m venv venv
```

On Windows:

```cmd
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create a `.env` file inside the `backend` directory and configure the required environment variables:

```env
GROQ_API_KEY=your_groq_api_key
```

Never commit your actual API key or `.env` file to GitHub.

Start the backend:

```bash
python -m uvicorn app.main:app --reload
```

The API will be available locally at `http://127.0.0.1:8000`.

Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

### 3. Set up the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the local URL displayed by Vite, usually `http://localhost:5173`.

## 🔐 Security

- Keep API keys in environment variables.
- Do not commit `.env` files, credentials, or private repository data.
- Configure CORS and production environment variables before deployment.

## 🗺️ Roadmap

- Improve repository analysis and dependency visualization.
- Enhance AI responses and source-code context retrieval.
- Deploy the frontend and backend.
- Improve error handling and support for larger repositories.

## 👩‍💻 Author

**Mridula Kumari**

B.Tech Computer Science and Engineering

GitHub: [@Mridula222](https://github.com/Mridula222)

---

*CodeLens is an evolving project. Features and setup instructions may change as development continues.*
"# CodeLens" 

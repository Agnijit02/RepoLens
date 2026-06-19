# RepoLens — Deep Code Intelligence 🔍

RepoLens is a powerful, AI-driven repository analysis tool that provides deep architectural insights into any codebase in under a minute. Simply paste a repository URL, and RepoLens will securely clone, analyze, and visualize the structure, business logic, and key files of the project.

## ✨ Features

- **AST & Import Graph Parsing:** Uses `ts-morph` to build a complete dependency graph of the codebase.
- **Entry Point Detection:** Automatically identifies where the application starts using priority-ordered heuristics.
- **Project Type Classification:** Detects frameworks, languages, and project types (Frontend, Backend, Monorepo, etc.).
- **Business Logic Scoring:** Ranks files based on import centrality, export depth, and cyclomatic complexity.
- **Gemini AI Integration:** Provides natural language summaries for modules, dependencies, and entry points using Gemini 1.5 Flash.
- **Repository Tour:** A guided, interactive 8-stop tour through the architecture of the repository.

## 🚀 Tech Stack

- **Frontend:** Next.js (App Router), React, Recharts, Framer Motion
- **Styling:** Vanilla CSS with custom glassmorphism UI
- **Backend/Analysis:** Node.js, `simple-git`, `ts-morph`
- **AI:** Google Gemini AI API

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+ recommended)
- Git installed on your system
- A Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/repolens.git
   cd repolens
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory and add your Gemini API key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Open the application:**
   Navigate to [http://localhost:3000](http://localhost:3000) in your browser.

## 📖 How it Works

1. **Clone:** Securely clones the target repository via `simple-git` into a temporary directory.
2. **Parse:** Uses AST parsing (`ts-morph`) to map out all files, exports, and imports.
3. **Graph:** Builds an interconnected graph of the entire architecture.
4. **Rank:** Evaluates every node to find entry points and core business logic.
5. **Summarize:** Streams the structural data to Gemini AI for natural language summarization.

## 👨‍💻 Created By

**Agnijit Basu**
📧 [basu.agnijit@gmail.com](mailto:basu.agnijit@gmail.com)

Built for Digital Heroes.

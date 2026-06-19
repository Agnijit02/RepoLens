import * as path from 'path'
import type {
  RepositoryIndex,
  TourStop,
  EntryPointResult,
  ProjectTypeResult,
  BusinessLogicModule,
  FileRankingResult,
  GraphNode,
  GraphLink,
} from '../types'

/**
 * Generate the 8-stop Repository Tour from the fully-built Repository Index
 * and all analyzer results. AI summaries are filled in later by the summarizer.
 */
export function generateTour(
  index:         RepositoryIndex,
  entryPoint:    EntryPointResult,
  projectType:   ProjectTypeResult,
  businessLogic: { modules: BusinessLogicModule[] },
  fileRanking:   FileRankingResult,
): TourStop[] {
  const stops: TourStop[] = []

  // ── Stop 1: Overview ──────────────────────────────────────────────────────
  stops.push({
    id: 1,
    title: `Welcome to ${index.metadata.name}`,
    subtitle: 'Project overview',
    type: 'overview',
    data: {
      metadata: index.metadata,
      projectType,
      stats: {
        files:     index.totalFiles,
        lines:     index.totalLines,
        languages: Object.keys(index.languages).length,
      },
    },
  })

  // ── Stop 2: Entry Point ───────────────────────────────────────────────────
  stops.push({
    id: 2,
    title: 'Entry Point',
    subtitle: 'Where the codebase begins',
    type: 'entry-point',
    data: {
      result:    entryPoint,
      aiSummary: null,   // filled in later
    },
  })

  // ── Stop 3: Project Structure ─────────────────────────────────────────────
  stops.push({
    id: 3,
    title: 'Project Structure',
    subtitle: 'How the codebase is organised',
    type: 'structure',
    data: {
      tree:               index.fileTree.slice(0, 40),
      folderDescriptions: buildFolderDescriptions(index),
    },
  })

  // ── Stop 4: Core Business Logic ───────────────────────────────────────────
  stops.push({
    id: 4,
    title: 'Core Business Logic',
    subtitle: 'The domain heart of the codebase',
    type: 'business-logic',
    data: {
      modules:    businessLogic.modules.slice(0, 5),
      aiSummaries: {},   // filled in later
    },
  })

  // ── Stop 5: Key Dependencies ──────────────────────────────────────────────
  const deps = Object.entries(index.configFiles.packageJson?.dependencies ?? {}).slice(0, 10)
  stops.push({
    id: 5,
    title: 'Key Dependencies',
    subtitle: 'What this project is built on',
    type: 'dependencies',
    data: {
      topDeps: deps.map(([name, version]) => ({ name, version: String(version), description: null })),
    },
  })

  // ── Stop 6: Code Relationships ────────────────────────────────────────────
  const top30   = fileRanking.rankedFiles.slice(0, 30)
  const nodeIds = new Set(top30.map(f => f.path))

  const nodes: GraphNode[] = top30.map(f => ({
    id:    f.path,
    label: path.basename(f.path),
    group: f.extension.replace('.', ''),
    score: f.score,
  }))

  const links: GraphLink[] = []
  for (const file of top30) {
    for (const imp of index.importGraph[file.path] ?? []) {
      if (nodeIds.has(imp)) links.push({ source: file.path, target: imp })
    }
  }

  stops.push({
    id: 6,
    title: 'Code Relationships',
    subtitle: 'How files connect and depend on each other',
    type: 'relationships',
    data: { graph: { nodes, links } },
  })

  // ── Stop 7: Configuration & Infrastructure ────────────────────────────────
  const cfgFiles = []
  if (index.configFiles.dockerfile) {
    cfgFiles.push({
      path:    'Dockerfile',
      purpose: 'Container definition',
      preview: index.configFiles.dockerfile.slice(0, 400),
    })
  }
  if (index.configFiles.dockerCompose) {
    cfgFiles.push({
      path:    'docker-compose.yml',
      purpose: 'Service orchestration',
      preview: index.configFiles.dockerCompose.slice(0, 400),
    })
  }
  for (const [name, content] of Object.entries(index.configFiles.ciWorkflows ?? {}).slice(0, 2)) {
    cfgFiles.push({
      path:    `.github/workflows/${name}`,
      purpose: 'CI/CD Pipeline',
      preview: content.slice(0, 400),
    })
  }
  stops.push({
    id: 7,
    title: 'Configuration & Infrastructure',
    subtitle: 'How the project is deployed and run',
    type: 'config',
    data: { files: cfgFiles },
  })

  // ── Stop 8: How to Run ────────────────────────────────────────────────────
  const scripts  = index.configFiles.packageJson?.scripts ?? {}
  const reserved = new Set(['install', 'dev', 'build', 'test', 'start', 'lint'])
  const others   = Object.fromEntries(
    Object.entries(scripts).filter(([k]) => !reserved.has(k)).slice(0, 6)
  )

  stops.push({
    id: 8,
    title: 'How to Run',
    subtitle: 'Getting started in 60 seconds',
    type: 'how-to-run',
    data: {
      install: 'npm install',
      dev:     scripts.dev   ?? scripts.start ?? 'npm start',
      build:   scripts.build,
      test:    scripts.test,
      otherScripts: others,
    },
  })

  return stops
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

const KNOWN_FOLDERS: Record<string, string> = {
  src:           'Main source code',
  app:           'Application code / Next.js App Router',
  pages:         'Next.js pages / routes',
  components:    'UI components',
  lib:           'Shared utilities and library code',
  utils:         'Helper utilities',
  hooks:         'React hooks',
  styles:        'CSS / styling files',
  public:        'Static assets served directly',
  assets:        'Images, fonts, and other assets',
  api:           'API routes / backend endpoints',
  services:      'Business logic services',
  models:        'Data models / schemas',
  types:         'TypeScript type definitions',
  store:         'State management (Redux / Zustand / Jotai)',
  context:       'React context providers',
  tests:         'Test files',
  '__tests__':   'Jest test files',
  config:        'Configuration files',
  scripts:       'Build / automation scripts',
  docs:          'Documentation',
  packages:      'Monorepo sub-packages',
  apps:          'Monorepo applications',
  cmd:           'CLI commands (Go)',
  internal:      'Internal packages (Go)',
  pkg:           'Exportable packages (Go)',
  migrations:    'Database migrations',
  prisma:        'Prisma ORM schema and migrations',
}

function buildFolderDescriptions(index: RepositoryIndex): Record<string, string> {
  const result: Record<string, string> = {}
  for (const node of index.fileTree) {
    if (node.type === 'dir') {
      const name = path.basename(node.path)
      if (KNOWN_FOLDERS[name]) result[node.path] = KNOWN_FOLDERS[name]
    }
  }
  return result
}

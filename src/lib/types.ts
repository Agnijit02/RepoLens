// ─────────────────────────────────────────────────────────────────────────────
// Core types for the RepoLens Repository Index
// ─────────────────────────────────────────────────────────────────────────────

export interface RepoMetadata {
  url: string
  owner: string
  name: string
  description: string
  primaryLanguage: string
  clonedAt: Date
  localPath: string
}

export interface FileNode {
  path: string          // relative path from repo root
  absolutePath: string
  type: 'file' | 'dir'
  size: number          // bytes
  extension: string
  lineCount?: number
  children?: FileNode[]
}

export interface ExportedSymbol {
  name: string
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable' | 'enum'
  isDefault: boolean
  line: number
}

export interface PackageJson {
  name?: string
  version?: string
  description?: string
  main?: string
  module?: string
  bin?: Record<string, string> | string
  scripts?: Record<string, string>
  dependencies?: Record<string, string>
  devDependencies?: Record<string, string>
  peerDependencies?: Record<string, string>
  private?: boolean
  workspaces?: string[] | { packages: string[] }
  type?: string
}

/** The central data structure. Built once, queried by all analyzers. */
export interface RepositoryIndex {
  metadata: RepoMetadata
  fileTree: FileNode[]                              // hierarchical tree
  allFiles: FileNode[]                              // flat list of all files

  /** file absolutePath → list of absolutePaths it imports */
  importGraph: Record<string, string[]>

  /** file absolutePath → list of absolutePaths that import it (in-degree) */
  importedBy: Record<string, string[]>

  /** file absolutePath → exported symbols */
  symbolTable: Record<string, ExportedSymbol[]>

  languages: Record<string, { fileCount: number; lineCount: number }>

  configFiles: {
    packageJson?: PackageJson
    goMod?: string
    cargoToml?: string
    requirementsTxt?: string
    pyprojectToml?: string
    dockerfile?: string
    dockerCompose?: string
    ciWorkflows?: Record<string, string>
  }

  entryPointCandidates: string[]   // absolutePaths of likely entry files
  totalFiles: number
  totalLines: number
}

// ─────────────────────────────────────────────────────────────────────────────
// Analyzer result types
// ─────────────────────────────────────────────────────────────────────────────

export interface EntryPointSignal {
  name: string
  description: string
  file: string
}

export interface EntryPointResult {
  primaryFile: string
  confidence: 'high' | 'medium' | 'low'
  signalsFired: EntryPointSignal[]
  alternates: string[]
  preview?: string   // first 60 lines of the entry file
}

export type ProjectCategory =
  | 'Frontend'
  | 'Backend'
  | 'Full-Stack'
  | 'CLI Tool'
  | 'Library / SDK'
  | 'Mobile'
  | 'Data / ML'
  | 'DevOps / Infra'
  | 'Monorepo'
  | 'Unknown'

export interface LanguageBreakdown {
  language: string
  percentage: number
  fileCount: number
  lineCount: number
  color: string
}

export interface ProjectTypeResult {
  primaryType: ProjectCategory
  subType: string
  framework: string
  secondaryTypes: string[]
  languages: LanguageBreakdown[]
  depCount: { prod: number; dev: number }
  confidence: 'high' | 'medium' | 'low'
}

export interface BusinessLogicFile {
  path: string
  score: number
  importCentrality: number
  symbolExportDepth: number
  outboundCallDiversity: number
  exportedSymbolCount: number
  astComplexity: number
  exports: ExportedSymbol[]
}

export interface BusinessLogicModule {
  directory: string
  label: string
  files: BusinessLogicFile[]
  totalScore: number
  moduleType: 'orchestrator' | 'service' | 'model' | 'utility' | 'mixed'
}

export interface RankedFile {
  path: string
  rank: number
  score: number           // 0–100
  importCentrality: number
  distanceFromEntry: number
  businessLogicScore: number
  exportedSymbolCount: number
  fileSize: number
  extension: string
}

export interface FileRankingResult {
  rankedFiles: RankedFile[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Repository Tour types
// ─────────────────────────────────────────────────────────────────────────────

export interface GraphNode {
  id: string
  label: string
  group: string
  score: number
  x?: number
  y?: number
}

export interface GraphLink {
  source: string
  target: string
}

export interface TourOverviewData {
  metadata: RepoMetadata
  projectType: ProjectTypeResult
  stats: { files: number; lines: number; languages: number }
}

export interface TourStop {
  id: number
  title: string
  subtitle: string
  type:
    | 'overview'
    | 'entry-point'
    | 'structure'
    | 'business-logic'
    | 'dependencies'
    | 'relationships'
    | 'config'
    | 'how-to-run'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data: any
}

// ─────────────────────────────────────────────────────────────────────────────
// SSE event types (stream from /api/stream)
// ─────────────────────────────────────────────────────────────────────────────

export type SSEStageEvent = {
  type: 'stage'
  stage: string
  progress: number
  detail?: string
}

export type SSEFeatureEvent =
  | { type: 'feature'; feature: 'entryPoint'; result: EntryPointResult }
  | { type: 'feature'; feature: 'projectType'; result: ProjectTypeResult }
  | { type: 'feature'; feature: 'businessLogic'; result: { modules: BusinessLogicModule[] } }
  | { type: 'feature'; feature: 'fileRanking'; result: FileRankingResult }
  | { type: 'feature'; feature: 'tour'; result: { stops: TourStop[] } }

export type SSEAiSummaryEvent = {
  type: 'ai_summary'
  stopId: number
  key: string
  summary: string
}

export type SSEErrorEvent = { type: 'error'; message: string }
export type SSEDoneEvent  = { type: 'done'; totalTime: number }

export type SSEEvent =
  | SSEStageEvent
  | SSEFeatureEvent
  | SSEAiSummaryEvent
  | SSEErrorEvent
  | SSEDoneEvent

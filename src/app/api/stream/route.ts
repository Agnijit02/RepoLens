import { cloneRepo } from '@/lib/git'
import { buildRepositoryIndex } from '@/lib/index/builder'
import { analyzeEntryPoint }    from '@/lib/analyzers/entryPoint'
import { analyzeProjectType }   from '@/lib/analyzers/projectType'
import { analyzeBusinessLogic } from '@/lib/analyzers/businessLogic'
import { analyzeFileRanking }   from '@/lib/analyzers/fileRanking'
import { generateTour }         from '@/lib/analyzers/tourGenerator'
import {
  summarizeEntryPoint,
  summarizeModule,
  describeDependency,
  summarizeRepo,
  readReadme,
} from '@/lib/ai/summarizer'
import type { SSEEvent } from '@/lib/types'

export const runtime    = 'nodejs'
export const dynamic    = 'force-dynamic'
export const maxDuration = 300   // 5-min limit (Vercel Pro / local dev unlimited)

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const url = searchParams.get('url')?.trim()

  if (!url) {
    return new Response('Missing ?url= parameter', { status: 400 })
  }

  const encoder = new TextEncoder()
  const startTime = Date.now()

  const stream = new ReadableStream({
    async start(controller) {

      function send(event: SSEEvent) {
        const line = `data: ${JSON.stringify(event)}\n\n`
        try { controller.enqueue(encoder.encode(line)) } catch { /* client disconnected */ }
      }

      try {
        console.log(`\n=== [RepoLens] Starting Analysis for: ${url} ===`);

        // ── 1. Clone ─────────────────────────────────────────────────────────
        send({ type: 'stage', stage: 'cloning', progress: 2, detail: 'Connecting to repository…' })
        console.log(`[1/5] Cloning repository...`);

        const localPath = await cloneRepo(url, (msg) => {
          console.log(`[Clone Progress]: ${msg}`);
          send({ type: 'stage', stage: 'cloning', progress: 5, detail: msg })
        })

        send({ type: 'stage', stage: 'cloning', progress: 10, detail: 'Clone complete ✓' })
        console.log(`[1/5] Cloned to local path: ${localPath}`);

        // ── 2. Build Repository Index ─────────────────────────────────────────
        send({ type: 'stage', stage: 'indexing', progress: 12, detail: 'Building Repository Index…' })
        console.log(`[2/5] Building Repository Index...`);

        const index = await buildRepositoryIndex(localPath, url, (p) => {
          console.log(`[Index Progress]: ${p.stage} - ${p.progress}% - ${p.detail || ''}`);
          send({ type: 'stage', stage: p.stage, progress: p.progress, detail: p.detail })
        })

        send({ type: 'stage', stage: 'indexing', progress: 100, detail: 'Repository Index built ✓' })
        console.log(`[2/5] Repository Index successfully built. Total files: ${index.totalFiles}, Total lines: ${index.totalLines}`);

        // ── 3. Run analyzers in parallel ──────────────────────────────────────
        send({ type: 'stage', stage: 'analyzing', progress: 0, detail: 'Running analyzers…' })
        console.log(`[3/5] Running core static analyzers...`);

        // Entry Point
        const entryPoint = analyzeEntryPoint(index)
        send({ type: 'feature', feature: 'entryPoint', result: entryPoint })
        console.log(`- Entry point detected: ${entryPoint.primaryFile || 'none'} (${entryPoint.confidence} confidence)`);

        // Project Type
        const projectType = analyzeProjectType(index)
        send({ type: 'feature', feature: 'projectType', result: projectType })
        console.log(`- Project type: ${projectType.primaryType} / ${projectType.framework || 'no framework'}`);

        // Business Logic
        const blResult = analyzeBusinessLogic(index)
        send({ type: 'feature', feature: 'businessLogic', result: blResult })
        console.log(`- Business logic modules: ${blResult.modules.length} modules found`);

        // File Ranking (uses BL results)
        const blFiles = blResult.modules.flatMap(m => m.files)
        const rankingResult = analyzeFileRanking(index, entryPoint.primaryFile, blFiles)
        send({ type: 'feature', feature: 'fileRanking', result: rankingResult })
        console.log(`- File ranking complete. Top file: ${rankingResult.rankedFiles[0]?.path || 'none'}`);

        // Repository Tour
        const tourStops = generateTour(index, entryPoint, projectType, blResult, rankingResult)
        send({ type: 'feature', feature: 'tour', result: { stops: tourStops } })
        console.log(`- Repository Tour generated with ${tourStops.length} stops`);

        send({ type: 'stage', stage: 'analyzing', progress: 100, detail: 'Analysis complete ✓' })
        console.log(`[3/5] All static analyzers completed.`);

        // ── 4. Gemini AI enrichment (non-blocking, best-effort) ───────────────
        if (process.env.GEMINI_API_KEY) {
          send({ type: 'stage', stage: 'ai', progress: 0, detail: 'Running AI summaries…' })
          console.log(`[4/5] Starting Gemini AI enrichment (${1 + blResult.modules.slice(0, 3).length + Object.keys(index.configFiles.packageJson?.dependencies ?? {}).slice(0, 5).length} calls in parallel)...`);

          const aiTasks: Promise<void>[] = []

          // Entry point summary
          aiTasks.push(
            summarizeEntryPoint(entryPoint).then((epSummary) => {
              if (epSummary) {
                console.log(`- Gemini: entry point summary complete`);
                send({ type: 'ai_summary', stopId: 2, key: 'entryPoint', summary: epSummary })
              }
            })
          )

          // Top 3 logic module summaries
          blResult.modules.slice(0, 3).forEach((mod) => {
            aiTasks.push(
              summarizeModule(mod).then((summary) => {
                if (summary) {
                  console.log(`- Gemini: business logic summary complete for "${mod.directory}"`);
                  send({ type: 'ai_summary', stopId: 4, key: mod.directory, summary })
                }
              })
            )
          })

          // Top 5 dependency descriptions
          const deps = Object.entries(index.configFiles.packageJson?.dependencies ?? {}).slice(0, 5)
          deps.forEach(([name, version]) => {
            aiTasks.push(
              describeDependency(name, String(version)).then((desc) => {
                if (desc) {
                  console.log(`- Gemini: dependency description complete for "${name}"`);
                  send({ type: 'ai_summary', stopId: 5, key: name, summary: desc })
                }
              })
            )
          })

          // Repo-level summary
          const projDesc = `${projectType.primaryType} / ${projectType.framework}`
          const epDesc = entryPoint.primaryFile ? `Entry file is ${entryPoint.primaryFile}` : 'Unknown'
          const blDesc = blResult.modules.slice(0, 3).map(m => m.label).join(', ')
          const topDeps = Object.keys(index.configFiles.packageJson?.dependencies ?? {}).slice(0, 10).join(', ')

          // Read README and gather key filenames for better AI understanding
          const readmeContent = readReadme(localPath)
          const keyFiles = index.allFiles
            .filter(f => f.type === 'file')
            .slice(0, 40)
            .map(f => f.path.replace(/\\/g, '/').split('/').slice(-2).join('/'))
            .join(', ')

          aiTasks.push(
            summarizeRepo(url, projDesc, epDesc, blDesc, topDeps, readmeContent, keyFiles).then((summary) => {
              if (summary) {
                console.log(`- Gemini: repo summary complete`);
                send({ type: 'ai_summary', stopId: 0, key: 'repo_summary', summary })
              }
            })
          )

          // Wait for all AI tasks to complete in parallel
          await Promise.all(aiTasks)

          send({ type: 'stage', stage: 'ai', progress: 100, detail: 'AI summaries complete ✓' })
          console.log(`[4/5] Gemini AI enrichment complete.`);
        } else {
          console.log(`[4/5] Skipping Gemini AI enrichment (GEMINI_API_KEY is not set).`);
        }

        // ── 5. Done ───────────────────────────────────────────────────────────
        const totalTime = Date.now() - startTime;
        send({ type: 'done', totalTime })
        console.log(`[5/5] Analysis completed successfully in ${(totalTime / 1000).toFixed(2)}s.\n`);

      } catch (err) {
        console.error('[stream] Error during analysis pipeline:', err)
        send({
          type: 'error',
          message: err instanceof Error ? err.message : String(err),
        })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',   // disable nginx buffering
    },
  })
}

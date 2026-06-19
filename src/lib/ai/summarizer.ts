import * as fs from 'fs'
import type { BusinessLogicModule, EntryPointResult } from '../types'

// ─── Provider config ─────────────────────────────────────────────────────────
const GEMINI_MODEL = 'gemini-2.5-flash'
const GROQ_MODEL   = 'llama-3.3-70b-versatile'
const TIMEOUT_MS   = 30000

// ─── Lazy-loaded clients ─────────────────────────────────────────────────────
let geminiClient: any = null
let groqClient: any   = null

async function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) return null
  if (geminiClient) return geminiClient
  try {
    const { GoogleGenAI } = await import('@google/genai')
    geminiClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    return geminiClient
  } catch {
    return null
  }
}

async function getGroqClient() {
  if (!process.env.GROQ_API_KEY) return null
  if (groqClient) return groqClient
  try {
    const Groq = (await import('groq-sdk')).default
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
    return groqClient
  } catch {
    return null
  }
}

// ─── Gemini call ─────────────────────────────────────────────────────────────
async function callGemini(prompt: string): Promise<string> {
  const client = await getGeminiClient()
  if (!client) return ''

  let timeoutId: NodeJS.Timeout | undefined
  const timeoutPromise = new Promise<string>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Gemini Error] Request timed out after ${TIMEOUT_MS}ms`)
      resolve('')
    }, TIMEOUT_MS)
  })

  const apiPromise = (async () => {
    try {
      const result = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      })
      return result.text ? result.text.trim() : ''
    } catch (err: any) {
      const msg = err?.message || String(err)
      console.warn(`[Gemini Error] ${msg}`)
      return ''
    }
  })()

  try {
    const result = await Promise.race([apiPromise, timeoutPromise])
    if (timeoutId) clearTimeout(timeoutId)
    return result
  } catch {
    if (timeoutId) clearTimeout(timeoutId)
    return ''
  }
}

// ─── Groq call ───────────────────────────────────────────────────────────────
async function callGroq(prompt: string): Promise<string> {
  const client = await getGroqClient()
  if (!client) return ''

  let timeoutId: NodeJS.Timeout | undefined
  const timeoutPromise = new Promise<string>((resolve) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Groq Error] Request timed out after ${TIMEOUT_MS}ms`)
      resolve('')
    }, TIMEOUT_MS)
  })

  const apiPromise = (async () => {
    try {
      const chatCompletion = await client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model: GROQ_MODEL,
        temperature: 0.3,
        max_tokens: 300,
      })
      return chatCompletion.choices?.[0]?.message?.content?.trim() ?? ''
    } catch (err: any) {
      const msg = err?.message || String(err)
      console.warn(`[Groq Error] ${msg}`)
      return ''
    }
  })()

  try {
    const result = await Promise.race([apiPromise, timeoutPromise])
    if (timeoutId) clearTimeout(timeoutId)
    return result
  } catch {
    if (timeoutId) clearTimeout(timeoutId)
    return ''
  }
}

// ─── Unified call: Gemini first → Groq fallback ─────────────────────────────
async function callAI(prompt: string): Promise<string> {
  const hasGemini = !!process.env.GEMINI_API_KEY
  const hasGroq   = !!process.env.GROQ_API_KEY

  if (!hasGemini && !hasGroq) {
    console.warn('[AI] No API keys configured (GEMINI_API_KEY / GROQ_API_KEY)')
    return ''
  }

  // Try Gemini first
  if (hasGemini) {
    const geminiResult = await callGemini(prompt)
    if (geminiResult) return geminiResult
    console.log('[AI] Gemini failed or returned empty, falling back to Groq...')
  }

  // Fallback to Groq
  if (hasGroq) {
    const groqResult = await callGroq(prompt)
    if (groqResult) return groqResult
  }

  console.warn('[AI] All providers failed for this prompt')
  return ''
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Summarise what the entry point file does in 2–3 sentences */
export async function summarizeEntryPoint(result: EntryPointResult): Promise<string> {
  if (!result.preview) return ''
  const prompt = `You are a senior software engineer reviewing a codebase.
Analyse the following source file which is the detected entry point of the repository.
Write a concise 2-3 sentence summary explaining what this file does and why it's the starting point.
Be specific and technical. Do NOT mention the filename itself.

\`\`\`
${result.preview.slice(0, 1500)}
\`\`\`

Summary:`
  return callAI(prompt)
}

/** Summarise what a business logic module does in 1–2 sentences */
export async function summarizeModule(mod: BusinessLogicModule): Promise<string> {
  const symbolList = mod.files
    .flatMap(f => f.exports.slice(0, 5).map(e => `${e.kind} ${e.name}`))
    .slice(0, 20)
    .join(', ')

  const fileList = mod.files
    .slice(0, 6)
    .map(f => {
      const parts = f.path.split('/')
      return parts[parts.length - 1]
    })
    .join(', ')

  if (!symbolList && !fileList) return ''

  const prompt = `You are a senior software engineer reviewing a codebase.
The following files form a logic module in the repository (directory: "${mod.label}").
Files: ${fileList}
Key exported symbols: ${symbolList}

Write a concise 1-2 sentence summary describing what domain or business capability this module handles.
Be specific. Use terms like "handles", "manages", "provides", "implements". Do NOT say "this module".

Summary:`
  return callAI(prompt)
}

/** Describe a npm / PyPI dependency in one line */
export async function describeDependency(name: string, version: string): Promise<string> {
  const prompt = `What does the npm package "${name}" (${version}) do? Answer in exactly one sentence, max 15 words.`
  return callAI(prompt)
}

/** Summarise the overall repository with structured output */
export async function summarizeRepo(
  url: string,
  projectType: string,
  entryPointDesc: string,
  topModulesDesc: string,
  topDeps: string,
  readmeContent?: string,
  fileList?: string,
): Promise<string> {
  // Extract repo name from URL for analysis
  const repoNameMatch = url.match(/\/([^/]+?)(\.git)?$/)
  const repoName = repoNameMatch?.[1] ?? ''

  const readmeSection = readmeContent
    ? `\nREADME.md Content (first 2000 chars):\n${readmeContent.slice(0, 2000)}\n`
    : '\nREADME.md: Not found.\n'

  const fileListSection = fileList
    ? `\nKey File Names (for context):\n${fileList}\n`
    : ''

  const prompt = `You are a senior software engineer analyzing a real-world codebase. Your goal is to understand EXACTLY what this application does — its actual domain, purpose, and functionality. You must respond ONLY in valid JSON format — no markdown, no code fences, no extra text.

Repository URL: ${url}
Repository Name: "${repoName}"
Project Type: ${projectType}
Key Dependencies: ${topDeps}
Core Logic Modules: ${topModulesDesc}
Entry Point Context: ${entryPointDesc}
${readmeSection}${fileListSection}

CRITICAL INSTRUCTIONS:
1. The repository name is a HUGE hint. Parse it: "OnTwoWheelz" → bike/motorcycle platform, "ShopEase" → shopping app, "ChatFlow" → messaging app, etc.
2. Read the README carefully — it usually says exactly what the project is.
3. DO NOT give generic answers like "portfolio" or "showcase skills". Tell me what the actual PRODUCT does.
4. For DSA/algorithm repositories: list the specific algorithms and data structures implemented (e.g., "Binary Search, BFS, DFS, Dynamic Programming, Merge Sort").
5. For utility/library repos: describe what the library provides.
6. Be SPECIFIC. "A bike enthusiast community platform" is good. "A web application" is bad.

Respond with this exact JSON format:
{
  "appCategory": "<one of: E-Commerce, Social Media, SaaS Platform, Developer Tool, Portfolio/Blog, CMS, Dashboard/Admin, Chat/Messaging, Streaming Platform, Fintech, Healthcare, Education, Gaming, API Service, Data Analytics, Automation, IoT, AI/ML Tool, Mobile App, CLI Tool, Library/Framework, DSA/Algorithms, Community Platform, Marketplace, Booking Platform, Food/Delivery, Fitness/Health, Travel, Real Estate, News/Media, Other>",
  "whatItDoes": "<1 clear sentence about what this specific app does. e.g., 'A motorcycle and biking community platform where riders can share routes, reviews, and connect with fellow bikers' or 'A collection of 50+ Data Structures & Algorithms implementations including BFS, DFS, Dijkstra, and Dynamic Programming patterns'>",
  "techStack": ["<list the actual technologies detected from dependencies and code, e.g. Next.js, React, MongoDB, Tailwind CSS. Max 8 items>"],
  "corePurpose": "<2-3 sentences explaining WHY this was built and what problem it solves. Be domain-specific. If it's a DSA repo, mention which topics it covers. If it's a platform, describe the user experience.>"
}

IMPORTANT: Output ONLY the JSON object. No explanation, no markdown fences.`
  return callAI(prompt)
}

/** Read up to N lines from a file safely */
export function readPreview(absolutePath: string, lines = 60): string {
  try {
    const content = fs.readFileSync(absolutePath, 'utf-8')
    return content.split('\n').slice(0, lines).join('\n')
  } catch {
    return ''
  }
}

/** Read the README file from a repo directory */
export function readReadme(repoPath: string): string {
  const candidates = ['README.md', 'readme.md', 'Readme.md', 'README.MD', 'README', 'README.txt', 'README.rst']
  for (const name of candidates) {
    const fullPath = `${repoPath}/${name}`
    try {
      const content = fs.readFileSync(fullPath, 'utf-8')
      if (content.trim()) return content
    } catch {
      // Try next candidate
    }
  }
  return ''
}


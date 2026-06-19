import type { RepositoryIndex, ProjectTypeResult, ProjectCategory, LanguageBreakdown } from '../types'

const LANGUAGE_COLORS: Record<string, string> = {
  TypeScript:  '#3178c6',
  JavaScript:  '#f1e05a',
  Python:      '#3572A5',
  Go:          '#00ADD8',
  Rust:        '#dea584',
  Java:        '#b07219',
  Ruby:        '#701516',
  'C#':        '#178600',
  'C++':       '#f34b7d',
  C:           '#555555',
  PHP:         '#4F5D95',
  Swift:       '#ffac45',
  Kotlin:      '#A97BFF',
  Scala:       '#c22d40',
  HTML:        '#e34c26',
  CSS:         '#563d7c',
  Shell:       '#89e051',
  SQL:         '#e38c00',
}

/**
 * Detect the project type and framework from the Repository Index.
 * Uses a priority-ordered detection matrix across 9 categories.
 */
export function analyzeProjectType(index: RepositoryIndex): ProjectTypeResult {
  const pkg = index.configFiles.packageJson
  const allDeps = { ...(pkg?.dependencies ?? {}), ...(pkg?.devDependencies ?? {}) }

  const dep  = (n: string) => n in allDeps
  const prod = (n: string) => n in (pkg?.dependencies ?? {})

  const filePaths = index.allFiles.map(f => f.path.toLowerCase())
  const hasFile   = (re: RegExp) => filePaths.some(p => re.test(p))

  let primaryType: ProjectCategory = 'Unknown'
  let framework   = ''
  let subType     = ''
  const secondary: string[] = []

  // ── Monorepo signals (cross-cutting) ─────────────────────────────────────
  if (
    hasFile(/^turbo\.json$/) || hasFile(/^nx\.json$/) ||
    hasFile(/^lerna\.json$/) || pkg?.workspaces
  ) {
    secondary.push('Monorepo')
    if (hasFile(/^turbo\.json$/)) secondary.push('Turborepo')
    else if (hasFile(/^nx\.json$/)) secondary.push('Nx')
    else if (hasFile(/^lerna\.json$/)) secondary.push('Lerna')
    else if (pkg?.workspaces) secondary.push('npm workspaces')
  }

  // ── Full-Stack frameworks (before individual Frontend/Backend) ────────────
  if (dep('next')) {
    primaryType = 'Full-Stack'; framework = 'Next.js'; subType = 'Next.js'
  } else if (dep('nuxt') || dep('@nuxt/core')) {
    primaryType = 'Full-Stack'; framework = 'Nuxt.js'; subType = 'Nuxt.js'
  } else if (dep('@sveltejs/kit')) {
    primaryType = 'Full-Stack'; framework = 'SvelteKit'; subType = 'SvelteKit'
  } else if (dep('@remix-run/react') || dep('@remix-run/node')) {
    primaryType = 'Full-Stack'; framework = 'Remix'; subType = 'Remix'
  }

  // ── Mobile ───────────────────────────────────────────────────────────────
  else if (dep('expo') || dep('@expo/cli')) {
    primaryType = 'Mobile'; framework = 'Expo'; subType = 'React Native / Expo'
  } else if (dep('react-native')) {
    primaryType = 'Mobile'; framework = 'React Native'; subType = 'React Native'
  } else if (hasFile(/pubspec\.yaml$/)) {
    primaryType = 'Mobile'; framework = 'Flutter'; subType = 'Flutter / Dart'
  }

  // ── Frontend ─────────────────────────────────────────────────────────────
  else if (dep('react') || dep('react-dom')) {
    primaryType = 'Frontend'; framework = 'React'
    if (dep('vite')) subType = 'React + Vite'
    else if (dep('@craco/craco') || dep('react-scripts')) subType = 'Create React App'
    else subType = 'React'
  } else if (dep('vue')) {
    primaryType = 'Frontend'; framework = 'Vue.js'
    subType = dep('vite') ? 'Vue 3 + Vite' : 'Vue.js'
  } else if (dep('@angular/core')) {
    primaryType = 'Frontend'; framework = 'Angular'; subType = 'Angular'
  } else if (dep('svelte')) {
    primaryType = 'Frontend'; framework = 'Svelte'; subType = 'Svelte + Vite'
  } else if (dep('@solidjs/core') || dep('solid-js')) {
    primaryType = 'Frontend'; framework = 'Solid.js'; subType = 'Solid.js'
  }

  // ── Backend — Node.js ─────────────────────────────────────────────────────
  else if (dep('@nestjs/core')) {
    primaryType = 'Backend'; framework = 'NestJS'; subType = 'NestJS'
  } else if (dep('express')) {
    primaryType = 'Backend'; framework = 'Express'; subType = 'Express.js'
  } else if (dep('fastify')) {
    primaryType = 'Backend'; framework = 'Fastify'; subType = 'Fastify'
  } else if (dep('koa')) {
    primaryType = 'Backend'; framework = 'Koa'; subType = 'Koa.js'
  } else if (dep('@hapi/hapi')) {
    primaryType = 'Backend'; framework = 'Hapi'; subType = 'Hapi.js'
  } else if (dep('hono')) {
    primaryType = 'Backend'; framework = 'Hono'; subType = 'Hono'
  }

  // ── Backend — Python ──────────────────────────────────────────────────────
  else if (index.configFiles.requirementsTxt || index.configFiles.pyprojectToml) {
    const reqs = (index.configFiles.requirementsTxt ?? '') +
                 (index.configFiles.pyprojectToml ?? '')
    if (/fastapi/i.test(reqs))          { primaryType = 'Backend'; framework = 'FastAPI';  subType = 'Python / FastAPI' }
    else if (/django/i.test(reqs))      { primaryType = 'Backend'; framework = 'Django';   subType = 'Python / Django' }
    else if (/flask/i.test(reqs))       { primaryType = 'Backend'; framework = 'Flask';    subType = 'Python / Flask' }
    else if (/starlette/i.test(reqs))   { primaryType = 'Backend'; framework = 'Starlette'; subType = 'Python / Starlette' }
    else if (/torch|tensorflow|sklearn|scikit/i.test(reqs)) {
      primaryType = 'Data / ML'
      framework = /torch/i.test(reqs) ? 'PyTorch' : /tensorflow/i.test(reqs) ? 'TensorFlow' : 'scikit-learn'
      subType = 'Python ML'
    } else {
      primaryType = 'Backend'; framework = 'Python'; subType = 'Python'
    }
  }

  // ── Backend — Go ──────────────────────────────────────────────────────────
  else if (index.configFiles.goMod) {
    primaryType = 'Backend'
    const mod = index.configFiles.goMod
    if (/gin-gonic\/gin/i.test(mod))      { framework = 'Gin';           subType = 'Go / Gin' }
    else if (/gorilla\/mux/i.test(mod))   { framework = 'Gorilla Mux';   subType = 'Go / Gorilla Mux' }
    else if (/labstack\/echo/i.test(mod)) { framework = 'Echo';          subType = 'Go / Echo' }
    else if (/fiber/i.test(mod))          { framework = 'Fiber';         subType = 'Go / Fiber' }
    else                                  { framework = 'Go';             subType = 'Go' }
  }

  // ── Backend — Rust ────────────────────────────────────────────────────────
  else if (index.configFiles.cargoToml) {
    primaryType = 'Backend'
    const toml = index.configFiles.cargoToml
    if (/actix-web/i.test(toml))  { framework = 'Actix Web'; subType = 'Rust / Actix Web' }
    else if (/axum/i.test(toml))  { framework = 'Axum';      subType = 'Rust / Axum' }
    else if (/rocket/i.test(toml)){ framework = 'Rocket';    subType = 'Rust / Rocket' }
    else                          { framework = 'Rust';       subType = 'Rust' }
  }

  // ── DevOps / Infra ────────────────────────────────────────────────────────
  else if (hasFile(/\.tf$/) || hasFile(/chart\.yaml$/i) || hasFile(/playbooks?\//)) {
    primaryType = 'DevOps / Infra'
    if (hasFile(/\.tf$/))              { framework = 'Terraform'; subType = 'Terraform' }
    else if (hasFile(/chart\.yaml$/i)) { framework = 'Helm';      subType = 'Helm Chart' }
    else                               { framework = 'Ansible';   subType = 'Ansible' }
  }

  // ── Data / ML (Jupyter) ───────────────────────────────────────────────────
  else if (hasFile(/\.ipynb$/)) {
    primaryType = 'Data / ML'; framework = 'Jupyter'; subType = 'Jupyter Notebooks'
  }

  // ── Secondary: CLI ────────────────────────────────────────────────────────
  if (pkg?.bin) {
    if (primaryType === 'Unknown') { primaryType = 'CLI Tool'; framework = 'Node CLI' }
    secondary.push('CLI Tool')
  }

  // ── Secondary: Library ────────────────────────────────────────────────────
  if (pkg && pkg.private === false && !pkg.scripts?.start && !pkg.scripts?.dev) {
    if (primaryType === 'Unknown') primaryType = 'Library / SDK'
    secondary.push('Library / SDK')
  }

  // ── TypeScript badge ──────────────────────────────────────────────────────
  if (dep('typescript') || 'typescript' in (pkg?.devDependencies ?? {})) {
    secondary.push('TypeScript')
  }

  // ── Language breakdown ────────────────────────────────────────────────────
  const totalLines = Object.values(index.languages).reduce((s, v) => s + v.lineCount, 0)
  const languages: LanguageBreakdown[] = Object.entries(index.languages)
    .filter(([, v]) => v.lineCount > 0)
    .sort(([, a], [, b]) => b.lineCount - a.lineCount)
    .slice(0, 8)
    .map(([lang, v]) => ({
      language:   lang,
      percentage: Math.round((v.lineCount / Math.max(1, totalLines)) * 100),
      fileCount:  v.fileCount,
      lineCount:  v.lineCount,
      color:      LANGUAGE_COLORS[lang] ?? '#8b949e',
    }))

  const depCount = {
    prod: Object.keys(pkg?.dependencies   ?? {}).length,
    dev:  Object.keys(pkg?.devDependencies ?? {}).length,
  }

  return {
    primaryType,
    subType:        subType || framework,
    framework,
    secondaryTypes: [...new Set(secondary)],
    languages,
    depCount,
    confidence:     primaryType !== 'Unknown' ? 'high' : 'low',
  }
}

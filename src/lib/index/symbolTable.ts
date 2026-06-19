import * as fs from 'fs'
import type { FileNode, ExportedSymbol } from '../types'

/**
 * Build a symbol table: for each file, the list of exported symbols.
 * Currently handles TypeScript / JavaScript via regex.
 * Python / Go stubs can be added when tree-sitter is integrated in Phase 5.
 */
export function buildSymbolTable(
  allFiles: FileNode[]
): Record<string, ExportedSymbol[]> {
  const table: Record<string, ExportedSymbol[]> = {}

  for (const file of allFiles) {
    if (!['.ts', '.tsx', '.js', '.jsx', '.mjs'].includes(file.extension)) {
      table[file.absolutePath] = []
      continue
    }
    if (file.size > 500_000) {
      table[file.absolutePath] = []
      continue
    }

    let content: string
    try {
      content = fs.readFileSync(file.absolutePath, 'utf-8')
    } catch {
      table[file.absolutePath] = []
      continue
    }

    table[file.absolutePath] = extractExports(content)
  }

  return table
}

function extractExports(content: string): ExportedSymbol[] {
  const symbols: ExportedSymbol[] = []
  const lines = content.split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trimStart()
    const lineNum = i + 1

    // export default function/class Name
    const defFnCls = line.match(/^export\s+default\s+(async\s+)?(function|class)\s+(\w+)/)
    if (defFnCls) {
      symbols.push({
        name: defFnCls[3],
        kind: defFnCls[2] as 'function' | 'class',
        isDefault: true,
        line: lineNum,
      })
      continue
    }

    // export default <anything else>
    if (/^export\s+default\s+/.test(line) && !line.includes('{')) {
      symbols.push({ name: 'default', kind: 'variable', isDefault: true, line: lineNum })
      continue
    }

    // export async function / function / class / interface / type / enum / const / let / var
    const named = line.match(
      /^export\s+(?:declare\s+)?(?:async\s+)?(function|class|abstract\s+class|interface|type|enum|const|let|var)\s+(\w+)/
    )
    if (named) {
      const rawKind = named[1].replace('abstract ', '')
      const kindMap: Record<string, ExportedSymbol['kind']> = {
        function: 'function', class: 'class', interface: 'interface',
        type: 'type', enum: 'enum', const: 'variable', let: 'variable', var: 'variable',
      }
      symbols.push({
        name: named[2],
        kind: kindMap[rawKind] ?? 'variable',
        isDefault: false,
        line: lineNum,
      })
      continue
    }

    // export { foo, bar as Baz }
    const namedExports = line.match(/^export\s+\{([^}]+)\}(?:\s+from\s+['"][^'"]+['"])?/)
    if (namedExports) {
      const parts = namedExports[1].split(',').map(s => s.trim())
      for (const part of parts) {
        // "foo as Bar" → exported as "Bar"
        const asMatch = part.match(/\w+\s+as\s+(\w+)/)
        const name = asMatch ? asMatch[1] : part.split(/\s+/)[0]
        if (name && name !== '') {
          symbols.push({ name, kind: 'variable', isDefault: false, line: lineNum })
        }
      }
    }
  }

  return symbols
}

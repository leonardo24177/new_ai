'use client'

import { useState } from 'react'

interface UserFile {
  id: string
  nome: string
  mime_type: string
  dimensione: number
  created_at: string
  storage_path: string
  ambito: string | null
}

interface TreeNode {
  name: string
  path: string
  type: 'folder' | 'file'
  children: TreeNode[]
  file?: UserFile
}

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes}B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`
}

function getFileIcon(mime: string, name: string) {
  const ext = name.split('.').pop()?.toLowerCase()
  if (mime === 'application/pdf') return '📄'
  if (mime.includes('word')) return '📝'
  if (mime.includes('sheet')) return '📊'
  if (mime.includes('presentation')) return '📑'
  if (mime.startsWith('image/')) return '🖼️'
  if (['ts', 'tsx', 'js', 'jsx'].includes(ext || '')) return '📘'
  if (['py'].includes(ext || '')) return '🐍'
  if (['json', 'yaml', 'yml', 'toml'].includes(ext || '')) return '⚙️'
  if (['md', 'mdx'].includes(ext || '')) return '📋'
  if (['css', 'scss', 'sass'].includes(ext || '')) return '🎨'
  if (['html'].includes(ext || '')) return '🌐'
  if (mime.startsWith('text/') || mime === 'application/json') return '📝'
  return '📎'
}

// Costruisce l'albero a partire dalla lista di file
function buildTree(files: UserFile[]): TreeNode[] {
  const root: TreeNode[] = []
  const nodeMap: Record<string, TreeNode> = {}

  for (const file of files) {
    const parts = file.nome.replace(/\\/g, '/').split('/')
    let current = root
    let currentPath = ''

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      currentPath = currentPath ? `${currentPath}/${part}` : part
      const isLast = i === parts.length - 1

      if (isLast) {
        // Foglia — file
        const node: TreeNode = {
          name: part,
          path: currentPath,
          type: 'file',
          children: [],
          file,
        }
        current.push(node)
      } else {
        // Nodo intermedio — cartella
        if (!nodeMap[currentPath]) {
          const folderNode: TreeNode = {
            name: part,
            path: currentPath,
            type: 'folder',
            children: [],
          }
          nodeMap[currentPath] = folderNode
          current.push(folderNode)
        }
        current = nodeMap[currentPath].children
      }
    }
  }

  // Ordina: cartelle prima, poi file, entrambi alfabetici
  function sortNodes(nodes: TreeNode[]) {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    for (const node of nodes) {
      if (node.type === 'folder') sortNodes(node.children)
    }
  }
  sortNodes(root)

  return root
}

interface FileTreeNodeProps {
  node: TreeNode
  depth: number
  onDelete: (fileId: string, storagePath: string) => void
}

function FileTreeNode({ node, depth, onDelete }: FileTreeNodeProps) {
  const [open, setOpen] = useState(depth < 2) // Apre automaticamente i primi 2 livelli

  if (node.type === 'file' && node.file) {
    const f = node.file
    return (
      <div
        className="flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-gray-50 group"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="text-sm flex-shrink-0">{getFileIcon(f.mime_type, f.nome)}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 truncate">{node.name}</p>
          <p className="text-xs text-gray-400">{formatSize(f.dimensione)}</p>
        </div>
        <button
          onClick={() => onDelete(f.id, f.storage_path)}
          className="text-gray-400 active:text-red-500 transition-colors p-1 flex-shrink-0"
        >
          🗑
        </button>
      </div>
    )
  }

  // Cartella
  return (
    <div>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 py-1.5 px-2 rounded-xl hover:bg-gray-50 transition-colors"
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        <span className="text-sm flex-shrink-0 transition-transform duration-150" style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)' }}>
          ▶
        </span>
        <span className="text-sm flex-shrink-0">{open ? '📂' : '📁'}</span>
        <span className="text-sm font-medium text-gray-700 truncate">{node.name}</span>
        <span className="text-xs text-gray-400 ml-auto flex-shrink-0">{node.children.length}</span>
      </button>

      {open && (
        <div>
          {node.children.map(child => (
            <FileTreeNode
              key={child.path}
              node={child}
              depth={depth + 1}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

interface FileTreeProps {
  files: UserFile[]
  onDelete: (fileId: string, storagePath: string) => void
}

export default function FileTree({ files, onDelete }: FileTreeProps) {
  // Se tutti i file sono piatti (nessuna slash nel nome), usa lista normale
  const hasTree = files.some(f => f.nome.includes('/') || f.nome.includes('\\'))

  if (!hasTree) {
    return (
      <div className="space-y-2">
        {files.map(f => (
          <div key={f.id} className="bg-white rounded-2xl border border-gray-200 px-4 py-3.5 flex items-center gap-3">
            <span className="text-xl">{getFileIcon(f.mime_type, f.nome)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{f.nome}</p>
              <p className="text-xs text-gray-400">{formatSize(f.dimensione)}</p>
            </div>
            <button onClick={() => onDelete(f.id, f.storage_path)}
              className="text-gray-300 active:text-red-500 transition-colors text-lg p-1">🗑</button>
          </div>
        ))}
      </div>
    )
  }

  const tree = buildTree(files)

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-2">
      {tree.map(node => (
        <FileTreeNode
          key={node.path}
          node={node}
          depth={0}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

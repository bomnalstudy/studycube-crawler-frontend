'use client'

import { useCallback, useRef, DragEvent } from 'react'
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  useReactFlow,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TriggerNode } from './nodes/TriggerNode'
import { DateRangeNode } from './nodes/DateRangeNode'
import { SegmentNode } from './nodes/SegmentNode'
import { ConditionNode } from './nodes/ConditionNode'
import { MessageNode } from './nodes/MessageNode'
import { PointNode } from './nodes/PointNode'
import { BlockPalette, type BlockDefinition } from './BlockPalette'
import './FlowCanvas.css'

// 노드 타입 등록
const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  dateRange: DateRangeNode,
  segment: SegmentNode,
  condition: ConditionNode,
  message: MessageNode,
  point: PointNode,
}

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#A78BFA', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#A78BFA' },
}

interface FlowCanvasProps {
  onNodesChange?: (nodes: Node[]) => void
  onEdgesChange?: (edges: Edge[]) => void
}

function FlowCanvasInner({ onNodesChange: onNodesChangeProp, onEdgesChange: onEdgesChangeProp }: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])

  // 노드 삭제 함수
  const deleteNode = useCallback((nodeId: string) => {
    setNodes(nds => nds.filter(n => n.id !== nodeId))
    setEdges(eds => eds.filter(e => e.source !== nodeId && e.target !== nodeId))
  }, [setNodes, setEdges])

  // 외부로 노드/엣지 변경 전달
  const handleNodesChange: typeof onNodesChange = useCallback((changes) => {
    onNodesChange(changes)
    setNodes(nds => {
      onNodesChangeProp?.(nds)
      return nds
    })
  }, [onNodesChange, setNodes, onNodesChangeProp])

  const handleEdgesChange: typeof onEdgesChange = useCallback((changes) => {
    onEdgesChange(changes)
    setEdges(eds => {
      onEdgesChangeProp?.(eds)
      return eds
    })
  }, [onEdgesChange, setEdges, onEdgesChangeProp])

  // 노드 연결
  const onConnect = useCallback(
    (connection: Connection) => {
      setEdges(eds => addEdge(connection, eds))
    },
    [setEdges]
  )

  // 드래그 앤 드롭 핸들러
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault()

      const jsonData = event.dataTransfer.getData('application/json')
      if (!jsonData) return

      try {
        const block: BlockDefinition = JSON.parse(jsonData)

        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        })

        // 세그먼트 프리셋인 경우: 조건 블록들로 확장
        if (block.category === 'segment' && block.presetBlocks && block.presetBlocks.length > 0) {
          const newNodes: Node[] = []
          const newEdges: Edge[] = []
          let offsetX = 0

          block.presetBlocks.forEach((preset, index) => {
            const nodeId = `${preset.nodeType}-${Date.now()}-${index}`
            newNodes.push({
              id: nodeId,
              type: preset.nodeType,
              position: { x: position.x + offsetX, y: position.y },
              data: { ...preset.nodeData, onDelete: () => deleteNode(nodeId) },
            })

            // 이전 노드와 연결
            if (index > 0) {
              const prevNodeId = newNodes[index - 1].id
              newEdges.push({
                id: `e-${prevNodeId}-${nodeId}`,
                source: prevNodeId,
                target: nodeId,
              })
            }

            offsetX += 180
          })

          setNodes(nds => nds.concat(newNodes))
          setEdges(eds => eds.concat(newEdges))
        } else {
          // 일반 블록: 단일 노드 생성
          const id = `${block.nodeType}-${Date.now()}`
          const newNode: Node = {
            id,
            type: block.nodeType,
            position,
            data: { ...block.nodeData, onDelete: () => deleteNode(id) },
          }
          setNodes(nds => nds.concat(newNode))
        }
      } catch {
        console.error('Failed to parse block data')
      }
    },
    [screenToFlowPosition, setNodes, setEdges, deleteNode]
  )

  return (
    <div className="flow-editor-wrapper">
      <div className="flow-canvas-container" ref={reactFlowWrapper}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={onConnect}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          fitView
          fitViewOptions={{ padding: 0.5 }}
          minZoom={0.3}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          snapToGrid
          snapGrid={[15, 15]}
          deleteKeyCode={['Backspace', 'Delete']}
        >
          <Background color="#E5E7EB" gap={15} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <BlockPalette />
    </div>
  )
}

export function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  )
}

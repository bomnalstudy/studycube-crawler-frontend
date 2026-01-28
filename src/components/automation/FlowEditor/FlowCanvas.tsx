'use client'

import { useCallback, useMemo } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Connection,
  type Node,
  type Edge,
  type NodeTypes,
  MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { TriggerNode } from './nodes/TriggerNode'
import { FilterNode } from './nodes/FilterNode'
import { MessageNode } from './nodes/MessageNode'
import { PointNode } from './nodes/PointNode'
import { FlowType, TriggerConfig, FilterConfig, PointConfig } from '@/types/automation'
import './FlowCanvas.css'

interface FlowCanvasProps {
  flowType: FlowType
  triggerConfig: TriggerConfig
  filterConfig: FilterConfig
  messageTemplate: string
  pointConfig: PointConfig
  onTriggerChange: (config: TriggerConfig) => void
  onFilterChange: (config: FilterConfig) => void
  onMessageChange: (template: string) => void
  onPointChange: (config: PointConfig) => void
}

const nodeTypes: NodeTypes = {
  trigger: TriggerNode,
  filter: FilterNode,
  message: MessageNode,
  point: PointNode,
}

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: '#A78BFA', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: '#A78BFA' },
}

export function FlowCanvas({
  flowType,
  triggerConfig,
  filterConfig,
  messageTemplate,
  pointConfig,
  onTriggerChange,
  onFilterChange,
  onMessageChange,
  onPointChange,
}: FlowCanvasProps) {
  const showMessage = flowType === 'SMS' || flowType === 'SMS_POINT'
  const showPoint = flowType === 'POINT' || flowType === 'SMS_POINT'

  const initialNodes = useMemo(() => {
    const nodes: Node[] = [
      {
        id: 'trigger',
        type: 'trigger',
        position: { x: 250, y: 0 },
        data: { config: triggerConfig, onChange: onTriggerChange },
      },
      {
        id: 'filter',
        type: 'filter',
        position: { x: 250, y: 220 },
        data: { config: filterConfig, onChange: onFilterChange },
      },
    ]

    let nextY = 560

    if (showMessage) {
      nodes.push({
        id: 'message',
        type: 'message',
        position: { x: 250, y: nextY },
        data: { template: messageTemplate, onChange: onMessageChange },
      })
      nextY += 320
    }

    if (showPoint) {
      nodes.push({
        id: 'point',
        type: 'point',
        position: { x: 250, y: nextY },
        data: { config: pointConfig, onChange: onPointChange },
      })
    }

    return nodes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const initialEdges = useMemo(() => {
    const edges: Edge[] = [
      { id: 'e-trigger-filter', source: 'trigger', target: 'filter' },
    ]

    if (showMessage) {
      edges.push({ id: 'e-filter-message', source: 'filter', target: 'message' })
      if (showPoint) {
        edges.push({ id: 'e-message-point', source: 'message', target: 'point' })
      }
    } else if (showPoint) {
      edges.push({ id: 'e-filter-point', source: 'filter', target: 'point' })
    }

    return edges
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  const onConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
    [setEdges]
  )

  // 노드 data가 변경될 때 동기화
  const updateNodeData = useCallback(
    (nodeId: string, newData: Record<string, unknown>) => {
      setNodes(nds => nds.map(n => n.id === nodeId ? { ...n, data: { ...n.data, ...newData } } : n))
    },
    [setNodes]
  )

  // config 변경 시 노드 data도 업데이트
  const handleTriggerChange = useCallback((config: TriggerConfig) => {
    onTriggerChange(config)
    updateNodeData('trigger', { config, onChange: handleTriggerChange })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onTriggerChange, updateNodeData])

  const handleFilterChange = useCallback((config: FilterConfig) => {
    onFilterChange(config)
    updateNodeData('filter', { config, onChange: handleFilterChange })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onFilterChange, updateNodeData])

  const handleMessageChange = useCallback((template: string) => {
    onMessageChange(template)
    updateNodeData('message', { template, onChange: handleMessageChange })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onMessageChange, updateNodeData])

  const handlePointChange = useCallback((config: PointConfig) => {
    onPointChange(config)
    updateNodeData('point', { config, onChange: handlePointChange })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onPointChange, updateNodeData])

  // 초기 data에 래핑된 onChange 주입
  useMemo(() => {
    setNodes(nds => nds.map(n => {
      if (n.id === 'trigger') return { ...n, data: { ...n.data, onChange: handleTriggerChange } }
      if (n.id === 'filter') return { ...n, data: { ...n.data, onChange: handleFilterChange } }
      if (n.id === 'message') return { ...n, data: { ...n.data, onChange: handleMessageChange } }
      if (n.id === 'point') return { ...n, data: { ...n.data, onChange: handlePointChange } }
      return n
    }))
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handleTriggerChange, handleFilterChange, handleMessageChange, handlePointChange])

  return (
    <div className="flow-canvas-container">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        minZoom={0.3}
        maxZoom={1.5}
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#E5E7EB" gap={20} />
        <Controls showInteractive={false} />
      </ReactFlow>
    </div>
  )
}

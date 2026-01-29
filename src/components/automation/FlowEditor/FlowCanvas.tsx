'use client'

import { useCallback, useEffect, useRef } from 'react'
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

function buildNodes(
  flowType: FlowType,
  triggerConfig: TriggerConfig,
  filterConfig: FilterConfig,
  messageTemplate: string,
  pointConfig: PointConfig,
  handlers: {
    onTriggerChange: (config: TriggerConfig) => void
    onFilterChange: (config: FilterConfig) => void
    onMessageChange: (template: string) => void
    onPointChange: (config: PointConfig) => void
  }
): Node[] {
  const showMessage = flowType === 'SMS' || flowType === 'SMS_POINT'
  const showPoint = flowType === 'POINT' || flowType === 'SMS_POINT'

  const nodes: Node[] = [
    {
      id: 'trigger',
      type: 'trigger',
      position: { x: 250, y: 0 },
      data: { config: triggerConfig, onChange: handlers.onTriggerChange },
    },
    {
      id: 'filter',
      type: 'filter',
      position: { x: 250, y: 220 },
      data: { config: filterConfig, onChange: handlers.onFilterChange },
    },
  ]

  let nextY = 560

  if (showMessage) {
    nodes.push({
      id: 'message',
      type: 'message',
      position: { x: 250, y: nextY },
      data: { template: messageTemplate, onChange: handlers.onMessageChange },
    })
    nextY += 320
  }

  if (showPoint) {
    nodes.push({
      id: 'point',
      type: 'point',
      position: { x: 250, y: nextY },
      data: { config: pointConfig, onChange: handlers.onPointChange },
    })
  }

  return nodes
}

function buildEdges(flowType: FlowType): Edge[] {
  const showMessage = flowType === 'SMS' || flowType === 'SMS_POINT'
  const showPoint = flowType === 'POINT' || flowType === 'SMS_POINT'

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
  // handlers를 ref로 관리하여 불필요한 리렌더링 방지
  const handlersRef = useRef({
    onTriggerChange,
    onFilterChange,
    onMessageChange,
    onPointChange,
  })

  // handlers 업데이트
  useEffect(() => {
    handlersRef.current = {
      onTriggerChange,
      onFilterChange,
      onMessageChange,
      onPointChange,
    }
  }, [onTriggerChange, onFilterChange, onMessageChange, onPointChange])

  // 안정적인 콜백 함수들
  const stableOnTriggerChange = useCallback((config: TriggerConfig) => {
    handlersRef.current.onTriggerChange(config)
  }, [])

  const stableOnFilterChange = useCallback((config: FilterConfig) => {
    handlersRef.current.onFilterChange(config)
  }, [])

  const stableOnMessageChange = useCallback((template: string) => {
    handlersRef.current.onMessageChange(template)
  }, [])

  const stableOnPointChange = useCallback((config: PointConfig) => {
    handlersRef.current.onPointChange(config)
  }, [])

  const stableHandlers = {
    onTriggerChange: stableOnTriggerChange,
    onFilterChange: stableOnFilterChange,
    onMessageChange: stableOnMessageChange,
    onPointChange: stableOnPointChange,
  }

  // 초기 노드/엣지 생성
  const initialNodes = buildNodes(
    flowType,
    triggerConfig,
    filterConfig,
    messageTemplate,
    pointConfig,
    stableHandlers
  )
  const initialEdges = buildEdges(flowType)

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // flowType 변경 시 노드/엣지 재구성
  const prevFlowTypeRef = useRef(flowType)
  useEffect(() => {
    if (prevFlowTypeRef.current !== flowType) {
      prevFlowTypeRef.current = flowType
      setNodes(buildNodes(
        flowType,
        triggerConfig,
        filterConfig,
        messageTemplate,
        pointConfig,
        stableHandlers
      ))
      setEdges(buildEdges(flowType))
    }
  }, [flowType, triggerConfig, filterConfig, messageTemplate, pointConfig, setNodes, setEdges, stableHandlers])

  // config 변경 시 노드 data만 업데이트 (position 유지)
  useEffect(() => {
    setNodes(nds => nds.map(n => {
      if (n.id === 'trigger') {
        return { ...n, data: { config: triggerConfig, onChange: stableOnTriggerChange } }
      }
      if (n.id === 'filter') {
        return { ...n, data: { config: filterConfig, onChange: stableOnFilterChange } }
      }
      if (n.id === 'message') {
        return { ...n, data: { template: messageTemplate, onChange: stableOnMessageChange } }
      }
      if (n.id === 'point') {
        return { ...n, data: { config: pointConfig, onChange: stableOnPointChange } }
      }
      return n
    }))
  }, [triggerConfig, filterConfig, messageTemplate, pointConfig, setNodes, stableOnTriggerChange, stableOnFilterChange, stableOnMessageChange, stableOnPointChange])

  const onConnect = useCallback(
    (connection: Connection) => setEdges(eds => addEdge(connection, eds)),
    [setEdges]
  )

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

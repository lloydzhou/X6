import React from 'react'
import { Graph, Cell, Node } from '@antv/x6'
import { connectors } from '../connector/xmind-definitions'
import Hierarchy from '@antv/hierarchy'
import { Selection } from '@antv/x6-plugin-selection'
import { Keyboard } from '@antv/x6-plugin-keyboard'

import { useGraphState } from 'x6-hooks/react'
import { useEffect, useCallback, useState, useMemo, useRef } from 'react'

import '../index.less'
import './mind.less'

// 中心主题或分支主题
Graph.registerNode(
  'topic',
  {
    inherit: 'rect',
    markup: [
      {
        tagName: 'rect',
        selector: 'body',
      },
      {
        tagName: 'image',
        selector: 'img',
      },
      {
        tagName: 'text',
        selector: 'label',
      },
    ],
    attrs: {
      body: {
        rx: 6,
        ry: 6,
        stroke: '#5F95FF',
        fill: '#EFF4FF',
        strokeWidth: 1,
      },
      img: {
        ref: 'body',
        refX: '100%',
        refY: '50%',
        refY2: -8,
        width: 16,
        height: 16,
        'xlink:href':
          'https://gw.alipayobjects.com/mdn/rms_43231b/afts/img/A*SYCuQ6HHs5cAAAAAAAAAAAAAARQnAQ',
        event: 'add:topic',
      },
      label: {
        fontSize: 14,
        fill: '#262626',
      },
    },
  },
  true,
)

// 子主题
Graph.registerNode(
  'topic-child',
  {
    inherit: 'rect',
    markup: [
      {
        tagName: 'rect',
        selector: 'body',
      },
      {
        tagName: 'text',
        selector: 'label',
      },
      {
        tagName: 'path',
        selector: 'line',
      },
    ],
    attrs: {
      body: {
        fill: '#ffffff',
        strokeWidth: 0,
        stroke: '#5F95FF',
      },
      label: {
        fontSize: 14,
        fill: '#262626',
        textVerticalAnchor: 'bottom',
      },
      line: {
        stroke: '#5F95FF',
        strokeWidth: 2,
        d: 'M 0 15 L 60 15',
      },
    },
  },
  true,
)

Graph.registerEdge(
  'mindmap-edge',
  {
    inherit: 'edge',
    connector: {
      name: connectors.branch,
    },
    attrs: {
      line: {
        targetMarker: '',
        stroke: '#A2B1C3',
        strokeWidth: 2,
      },
    },
    zIndex: 0,
  },
  true,
)

type NodeType = 'topic' | 'topic-branch' | 'topic-child'

interface MindMapData {
  id: string
  type: NodeType
  label: string
  width: number
  height: number
  children?: MindMapData[]
}

interface HierarchyResult {
  id: string
  x: number
  y: number
  data: MindMapData
  children?: HierarchyResult[]
}

const data: MindMapData = {
  id: '1',
  type: 'topic',
  label: '中心主题',
  width: 160,
  height: 50,
  children: [
    {
      id: '1-1',
      type: 'topic-branch',
      label: '分支主题1',
      width: 100,
      height: 40,
      children: [
        {
          id: '1-1-1',
          type: 'topic-child',
          label: '子主题1',
          width: 60,
          height: 30,
        },
        {
          id: '1-1-2',
          type: 'topic-child',
          label: '子主题2',
          width: 60,
          height: 30,
        },
      ],
    },
    {
      id: '1-2',
      type: 'topic-branch',
      label: '分支主题2',
      width: 100,
      height: 40,
    },
  ],
}

export default function App() {
  const { nodes, edges, setNodes, setEdges, graph, setGraph } = useGraphState()
  const [state, setState] = useState(data)

  const container = useRef()
  const selection = new Selection({
    enabled: true,
  })
  const keyboard = new Keyboard({
    enabled: true,
  })
  useEffect(() => {
    const graph = new Graph({
      container: container.current,
      width: 800,
      height: 600,
      grid: true,
      interacting: {
        nodeMovable: false,
      },
      connecting: {
        connectionPoint: 'anchor',
      },
    })
    graph.use(selection)
    graph.use(keyboard)
    setGraph(graph)
  }, [setGraph])

  const result = useMemo(() => {
    return Hierarchy.mindmap(state, {
      direction: 'H',
      getHeight(d) {
        return d.height
      },
      getWidth(d) {
        return d.width
      },
      getHGap() {
        return 40
      },
      getVGap() {
        return 20
      },
      getSide: () => {
        return 'right'
      },
    })
  }, [state])
  const idMap = useMemo(() => {
    const index = (idMap, item) => {
      idMap[item.id] = item
      if (item.children) {
        return item.children.reduce(index, idMap)
      }
      return idMap
    }
    return [state].reduce(index, {})
  }, [state])

  useEffect(() => {
    const traverse = (res, item) => {
      res.nodes.push({
        ...item.data,
        shape: item.data.type === 'topic-child' ? 'topic-child' : 'topic',
        x: item.x,
        y: item.y,
        children: undefined,
      })
      if (res.parent) {
        res.edges.push({
          id: `${res.parent}:${item.data.id}`,
          shape: 'mindmap-edge',
          source: {
            cell: res.parent,
            anchor:
              item.data.type === 'topic-child'
                ? {
                    name: 'right',
                    args: {
                      dx: -16,
                    },
                  }
                : {
                    name: 'center',
                    args: {
                      dx: '25%',
                    },
                  },
          },
          target: {
            cell: item.data.id,
            anchor: {
              name: 'left',
            },
          },
        })
      }
      if (item.children) {
        const parent = res.parent
        res.parent = item.data.id
        const r = item.children.reduce(traverse, res)
        res.parent = parent
        return r
      }
      return res
    }
    const res = [result].reduce(traverse, { nodes: [], edges: [], parent: '' })
    setNodes(res.nodes)
    setEdges(res.edges)
    setTimeout(() => {
      if (graph.current) {
        graph.current.centerContent()
      }
    }, 100)
  }, [result])

  const addTopic = useCallback(
    ({ node }) => {
      const { id, type } = node.getProp()
      const item = idMap[id]
      if (item) {
        const children = item.children || []
        let nid = `${id}-${children.length + 1}`
        if (idMap[nid]) {
          console.log('duplicate id', nid)
          nid = nid + Math.random()
        }
        item.children = children.concat({
          // id: `${id}-${children.length + 1}`,
          id: nid,
          type: type === 'topic' ? 'topic-branch' : 'topic-child',
          label: `${type === 'topic' ? '分支主题' : '子主题'}${
            children.length + 1
          }`,
          width: type === 'topic' ? 100 : 60,
          height: type === 'topic' ? 40 : 30,
        })
        setState({ ...state }) //
      }
    },
    [state, idMap],
  )

  const removeTopic = useCallback(
    ({ node }) => {
      const { id } = node.getProp()
      const parentId = id.split('-').slice(0, -1).join('-')
      const parentItem = idMap[parentId]
      if (parentItem && parentItem.children) {
        // remove node and children item
        parentItem.children = parentItem.children.filter((i) => i.id !== id)
        setState({ ...state }) // trigger react render
      }
    },
    [state],
  )

  useEffect(() => {
    const add = () => {
      const selection = graph.current.getPlugin('selection')
      const selectedNodes = selection
        .getSelectedCells()
        .filter((item) => item.isNode())
      if (selectedNodes.length) {
        addTopic({ node: selectedNodes[0] })
      }
    }
    const remove = () => {
      const selection = graph.current.getPlugin('selection')
      const selectedNodes = selection
        .getSelectedCells()
        .filter((item) => item.isNode())
      if (selectedNodes.length) {
        removeTopic({ node: selectedNodes[0] })
      }
    }
    if (graph.current) {
      graph.current.on('add:topic', addTopic)
      const keyboard = graph.current.getPlugin('keyboard')
      keyboard.bindKey('tab', add)
      keyboard.bindKey(['backspace', 'delete'], remove)
    }
    return () => {
      if (graph.current) {
        graph.current.off('add:topic', addTopic)
        const keyboard = graph.current.getPlugin('keyboard')
        keyboard.unbindKey('tab', add)
        keyboard.unbindKey(['backspace', 'delete'], remove)
      }
    }
  }, [graph.current, addTopic, removeTopic])
  return (
    <div className="x6-graph-wrap mindmap">
      <div ref={container} className="x6-graph" />
    </div>
  )
}

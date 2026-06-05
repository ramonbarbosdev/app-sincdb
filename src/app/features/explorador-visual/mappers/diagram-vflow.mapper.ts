import { createEdges, createNodes } from 'ngx-vflow';
import {
  DiagramEdge,
  DiagramNode,
  DiagramResponse,
  ModoVisualizacao,
  VflowNodeData,
} from '../models/explorador-visual.model';

export interface VflowDiagram {
  nodes: any[];
  edges: any[];
}

export function mapDiagramToVflow(
  response: DiagramResponse,
  modo: ModoVisualizacao,
  focusedNodeId?: string
): VflowDiagram {
  const visibleNodes = filtrarNodes(response.nodes || [], response.edges || [], modo, focusedNodeId);
  const visibleIds = new Set(visibleNodes.map((node) => node.id));
  const visibleEdges = (response.edges || []).filter(
    (edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)
  );

  return {
    nodes: createNodes(
      visibleNodes.map((node, index) => {
        const column = index % 3;
        const row = Math.floor(index / 3);
        return {
          id: node.id,
          type: 'html-template',
          point: { x: 80 + column * 320, y: 90 + row * 230 },
          width: 250,
          height: 160,
          data: { node } satisfies VflowNodeData,
        };
      })
    ),
    edges: createEdges(
      visibleEdges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        curve: 'smooth-step',
        edgeLabels: edge.label
          ? {
              center: {
                type: 'html-template',
                data: edge,
              },
            }
          : undefined,
      }))
    ),
  };
}

function filtrarNodes(
  nodes: DiagramNode[],
  edges: DiagramEdge[],
  modo: ModoVisualizacao,
  focusedNodeId?: string
): DiagramNode[] {
  if (modo === 'apenas_diferencas') {
    return nodes.filter((node) => node.status !== 'igual' || node.totalDiferencas > 0);
  }

  if (modo === 'tabela_focada' && focusedNodeId) {
    const relacionados = new Set<string>([focusedNodeId]);
    edges.forEach((edge) => {
      if (edge.source === focusedNodeId) {
        relacionados.add(edge.target);
      }
      if (edge.target === focusedNodeId) {
        relacionados.add(edge.source);
      }
    });
    return nodes.filter((node) => relacionados.has(node.id));
  }

  return nodes;
}

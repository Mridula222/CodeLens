import { useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Handle,
  Position,
  MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

function FileNode({ data }) {
  return (
    <div className={`dependency-graph-node ${data.kind}`}>
      <Handle type="target" position={Position.Top} />

      <div className="graph-node-icon">
        {data.kind === "entry" ? "APP" : "JS"}
      </div>

      <div className="graph-node-text">
        <strong>{data.label}</strong>
        <span>{data.kind === "entry" ? "Entry point" : "Source file"}</span>
      </div>

      <Handle type="source" position={Position.Bottom} />
    </div>
  );
}

const nodeTypes = {
  fileNode: FileNode,
};

export default function DependencyGraph({ dependencies }) {
  const { nodes, edges } = useMemo(() => {
    const connections = dependencies?.edges ?? [];
    const fileNames = new Set();

    connections.forEach((edge) => {
      fileNames.add(edge.source);
      fileNames.add(edge.target);
    });

    const files = [...fileNames];
    const outgoing = new Map();

    connections.forEach((edge) => {
      if (!outgoing.has(edge.source)) {
        outgoing.set(edge.source, []);
      }
      outgoing.get(edge.source).push(edge.target);
    });

    const levels = new Map();
    const queue = [];

    connections.forEach((edge) => {
      if (!connections.some((item) => item.target === edge.source)) {
        if (!levels.has(edge.source)) {
          levels.set(edge.source, 0);
          queue.push(edge.source);
        }
      }
    });

    while (queue.length > 0) {
      const current = queue.shift();

      for (const target of outgoing.get(current) ?? []) {
        const nextLevel = levels.get(current) + 1;

        if (!levels.has(target) || levels.get(target) < nextLevel) {
          levels.set(target, nextLevel);
          queue.push(target);
        }
      }
    }

    files.forEach((file) => {
      if (!levels.has(file)) levels.set(file, 0);
    });

    const grouped = new Map();

    files.forEach((file) => {
      const level = levels.get(file) ?? 0;
      if (!grouped.has(level)) grouped.set(level, []);
      grouped.get(level).push(file);
    });

    const positions = new Map();

    [...grouped.entries()]
      .sort((a, b) => a[0] - b[0])
      .forEach(([level, names]) => {
        names.forEach((name, index) => {
          positions.set(name, {
            x: 60 + index * 260,
            y: 50 + level * 150,
          });
        });
      });

    const incoming = new Set(connections.map((edge) => edge.target));

    const graphNodes = files.map((file) => ({
      id: file,
      type: "fileNode",
      position: positions.get(file),
      data: {
        label: file,
        kind: incoming.has(file) ? "file" : "entry",
      },
    }));

    const graphEdges = connections.map((edge, index) => ({
      id: `${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.import,
      type: "smoothstep",
      animated: true,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: "#8984ff",
      },
      style: {
        stroke: "#8984ff",
        strokeWidth: 1.6,
      },
      labelStyle: {
        fill: "#aeb4cc",
        fontSize: 10,
      },
      labelBgStyle: {
        fill: "#171923",
      },
    }));

    return { nodes: graphNodes, edges: graphEdges };
  }, [dependencies]);

  if (nodes.length === 0) {
    return (
      <div className="dependency-graph-empty">
        No local file connections are available to visualize.
      </div>
    );
  }

  return (
    <div className="dependency-graph-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.2}
        maxZoom={2}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background color="#34394a" gap={20} />
        <Controls />

        <MiniMap
          nodeColor={(node) =>
            node.data?.kind === "entry" ? "#7774f8" : "#2796a5"
          }
          maskColor="rgba(10, 12, 20, 0.65)"
          style={{
            backgroundColor: "#171923",
            border: "1px solid #34394a",
          }}
          nodeStrokeColor="#8984ff"
          nodeBorderRadius={4}
          bgColor="#171923"
          maskStrokeColor="#7774f8"
        />
      </ReactFlow>
    </div>
  );
}

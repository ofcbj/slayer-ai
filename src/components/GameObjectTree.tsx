import { useState } from 'react';
import { Box, Chip } from '@mui/material';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem } from '@mui/x-tree-view/TreeItem';
import { GameObjectNode } from '../game/utils/SceneInspector';

interface GameObjectTreeProps {
  node: GameObjectNode | null;
  onNodeSelect?: (node: GameObjectNode) => void;
}

/**
 * 게임 오브젝트를 트리 형태로 표시하는 컴포넌트
 */
export function GameObjectTree({ node, onNodeSelect }: GameObjectTreeProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string>('');

  if (!node) {
    return (
      <Box sx={{ p: 2, color: 'text.secondary' }}>
        No scene data available
      </Box>
    );
  }

  const renderTree = (nodeData: GameObjectNode): JSX.Element => (
    <TreeItem
      key={nodeData.id}
      itemId={nodeData.id}
      label={
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5 }}>
          <Chip
            label={nodeData.type}
            size="small"
            color={getTypeColor(nodeData.type)}
            sx={{ height: 20, fontSize: '0.7rem' }}
          />
          <span style={{ fontWeight: nodeData.type === 'Scene' ? 'bold' : 'normal' }}>
            {nodeData.name || nodeData.id}
          </span>
          {nodeData.children && nodeData.children.length > 0 && (
            <Chip
              label={nodeData.children.length}
              size="small"
              variant="outlined"
              sx={{ height: 18, fontSize: '0.65rem' }}
            />
          )}
        </Box>
      }
    >
      {nodeData.children?.map((child) => renderTree(child))}
    </TreeItem>
  );

  return (
    <SimpleTreeView
      aria-label="game object tree"
      selectedItems={selectedNodeId}
      onSelectedItemsChange={(_event, nodeId) => {
        const newNodeId = typeof nodeId === 'string' ? nodeId : '';
        setSelectedNodeId(newNodeId);
        const selectedNode = findNodeById(node, newNodeId);
        if (selectedNode && onNodeSelect) {
          onNodeSelect(selectedNode);
        }
      }}
      sx={{
        flexGrow: 1,
        overflowY: 'auto',
        '& .MuiTreeItem-content': {
          py: 0.5,
        },
      }}
    >
      {renderTree(node)}
    </SimpleTreeView>
  );
}

/**
 * 노드 ID로 트리에서 노드 찾기
 */
function findNodeById(node: GameObjectNode, id: string): GameObjectNode | null {
  if (node.id === id) return node;

  if (node.children) {
    for (const child of node.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }

  return null;
}

/**
 * 오브젝트 타입에 따라 색상 반환
 */
function getTypeColor(type: string): 'primary' | 'secondary' | 'success' | 'error' | 'warning' | 'info' {
  switch (type) {
    case 'Scene':
      return 'primary';
    case 'Container':
      return 'secondary';
    case 'Text':
      return 'info';
    case 'Sprite':
    case 'Image':
      return 'success';
    case 'Graphics':
    case 'Rectangle':
    case 'Arc':
      return 'warning';
    default:
      return 'secondary';
  }
}

import { useState, useEffect } from 'react';
import { Box, Drawer, IconButton, Divider, Typography, Button, Toolbar, AppBar } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import { GameObjectTree } from './GameObjectTree';
import { PropertyPanel } from './PropertyPanel';
import { GameObjectNode, SceneInspector } from '../game/utils/SceneInspector';
import { ObjectHighlighter } from '../game/utils/ObjectHighlighter';
import EventBus from '../game/EventBus';

interface GameObjectInspectorProps {
  open: boolean;
  onClose: () => void;
}

const DRAWER_WIDTH = 800;

/**
 * 게임 오브젝트 인스펙터 메인 컴포넌트
 */
export function GameObjectInspector({ open, onClose }: GameObjectInspectorProps) {
  const [sceneData, setSceneData]       = useState<GameObjectNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GameObjectNode | null>(null);
  const [currentScene, setCurrentScene] = useState<Phaser.Scene | null>(null);

  // Scene 변경 감지
  useEffect(() => {
    const handleSceneReady = (scene: Phaser.Scene) => {
      setCurrentScene(scene);
      refreshSceneData(scene);
      // 하이라이터 초기화
      ObjectHighlighter.initialize(scene);
    };

    EventBus.on('current-scene-ready', handleSceneReady);

    return () => {
      EventBus.off('current-scene-ready', handleSceneReady);
      ObjectHighlighter.destroy();
    };
  }, []);

  // 선택한 노드가 변경되면 하이라이트
  useEffect(() => {
    if (selectedNode && selectedNode.gameObject) {
      ObjectHighlighter.highlight(selectedNode.gameObject);
    } else {
      ObjectHighlighter.clear();
    }
  }, [selectedNode]);

  // 인스펙터가 닫힐 때 하이라이트 제거
  useEffect(() => {
    if (!open) {
      ObjectHighlighter.clear();
    }
  }, [open]);

  const refreshSceneData = (scene?: Phaser.Scene) => {
    const targetScene = scene || currentScene;
    if (targetScene) {
      const data = SceneInspector.inspectScene(targetScene);
      setSceneData(data);
      setSelectedNode(null);
      ObjectHighlighter.clear();
    }
  };

  const handleNodeSelect = (node: GameObjectNode) => {
    setSelectedNode(node);
  };

  // ============ UI 컴포넌트 함수들 ============

  /**
   * 헤더 - 타이틀 바와 제어 버튼
   */
  const renderHeader = () => (
    <AppBar position="static" color="primary" elevation={0}>
      <Toolbar>
        <BugReportIcon sx={{ mr: 1 }} />
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          Game Object Inspector
        </Typography>
        <IconButton
          color="inherit"
          onClick={() => refreshSceneData()}
          title="Refresh"
          sx={{ mr: 1 }}
        >
          <RefreshIcon />
        </IconButton>
        <IconButton color="inherit" onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Toolbar>
    </AppBar>
  );

  /**
   * 씬 정보 - 현재 씬 이름과 새로고침 버튼
   */
  const renderSceneInfo = () => {
    if (!currentScene) return null;

    return (
      <Box sx={{ p: 2, backgroundColor: 'background.paper' }}>
        <Typography variant="subtitle2" color="text.secondary">
          Current Scene
        </Typography>
        <Typography variant="h6">{currentScene.scene.key}</Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Button
            size="small"
            variant="outlined"
            onClick={() => refreshSceneData()}
            startIcon={<RefreshIcon />}
          >
            Refresh Data
          </Button>
        </Box>
      </Box>
    );
  };

  /**
   * 메인 컨텐츠 - 게임 오브젝트 트리와 프로퍼티 패널
   */
  const renderMainContent = () => (
    <Box
      sx={{
        display: 'flex',
        flexGrow: 1,
        height: 'calc(100vh - 200px)',
        overflow: 'hidden',
      }}
    >
      {/* Left Panel - Tree */}
      <Box
        sx={{
          width: '50%',
          borderRight: 1,
          borderColor: 'divider',
          overflow: 'auto',
          p: 1,
        }}
      >
        <Typography variant="subtitle2" sx={{ px: 1, py: 0.5, fontWeight: 'bold' }}>
          Game Objects
        </Typography>
        <GameObjectTree node={sceneData} onNodeSelect={handleNodeSelect} />
      </Box>

      {/* Right Panel - Properties */}
      <Box
        sx={{
          width: '50%',
          overflow: 'auto',
          p: 2,
        }}
      >
        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold' }}>
          Properties
        </Typography>
        <PropertyPanel node={selectedNode} />
      </Box>
    </Box>
  );

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          backgroundColor: 'background.default',
        },
      }}
    >
      {renderHeader()}
      {renderSceneInfo()}
      <Divider />
      {renderMainContent()}
    </Drawer>
  );
}

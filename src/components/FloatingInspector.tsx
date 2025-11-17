import { useState, useEffect, useRef } from 'react';
import Draggable from 'react-draggable';
import {
  Box,
  IconButton,
  Divider,
  Typography,
  Button,
  AppBar,
  Toolbar,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import MinimizeIcon from '@mui/icons-material/Minimize';
import MaximizeIcon from '@mui/icons-material/Maximize';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import ListIcon from '@mui/icons-material/List';
import EventNoteIcon from '@mui/icons-material/EventNote';
import TerminalIcon from '@mui/icons-material/Terminal';
import { GameObjectTree } from './GameObjectTree';
import { PropertyPanel } from './PropertyPanel';
import { EventLogger } from './EventLogger';
import { ConsoleCommand } from './ConsoleCommand';
import { GameObjectNode, SceneInspector } from '../game/utils/SceneInspector';
import { ObjectHighlighter } from '../game/utils/ObjectHighlighter';
import EventBus from '../game/EventBus';

interface FloatingInspectorProps {
  open: boolean;
  onClose: () => void;
}

/**
 * 드래그 가능한 플로팅 인스펙터 패널
 */
export function FloatingInspector({ open, onClose }: FloatingInspectorProps) {
  const [sceneData, setSceneData] = useState<GameObjectNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GameObjectNode | null>(null);
  const [currentScene, setCurrentScene] = useState<Phaser.Scene | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [size, setSize] = useState({ width: 900, height: 700 });
  const [isResizing, setIsResizing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const resizeRef = useRef<HTMLDivElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

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

  // 인스펙터가 열릴 때 게임 입력 비활성화
  useEffect(() => {
    if (currentScene && currentScene.input) {
      if (open) {
        // 인스펙터가 열리면 게임 입력 비활성화
        currentScene.input.enabled = false;
      } else {
        // 인스펙터가 닫히면 게임 입력 활성화
        currentScene.input.enabled = true;
      }
    }
  }, [open, currentScene]);

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

  // 리사이즈 핸들러
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (resizeRef.current) {
        const rect = resizeRef.current.getBoundingClientRect();
        const newWidth = e.clientX - rect.left;
        const newHeight = e.clientY - rect.top;

        setSize({
          width: Math.max(600, Math.min(newWidth, window.innerWidth - 100)),
          height: Math.max(400, Math.min(newHeight, window.innerHeight - 100)),
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

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

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!open) return null;

  return (
    <Draggable handle=".drag-handle" bounds="parent" nodeRef={nodeRef}>
      <Paper
        ref={(node) => {
          (resizeRef as any).current = node;
          (nodeRef as any).current = node;
        }}
        elevation={8}
        sx={{
          position: 'fixed',
          top: 100,
          right: 100,
          width: size.width,
          height: isMinimized ? 'auto' : size.height,
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: 'background.default',
          overflow: 'hidden',
          border: '2px solid',
          borderColor: 'primary.main',
          borderRadius: 2,
          pointerEvents: 'auto', // 인스펙터 패널은 마우스 이벤트를 받음
        }}
        onMouseDown={(e) => e.stopPropagation()}
        onMouseUp={(e) => e.stopPropagation()}
        onMouseMove={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {/* Header - Draggable */}
        <AppBar
          position="static"
          color="primary"
          elevation={0}
          className="drag-handle"
          sx={{ cursor: 'move' }}
        >
          <Toolbar sx={{ minHeight: '48px !important' }}>
            <DragIndicatorIcon sx={{ mr: 1 }} />
            <BugReportIcon sx={{ mr: 1 }} />
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontSize: '1rem' }}>
              Game Object Inspector
            </Typography>
            <IconButton
              color="inherit"
              size="small"
              onClick={() => refreshSceneData()}
              title="Refresh"
              sx={{ mr: 0.5 }}
            >
              <RefreshIcon />
            </IconButton>
            <IconButton
              color="inherit"
              size="small"
              onClick={toggleMinimize}
              title={isMinimized ? 'Maximize' : 'Minimize'}
              sx={{ mr: 0.5 }}
            >
              {isMinimized ? <MaximizeIcon /> : <MinimizeIcon />}
            </IconButton>
            <IconButton color="inherit" size="small" onClick={onClose} title="Close">
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Content - Only show when not minimized */}
        {!isMinimized && (
          <>
            {/* Scene Info */}
            {currentScene && (
              <Box sx={{ p: 1.5, backgroundColor: 'background.paper' }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                  Current Scene
                </Typography>
                <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                  {currentScene.scene.key}
                </Typography>
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
            )}

            <Divider />

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onChange={(_, newValue) => setActiveTab(newValue)}
              variant="fullWidth"
              sx={{ borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab icon={<ListIcon />} label="Objects" iconPosition="start" />
              <Tab icon={<EventNoteIcon />} label="Events" iconPosition="start" />
              <Tab icon={<TerminalIcon />} label="Console" iconPosition="start" />
            </Tabs>

            {/* Tab Content */}
            <Box
              sx={{
                flexGrow: 1,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              {activeTab === 0 && (
                <Box
                  sx={{
                    display: 'flex',
                    flexGrow: 1,
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
                    <Typography variant="subtitle2" sx={{ px: 1, py: 0.5, fontWeight: 'bold', fontSize: '0.875rem' }}>
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
                    <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 'bold', fontSize: '0.875rem' }}>
                      Properties
                    </Typography>
                    <PropertyPanel node={selectedNode} />
                  </Box>
                </Box>
              )}

              {activeTab === 1 && <EventLogger maxLogs={500} scene={currentScene} />}

              {activeTab === 2 && <ConsoleCommand scene={currentScene} />}
            </Box>

            {/* Resize Handle */}
            <Box
              onMouseDown={() => setIsResizing(true)}
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 20,
                height: 20,
                cursor: 'nwse-resize',
                backgroundColor: 'primary.main',
                opacity: 0.5,
                '&:hover': {
                  opacity: 1,
                },
                clipPath: 'polygon(100% 0, 100% 100%, 0 100%)',
              }}
            />
          </>
        )}
      </Paper>
    </Draggable>
  );
}

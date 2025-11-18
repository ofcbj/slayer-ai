import { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme, CssBaseline, Box, AppBar, Toolbar, Typography, IconButton, Divider, Button } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import RefreshIcon from '@mui/icons-material/Refresh';
import BugReportIcon from '@mui/icons-material/BugReport';
import { GameObjectTree } from './GameObjectTree';
import { PropertyPanel } from './PropertyPanel';
import { GameObjectNode, SceneInspector } from '../game/utils/SceneInspector';
import { ObjectHighlighter } from '../game/utils/ObjectHighlighter';
import EventBus from '../game/EventBus';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#4ecdc4',
    },
    secondary: {
      main: '#ff6b6b',
    },
    background: {
      default: '#1a1a2e',
      paper: '#16213e',
    },
  },
});

interface InspectorWindowContentProps {
  onClose: () => void;
}

/**
 * 별도 창에 렌더링되는 인스펙터 컨텐츠
 */
function InspectorWindowContent({ onClose }: InspectorWindowContentProps) {
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

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: 'background.default' }}>
        {/* Header */}
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
            <IconButton color="inherit" onClick={onClose} title="Close">
              <CloseIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        {/* Scene Info */}
        {currentScene && (
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
        )}
        <Divider />

        {/* Main Content */}
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
      </Box>
    </ThemeProvider>
  );
}

/**
 * 새 창에서 인스펙터를 열고 관리하는 훅
 */
export function useInspectorWindow() {
  const [inspectorWindow, setInspectorWindow] = useState<Window | null>(null);

  const openInspectorWindow = () => {
    // 이미 열려있으면 포커스
    if (inspectorWindow && !inspectorWindow.closed) {
      inspectorWindow.focus();
      return;
    }

    // 새 창 열기
    const newWindow = window.open(
      '',
      'GameObjectInspector',
      'width=1000,height=800,menubar=no,toolbar=no,location=no,status=no'
    );

    if (!newWindow) {
      alert('팝업이 차단되었습니다. 팝업 차단을 해제해주세요.');
      return;
    }

    // 새 창 HTML 설정
    newWindow.document.write(`
      <!DOCTYPE html>
      <html lang="ko">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Game Object Inspector</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap" rel="stylesheet">
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons" rel="stylesheet">
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Oxygen',
              'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
          }
          #inspector-root {
            width: 100%;
            height: 100vh;
          }
        </style>
      </head>
      <body>
        <div id="inspector-root"></div>
      </body>
      </html>
    `);
    newWindow.document.close();

    // 컨테이너 가져오기
    const container = newWindow.document.getElementById('inspector-root');
    if (!container) {
      console.error('Failed to find inspector-root element');
      return;
    }

    // 부모 창의 스타일 시트 복사 (Material UI CSS-in-JS 포함)
    const parentStyles = document.head.querySelectorAll('style, link[rel="stylesheet"]');
    parentStyles.forEach((styleElement) => {
      if (styleElement.tagName === 'STYLE') {
        const newStyle = newWindow.document.createElement('style');
        newStyle.textContent = (styleElement as HTMLStyleElement).textContent || '';
        newWindow.document.head.appendChild(newStyle);
      } else if (styleElement.tagName === 'LINK') {
        const link = styleElement as HTMLLinkElement;
        const newLink = newWindow.document.createElement('link');
        newLink.rel = link.rel;
        newLink.href = link.href;
        newWindow.document.head.appendChild(newLink);
      }
    });

    // 잠시 대기 후 렌더링 (DOM과 스타일이 준비될 때까지)
    setTimeout(() => {
      try {
        // React 컴포넌트 렌더링
        const root = createRoot(container);
        root.render(
          <InspectorWindowContent
            onClose={() => {
              newWindow.close();
              setInspectorWindow(null);
            }}
          />
        );
        console.log('Inspector window rendered successfully');
      } catch (error) {
        console.error('Failed to render inspector window:', error);
      }
    }, 200);

    // 창이 닫힐 때 정리
    newWindow.addEventListener('beforeunload', () => {
      ObjectHighlighter.clear();
      setInspectorWindow(null);
    });

    setInspectorWindow(newWindow);
  };

  const closeInspectorWindow = () => {
    if (inspectorWindow && !inspectorWindow.closed) {
      inspectorWindow.close();
    }
    setInspectorWindow(null);
  };

  // 컴포넌트 언마운트 시 창 닫기
  useEffect(() => {
    return () => {
      if (inspectorWindow && !inspectorWindow.closed) {
        inspectorWindow.close();
      }
    };
  }, [inspectorWindow]);

  return {
    openInspectorWindow,
    closeInspectorWindow,
    isOpen: inspectorWindow !== null && !inspectorWindow.closed,
  };
}

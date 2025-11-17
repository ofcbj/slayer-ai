import { useRef, useState } from 'react';
import { ThemeProvider, createTheme, CssBaseline, Fab, Tooltip } from '@mui/material';
import BugReportIcon from '@mui/icons-material/BugReport';
import { PhaserGame, IRefPhaserGame } from './components/PhaserGame';
import { FloatingInspector } from './components/FloatingInspector';
import './App.css';

// Material UI 다크 테마 설정
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

function App() {
  const phaserRef = useRef<IRefPhaserGame | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState(false);

  const currentScene = (scene: Phaser.Scene) => {
    // Scene이 준비되면 호출됩니다
    console.log('Current scene:', scene.scene.key);
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <div id="app">
        <PhaserGame ref={phaserRef} currentActiveScene={currentScene} />

        {/* Floating Inspector */}
        <FloatingInspector open={inspectorOpen} onClose={() => setInspectorOpen(false)} />

        {/* Inspector Toggle Button */}
        <Tooltip title={inspectorOpen ? "Close Inspector" : "Open Inspector"} placement="left">
          <Fab
            color="primary"
            aria-label="inspector"
            onClick={() => setInspectorOpen(!inspectorOpen)}
            sx={{
              position: 'fixed',
              bottom: 16,
              right: 16,
              zIndex: 1000,
            }}
          >
            <BugReportIcon />
          </Fab>
        </Tooltip>
      </div>
    </ThemeProvider>
  );
}

export default App;

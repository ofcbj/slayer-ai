import { useState, useEffect, useRef } from 'react';
import { Box, Typography, Paper, TextField, IconButton, List, ListItem, Chip, Autocomplete } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import ClearIcon from '@mui/icons-material/Clear';
import EventBus from '../game/EventBus';

interface CommandHistory {
  id        : number;
  timestamp : number;
  command   : string;
  output    : string;
  success   : boolean;
}

interface ConsoleCommandProps {
  scene: Phaser.Scene | null;
}

/**
 * 게임 내 명령어를 실행할 수 있는 콘솔 컴포넌트
 */
export function ConsoleCommand({ scene }: ConsoleCommandProps) {
  const [input, setInput]               = useState('');
  const [history, setHistory]           = useState<CommandHistory[]>([]);
  const [commandIndex, setCommandIndex] = useState(-1);
  
  const inputRef      = useRef<HTMLInputElement>(null);
  const historyEndRef = useRef<HTMLDivElement>(null);
  const idCounterRef  = useRef(0);

  // 명령어 히스토리 (실제 실행된 명령어만)
  const executedCommandsRef = useRef<string[]>([]);

  // 자동완성 명령어 목록
  const availableCommands = [
    { name: 'help',       description: '사용 가능한 명령어 목록 표시' },
    { name: 'damage',     description: '플레이어에게 피해 입히기: damage <amount>' },
    { name: 'heal',       description: '플레이어 체력 회복: heal <amount>' },
    { name: 'energy',     description: '에너지 설정: energy <amount>' },
    { name: 'defense',    description: '방어도 설정: defense <amount>' },
    { name: 'addcard',    description: '손패에 카드 추가: addcard <cardName>' },
    { name: 'drawcards',  description: '카드 뽑기: drawcards <count>' },
    { name: 'enemydamage',description: '적에게 피해: enemydamage <index> <amount>' },
    { name: 'enemyheal',  description: '적 체력 회복: enemyheal <index> <amount>' },
    { name: 'nextturn',   description: '다음 턴으로 이동' },
    { name: 'win',        description: '전투 승리' },
    { name: 'lose',       description: '전투 패배' },
    { name: 'clear',      description: '콘솔 출력 지우기' },
  ];

  // 스크롤을 맨 아래로
  useEffect(() => {
    if (historyEndRef.current) {
      historyEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [history]);

  // 명령어 실행
  const executeCommand = (command: string): { output: string; success: boolean } => {
    const trimmed = command.trim();
    if (!trimmed) {
      return { output: '', success: true };
    }

    const parts = trimmed.split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);

    try {
      switch (cmd) {
        case 'help':
          return {
            output: availableCommands.map((c) => `  ${c.name.padEnd(15)} - ${c.description}`).join('\n'),
            success: true,
          };

        case 'damage': {
          const amount = parseInt(args[0] || '10');
          if (isNaN(amount) || amount < 0) {
            return { output: 'Error: Invalid damage amount', success: false };
          }
          EventBus.emit('console-damage-player', amount);
          return { output: `플레이어에게 ${amount} 피해를 입혔습니다.`, success: true };
        }

        case 'heal': {
          const amount = parseInt(args[0] || '10');
          if (isNaN(amount) || amount < 0) {
            return { output: 'Error: Invalid heal amount', success: false };
          }
          EventBus.emit('console-heal-player', amount);
          return { output: `플레이어 체력을 ${amount} 회복했습니다.`, success: true };
        }

        case 'energy': {
          const amount = parseInt(args[0] || '3');
          if (isNaN(amount) || amount < 0) {
            return { output: 'Error: Invalid energy amount', success: false };
          }
          EventBus.emit('console-set-energy', amount);
          return { output: `에너지를 ${amount}로 설정했습니다.`, success: true };
        }

        case 'defense': {
          const amount = parseInt(args[0] || '0');
          if (isNaN(amount) || amount < 0) {
            return { output: 'Error: Invalid defense amount', success: false };
          }
          EventBus.emit('console-set-defense', amount);
          return { output: `방어도를 ${amount}로 설정했습니다.`, success: true };
        }

        case 'addcard': {
          const cardName = args.join(' ');
          if (!cardName) {
            return { output: 'Error: Card name required', success: false };
          }
          EventBus.emit('console-add-card', cardName);
          return { output: `카드 "${cardName}"을(를) 손패에 추가했습니다.`, success: true };
        }

        case 'drawcards': {
          const count = parseInt(args[0] || '1');
          if (isNaN(count) || count < 1 || count > 20) {
            return { output: 'Error: Invalid card count (1-20)', success: false };
          }
          EventBus.emit('console-draw-cards', count);
          return { output: `${count}장의 카드를 뽑았습니다.`, success: true };
        }

        case 'enemydamage': {
          const index = parseInt(args[0]);
          const amount = parseInt(args[1] || '10');
          if (isNaN(index) || index < 0) {
            return { output: 'Error: Invalid enemy index', success: false };
          }
          if (isNaN(amount) || amount < 0) {
            return { output: 'Error: Invalid damage amount', success: false };
          }
          EventBus.emit('console-damage-enemy', { index, amount });
          return { output: `적 ${index}에게 ${amount} 피해를 입혔습니다.`, success: true };
        }

        case 'enemyheal': {
          const index = parseInt(args[0]);
          const amount = parseInt(args[1] || '10');
          if (isNaN(index) || index < 0) {
            return { output: 'Error: Invalid enemy index', success: false };
          }
          if (isNaN(amount) || amount < 0) {
            return { output: 'Error: Invalid heal amount', success: false };
          }
          EventBus.emit('console-heal-enemy', { index, amount });
          return { output: `적 ${index}의 체력을 ${amount} 회복했습니다.`, success: true };
        }

        case 'nextturn': {
          EventBus.emit('console-next-turn');
          return { output: '다음 턴으로 이동했습니다.', success: true };
        }

        case 'win': {
          EventBus.emit('console-win-battle');
          return { output: '전투를 승리로 처리했습니다.', success: true };
        }

        case 'lose': {
          EventBus.emit('console-lose-battle');
          return { output: '전투를 패배로 처리했습니다.', success: true };
        }

        case 'clear': {
          setHistory([]);
          return { output: '', success: true };
        }

        default:
          return {
            output: `Unknown command: ${cmd}\nType "help" for available commands.`,
            success: false,
          };
      }
    } catch (error: any) {
      return { output: `Error: ${error.message}`, success: false };
    }
  };

  const handleSubmit = () => {
    if (!input.trim()) return;

    const result = executeCommand(input);
    const newHistory: CommandHistory = {
      id        : idCounterRef.current++,
      timestamp : Date.now(),
      command   : input,
      output    : result.output,
      success   : result.success,
    };

    setHistory((prev) => [...prev, newHistory]);
    executedCommandsRef.current.push(input);
    setCommandIndex(-1);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (executedCommandsRef.current.length > 0) {
        const newIndex = commandIndex === -1 ? executedCommandsRef.current.length - 1 : Math.max(0, commandIndex - 1);
        setCommandIndex(newIndex);
        setInput(executedCommandsRef.current[newIndex]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (commandIndex >= 0) {
        const newIndex = commandIndex + 1;
        if (newIndex >= executedCommandsRef.current.length) {
          setCommandIndex(-1);
          setInput('');
        } else {
          setCommandIndex(newIndex);
          setInput(executedCommandsRef.current[newIndex]);
        }
      }
    }
  };

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', {
      hour    : '2-digit',
      minute  : '2-digit',
      second  : '2-digit',
    });
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">Console</Typography>
          <IconButton size="small" onClick={() => setHistory([])} title="Clear History">
            <ClearIcon />
          </IconButton>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
          Type "help" for available commands
        </Typography>
      </Box>

      {/* Command History */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1, backgroundColor: 'background.default' }}>
        {history.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <Typography>No commands executed yet</Typography>
            <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
              Try: help, damage 10, heal 20, energy 5
            </Typography>
          </Box>
        ) : (
          <List dense>
            {history.map((item) => (
              <Paper key={item.id} sx={{ mb: 1, p: 1, backgroundColor: 'background.paper' }} elevation={1}>
                <ListItem sx={{ flexDirection: 'column', alignItems: 'stretch', px: 0, py: 0.5 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip label="$" size="small" color="primary" sx={{ fontFamily: 'monospace' }} />
                      <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                        {item.command}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {formatTimestamp(item.timestamp)}
                    </Typography>
                  </Box>
                  {item.output && (
                    <Box
                      sx={{
                        backgroundColor: item.success ? 'success.dark' : 'error.dark',
                        p: 1,
                        borderRadius: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.75rem',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word',
                        opacity: 0.8,
                      }}
                    >
                      {item.output}
                    </Box>
                  )}
                </ListItem>
              </Paper>
            ))}
            <div ref={historyEndRef} />
          </List>
        )}
      </Box>

      {/* Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Autocomplete
            freeSolo
            options={availableCommands.map((c) => c.name)}
            inputValue={input}
            onInputChange={(_, newValue) => setInput(newValue)}
            renderInput={(params) => (
              <TextField
                {...params}
                inputRef={inputRef}
                placeholder="Enter command..."
                size="small"
                fullWidth
                onKeyDown={handleKeyDown}
                sx={{
                  '& .MuiInputBase-root': {
                    fontFamily: 'monospace',
                  },
                }}
              />
            )}
            sx={{ flexGrow: 1 }}
          />
          <IconButton color="primary" onClick={handleSubmit} title="Execute Command">
            <SendIcon />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
}


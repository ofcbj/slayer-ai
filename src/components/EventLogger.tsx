import { useState, useEffect, useRef, useCallback } from 'react';
import { Box, Typography, Paper, TextField, IconButton, Chip, List, ListItem, FormControlLabel,
  Switch, Select, MenuItem, FormControl, InputLabel,
} from '@mui/material';
import ClearIcon from '@mui/icons-material/Clear';
import FilterListIcon from '@mui/icons-material/FilterList';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import EventBus from '../game/EventBus';

// 필터링할 이벤트 목록 (매 프레임마다 발생하는 렌더링 이벤트)
const FILTERED_EVENTS = [
  'preupdate',
  'update',
  'postupdate',
  'prerender',
  'render',
  'postrender',
  'step',
  'poststep',
];

interface EventLogEntry {
  id        : number;
  timestamp : number;
  eventName : string;
  data      : any;
  source    : 'EventBus' | 'Scene';
}

interface EventLoggerProps {
  maxLogs?: number;
  scene?  : Phaser.Scene | null;
}

/**
 * EventBus와 Phaser Scene의 모든 이벤트를 실시간으로 모니터링하고 표시하는 컴포넌트
 */
export function EventLogger({ maxLogs = 500, scene }: EventLoggerProps) {
  const [logs, setLogs]                   = useState<EventLogEntry[]>([]);
  const [filter, setFilter]               = useState<string>('');
  const [selectedEvent, setSelectedEvent] = useState<string>('all');
  const [autoScroll, setAutoScroll]       = useState(true);
  const [paused, setPaused]               = useState(false);
  const logEndRef                         = useRef<HTMLDivElement>(null);
  const idCounterRef                      = useRef(0);
  const originalEmitRef                   = useRef<any>(null);
  const originalSceneEmitRef              = useRef<any>(null);
  const pausedLogsRef                     = useRef<EventLogEntry[]>([]);

  // 로그 추가 헬퍼 함수
  const addLog = useCallback((eventName: string, data: any, source: 'EventBus' | 'Scene') => {
    // 필터링 대상 이벤트는 로깅하지 않음 (매 프레임마다 발생하는 렌더링 이벤트)
    // 정확한 매칭만 사용 (부분 문자열 포함이 아닌)
    const lowerName = eventName.toLowerCase();
    if (FILTERED_EVENTS.some((filtered) => lowerName === filtered || lowerName.startsWith(filtered + ':') || lowerName.endsWith(':' + filtered))) {
      return;
    }

    if (!paused) {
      const logEntry: EventLogEntry = {
        id: idCounterRef.current++,
        timestamp: Date.now(),
        eventName,
        data,
        source,
      };

      setLogs((prev) => {
        const newLogs = [...prev, logEntry];
        // 최대 로그 수 제한
        if (newLogs.length > maxLogs) {
          return newLogs.slice(-maxLogs);
        }
        return newLogs;
      });
    } else {
      // 일시정지 중이면 나중에 추가할 로그 저장
      pausedLogsRef.current.push({
        id: idCounterRef.current++,
        timestamp: Date.now(),
        eventName,
        data,
        source,
      });
    }
  }, [paused, maxLogs]);

  // EventBus 이벤트 가로채기
  useEffect(() => {
    // EventBus의 emit 메서드를 가로채서 로깅
    const originalEmit = EventBus.emit.bind(EventBus);
    originalEmitRef.current = originalEmit;

    const interceptedEmit = (event: string, ...args: any[]) => {
      const data = args.length === 1 ? args[0] : args;
      addLog(event, data, 'EventBus');

      // 원본 emit 호출
      return originalEmit(event, ...args);
    };

    // EventBus의 emit 메서드 교체
    (EventBus as any).emit = interceptedEmit;

    return () => {
      // 정리: 원본 emit 복원
      if (originalEmitRef.current) {
        (EventBus as any).emit = originalEmitRef.current;
      }
    };
  }, [paused, maxLogs, addLog]);

  // Phaser Scene 이벤트 가로채기
  useEffect(() => {
    if (!scene || !scene.events) return;

    // Scene의 emit 메서드를 가로채서 로깅
    const originalSceneEmit = scene.events.emit.bind(scene.events);
    originalSceneEmitRef.current = originalSceneEmit;

    const interceptedSceneEmit = (event: string, ...args: any[]) => {
      // Phaser GameObject는 직렬화하기 어려우므로 간단히 표현
      const serializedArgs = args.map((arg) => {
        if (arg && typeof arg === 'object') {
          // Phaser GameObject인 경우 타입과 이름만 표시
          if (arg.type && arg.scene) {
            return {
              type: arg.type,
              name: (arg as any).name || (arg as any).cardData?.name || 'Unknown',
              id: (arg as any).id || 'N/A',
            };
          }
          // 일반 객체는 JSON으로 직렬화 시도
          try {
            return JSON.parse(JSON.stringify(arg));
          } catch {
            return String(arg);
          }
        }
        return arg;
      });

      const data = serializedArgs.length === 1 ? serializedArgs[0] : serializedArgs;
      
      // 디버깅: 중요한 이벤트는 콘솔에도 출력
      if (event === 'cardClicked' || event === 'enemyClicked' || event === 'enemyDefeated') {
        console.log('[EventLogger] Captured Scene event:', event, data);
      }
      
      addLog(event, data, 'Scene');

      // 원본 emit 호출
      return originalSceneEmit(event, ...args);
    };

    // Scene의 emit 메서드 교체
    (scene.events as any).emit = interceptedSceneEmit;

    return () => {
      // 정리: 원본 emit 복원
      if (originalSceneEmitRef.current) {
        (scene.events as any).emit = originalSceneEmitRef.current;
      }
    };
  }, [scene, paused, maxLogs, addLog]);

  // 일시정지 해제 시 대기 중인 로그 추가
  useEffect(() => {
    if (!paused && pausedLogsRef.current.length > 0) {
      setLogs((prev) => {
        const newLogs = [...prev, ...pausedLogsRef.current];
        pausedLogsRef.current = [];
        if (newLogs.length > maxLogs) {
          return newLogs.slice(-maxLogs);
        }
        return newLogs;
      });
    }
  }, [paused, maxLogs]);

  // 자동 스크롤
  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  // 필터링된 로그
  const filteredLogs = logs.filter((log) => {
    if (selectedEvent !== 'all' && log.eventName !== selectedEvent) {
      return false;
    }
    if (filter) {
      const searchText = filter.toLowerCase();
      return (
        log.eventName.toLowerCase().includes(searchText) ||
        JSON.stringify(log.data).toLowerCase().includes(searchText)
      );
    }
    return true;
  });

  // 고유한 이벤트 이름 목록
  const uniqueEventNames = Array.from(new Set(logs.map((log) => log.eventName))).sort();

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    // fractionalSecondDigits is not available in some TypeScript DOM libs, so append milliseconds manually
    const time = date.toLocaleTimeString('ko-KR', {
      hour  : '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    const ms = String(date.getMilliseconds()).padStart(3, '0');
    return `${time}.${ms}`;
  };

  const formatData = (data: any): string => {
    if (data === null || data === undefined) {
      return 'null';
    }
    if (typeof data === 'object') {
      try {
        return JSON.stringify(data, null, 2);
      } catch (e) {
        return String(data);
      }
    }
    return String(data);
  };

  const handleClear = () => {
    setLogs([]);
    pausedLogsRef.current = [];
  };

  const handleReplayEvent = (log: EventLogEntry) => {
    EventBus.emit(log.eventName, log.data);
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="h6">Event Logger</Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <FormControlLabel
              control={<Switch checked={!paused} onChange={(e) => setPaused(!e.target.checked)} size="small" />}
              label={paused ? 'Paused' : 'Running'}
            />
            <IconButton size="small" onClick={handleClear} title="Clear Logs">
              <ClearIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Filters */}
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search events..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            sx={{ flexGrow: 1, minWidth: 200 }}
            InputProps={{
              startAdornment: <FilterListIcon sx={{ mr: 1, color: 'text.secondary' }} />,
            }}
          />
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel>Event Type</InputLabel>
            <Select value={selectedEvent} onChange={(e) => setSelectedEvent(e.target.value)} label="Event Type">
              <MenuItem value="all">All Events</MenuItem>
              {uniqueEventNames.map((name) => (
                <MenuItem key={name} value={name}>
                  {name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControlLabel
            control={<Switch checked={autoScroll} onChange={(e) => setAutoScroll(e.target.checked)} size="small" />}
            label="Auto Scroll"
          />
        </Box>

        {/* Stats */}
        <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
          <Chip label={`Total: ${logs.length}`} size="small" />
          <Chip label={`Filtered: ${filteredLogs.length}`} size="small" color="primary" />
          <Chip label={`Events: ${uniqueEventNames.length}`} size="small" color="secondary" />
        </Box>
      </Box>

      {/* Log List */}
      <Box sx={{ flexGrow: 1, overflow: 'auto', p: 1 }}>
        {filteredLogs.length === 0 ? (
          <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
            <Typography>No events logged yet</Typography>
            {paused && <Typography variant="caption">Logger is paused</Typography>}
          </Box>
        ) : (
          <List dense>
            {filteredLogs.map((log) => (
              <Paper key={log.id} sx={{ mb: 1, p: 1, backgroundColor: 'background.paper' }} elevation={1}>
                <ListItem
                  sx={{
                    flexDirection: 'column',
                    alignItems: 'stretch',
                    px: 0,
                    py: 0.5,
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Chip label={log.eventName} size="small" color="primary" />
                      <Chip 
                        label={log.source} 
                        size="small" 
                        color={log.source === 'EventBus' ? 'secondary' : 'default'}
                        sx={{ fontSize: '0.65rem', height: 18 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {formatTimestamp(log.timestamp)}
                      </Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleReplayEvent(log)} title="Replay Event">
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  <Box
                    sx={{
                      backgroundColor: 'background.default',
                      p: 1,
                      borderRadius: 1,
                      fontFamily: 'monospace',
                      fontSize: '0.75rem',
                      maxHeight: 150,
                      overflow: 'auto',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}
                  >
                    {formatData(log.data)}
                  </Box>
                </ListItem>
              </Paper>
            ))}
            <div ref={logEndRef} />
          </List>
        )}
      </Box>
    </Box>
  );
}


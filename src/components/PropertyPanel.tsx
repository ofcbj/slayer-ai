import { Box, Paper, Typography, Chip, Accordion, AccordionSummary, AccordionDetails,
  Table, TableBody, TableCell, TableContainer, TableRow,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { GameObjectNode } from '../game/utils/SceneInspector';

interface PropertyPanelProps {
  node: GameObjectNode | null;
}

/**
 * 선택된 게임 오브젝트의 속성을 표시하는 패널
 */
export function PropertyPanel({ node }: PropertyPanelProps) {
  if (!node) {
    return (
      <Box sx={{ p: 2, color: 'text.secondary' }}>
        Select a game object to view its properties
      </Box>
    );
  }

  const renderValue = (value: any): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span style={{ color: '#999' }}>null</span>;
    }

    if (typeof value === 'boolean') {
      return (
        <Chip
          label={value.toString()}
          size="small"
          color={value ? 'success' : 'default'}
          sx={{ height: 20 }}
        />
      );
    }

    if (typeof value === 'number') {
      return <span style={{ color: '#2196f3' }}>{value.toFixed(2)}</span>;
    }

    if (typeof value === 'string') {
      return <span style={{ color: '#4caf50' }}>"{value}"</span>;
    }

    if (typeof value === 'object' && !Array.isArray(value)) {
      return (
        <Box sx={{ pl: 2 }}>
          {Object.entries(value).map(([key, val]) => (
            <Box key={key} sx={{ display: 'flex', gap: 1, my: 0.5 }}>
              <Typography variant="caption" color="text.secondary">
                {key}:
              </Typography>
              <Typography variant="caption">{renderValue(val)}</Typography>
            </Box>
          ))}
        </Box>
      );
    }

    if (Array.isArray(value)) {
      return `[${value.length} items]`;
    }

    return String(value);
  };

  // 프로퍼티를 카테고리별로 그룹화
  const propertyCategories = {
    basic       : ['type', 'active', 'visible', 'name'],
    transform   : ['position', 'x', 'y', 'scale', 'scaleX', 'scaleY', 'rotation', 'angle', 'originX', 'originY'],
    rendering   : ['alpha', 'tint', 'depth', 'blendMode', 'visible', 'displayWidth', 'displayHeight'],
    size        : ['width', 'height', 'displayWidth', 'displayHeight', 'radius', 'diameter'],
    physics     : ['velocity', 'acceleration', 'body', 'mass', 'friction', 'bounce'],
    interaction : ['interactive', 'input', 'inputEnabled', 'draggable'],
    text        : ['text', 'fontSize', 'fontFamily', 'align', 'color', 'wordWrap'],
    container   : ['length', 'list'],
    state       : ['health', 'maxHealth', 'defense', 'intent', 'isDead'],
    data        : ['cardData', 'enemyData', 'data'],
  };

  // 각 카테고리에 속하는 프로퍼티들을 추출
  const categorizedProps: Record<string, string[]> = {};
  const uncategorized: string[] = [];

  Object.keys(node.properties).forEach(key => {
    let found = false;
    for (const [category, keywords] of Object.entries(propertyCategories)) {
      if (keywords.includes(key)) {
        if (!categorizedProps[category]) {
          categorizedProps[category] = [];
        }
        categorizedProps[category].push(key);
        found = true;
        break;
      }
    }
    if (!found) {
      uncategorized.push(key);
    }
  });

  // 카테고리 표시 이름
  const categoryLabels: Record<string, string> = {
    basic       : 'Basic',
    transform   : 'Transform',
    rendering   : 'Rendering',
    size        : 'Size',
    physics     : 'Physics',
    interaction : 'Interaction',
    text        : 'Text',
    container   : 'Container',
    state       : 'State',
    data        : 'Data',
  };

  // 프로퍼티 그룹을 렌더링하는 헬퍼 함수
  const renderPropertyGroup = (title: string, properties: string[], defaultExpanded = false) => {
    if (properties.length === 0) return null;

    return (
      <Accordion key={title} defaultExpanded={defaultExpanded}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">{title} ({properties.length})</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {properties.map((key) => (
                  <TableRow key={key}>
                    <TableCell component="th" sx={{ fontWeight: 'bold', width: '40%' }}>
                      {key}
                    </TableCell>
                    <TableCell>{renderValue(node.properties[key])}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </AccordionDetails>
      </Accordion>
    );
  };

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, backgroundColor: 'primary.dark' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {node.name || node.id}
        </Typography>
        <Chip label={node.type} color="primary" size="small" />
      </Paper>

      {/* 카테고리별로 프로퍼티 그룹 렌더링 */}
      {Object.entries(categorizedProps).map(([category, properties]) =>
        renderPropertyGroup(categoryLabels[category] || category, properties, category === 'basic' || category === 'transform')
      )}

      {/* 미분류 프로퍼티 */}
      {renderPropertyGroup('Other', uncategorized, false)}

      {/* Children Info */}
      {node.children && node.children.length > 0 && (
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              Children ({node.children.length})
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {node.children.map((child, index) => (
                <Box key={child.id} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <Chip label={index} size="small" sx={{ width: 30 }} />
                  <Chip label={child.type} size="small" color="secondary" />
                  <Typography variant="caption">{child.name || child.id}</Typography>
                </Box>
              ))}
            </Box>
          </AccordionDetails>
        </Accordion>
      )}
    </Box>
  );
}

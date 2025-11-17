import {
  Box,
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableRow,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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

  const basicProperties = ['type', 'active', 'visible'];
  const otherProperties = Object.keys(node.properties).filter(
    (key) => !basicProperties.includes(key)
  );

  return (
    <Box sx={{ height: '100%', overflow: 'auto' }}>
      {/* Header */}
      <Paper sx={{ p: 2, mb: 2, backgroundColor: 'primary.dark' }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {node.name || node.id}
        </Typography>
        <Chip label={node.type} color="primary" size="small" />
      </Paper>

      {/* Basic Properties */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">Basic Properties</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <TableContainer>
            <Table size="small">
              <TableBody>
                {basicProperties.map((key) => (
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

      {/* Transform */}
      {(node.properties.position || node.properties.scale || node.properties.rotation) && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Transform</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {node.properties.position && (
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                        Position
                      </TableCell>
                      <TableCell>{renderValue(node.properties.position)}</TableCell>
                    </TableRow>
                  )}
                  {node.properties.scale && (
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                        Scale
                      </TableCell>
                      <TableCell>{renderValue(node.properties.scale)}</TableCell>
                    </TableRow>
                  )}
                  {node.properties.rotation !== undefined && (
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                        Rotation
                      </TableCell>
                      <TableCell>{renderValue(node.properties.rotation)}</TableCell>
                    </TableRow>
                  )}
                  {node.properties.angle !== undefined && (
                    <TableRow>
                      <TableCell component="th" sx={{ fontWeight: 'bold' }}>
                        Angle
                      </TableCell>
                      <TableCell>{renderValue(node.properties.angle)}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </AccordionDetails>
        </Accordion>
      )}

      {/* Other Properties */}
      {otherProperties.length > 0 && (
        <Accordion defaultExpanded>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">Other Properties</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <TableContainer>
              <Table size="small">
                <TableBody>
                  {otherProperties.map((key) => (
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
      )}

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

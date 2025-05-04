import React from 'react';
import { Badge, Box, Card, CardContent, CardHeader, Chip, Grid, LinearProgress, Typography } from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import HomeIcon from '@mui/icons-material/Home';
import ErrorIcon from '@mui/icons-material/Error';

// Types
interface DamageAssessmentProps {
  analysis: {
    damage_detected: boolean;
    damage_types: string[];
    damage_severity: 'none' | 'minor' | 'moderate' | 'severe';
    affected_areas: string[];
    confidence: number;
    analyzed_at?: string;
  };
  isLoading?: boolean;
}

const DamageAssessment: React.FC<DamageAssessmentProps> = ({ analysis, isLoading = false }) => {
  if (isLoading) {
    return (
      <Card variant="outlined" sx={{ mb: 3, mt: 2 }}>
        <CardHeader title="Analyzing Damage..." />
        <CardContent>
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Our AI is analyzing the image for damage...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // If no analysis is available
  if (!analysis) {
    return (
      <Card variant="outlined" sx={{ mb: 3, mt: 2 }}>
        <CardHeader title="No Damage Assessment Available" />
        <CardContent>
          <Typography variant="body1">
            This image hasn't been analyzed yet. Upload the image to generate a damage assessment.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  // Determine color based on severity
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return 'error';
      case 'moderate':
        return 'warning';
      case 'minor':
        return 'info';
      default:
        return 'success';
    }
  };

  // Get icon based on damage detection
  const getDamageIcon = () => {
    if (!analysis.damage_detected) return <CheckCircleIcon color="success" />;
    
    switch (analysis.damage_severity) {
      case 'severe':
        return <ErrorIcon color="error" />;
      case 'moderate':
        return <WarningIcon color="warning" />;
      case 'minor':
        return <WarningIcon color="info" />;
      default:
        return <CheckCircleIcon color="success" />;
    }
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Unknown';
    return new Date(dateString).toLocaleString();
  };

  return (
    <Card variant="outlined" sx={{ mb: 3, mt: 2 }}>
      <CardHeader
        avatar={getDamageIcon()}
        title={
          <Typography variant="h6">
            Damage Assessment
            <Badge 
              color={getSeverityColor(analysis.damage_severity)} 
              badgeContent={analysis.damage_severity.toUpperCase()}
              sx={{ ml: 2 }}
            />
          </Typography>
        }
        subheader={`Analyzed on ${formatDate(analysis.analyzed_at)}`}
      />
      
      <CardContent>
        <Grid container spacing={3}>
          {/* Damage Status */}
          <Grid item xs={12}>
            <Typography variant="body1" sx={{ mb: 1 }}>
              <strong>Status:</strong> {analysis.damage_detected ? 'Damage Detected' : 'No Damage Detected'}
            </Typography>
            
            <LinearProgress 
              variant="determinate" 
              value={analysis.confidence * 100} 
              color={getSeverityColor(analysis.damage_severity)} 
              sx={{ height: 10, borderRadius: 5, mb: 1 }}
            />
            
            <Typography variant="caption" color="text.secondary">
              Confidence: {Math.round(analysis.confidence * 100)}%
            </Typography>
          </Grid>

          {/* Damage Types if damage detected */}
          {analysis.damage_detected && analysis.damage_types.length > 0 && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                <strong>Damage Types:</strong>
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {analysis.damage_types.map((type, index) => (
                  <Chip 
                    key={index} 
                    label={type} 
                    color={getSeverityColor(analysis.damage_severity)} 
                    size="small"
                    variant="outlined"
                  />
                ))}
              </Box>
            </Grid>
          )}

          {/* Affected Areas if any */}
          {analysis.affected_areas.length > 0 && (
            <Grid item xs={12} sm={6}>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                <strong>Affected Areas:</strong>
              </Typography>
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {analysis.affected_areas.map((area, index) => (
                  <Chip 
                    key={index} 
                    label={area} 
                    icon={<HomeIcon />}
                    size="small"
                  />
                ))}
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
};

export default DamageAssessment;
import React, { useEffect, useState } from 'react';
import { 
  Box, 
  Card, 
  CardContent, 
  CardHeader, 
  Chip, 
  CircularProgress,
  Divider, 
  Grid, 
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper, 
  Typography,
  useTheme
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import PhotoIcon from '@mui/icons-material/Photo';
import PieChart from '@mui/icons-material/PieChart';
import { DamageAssessmentService } from '../../utils/damageAssessmentService';

// Chart.js dependencies
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale } from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale);

interface ReportDamageSummaryProps {
  reportId: string;
}

const ReportDamageSummary: React.FC<ReportDamageSummaryProps> = ({ reportId }) => {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [images, setImages] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch the summary data
        const summaryData = await DamageAssessmentService.getReportDamageSummary(reportId);
        setSummary(summaryData);
        
        // Fetch the images with analysis
        const imagesData = await DamageAssessmentService.getReportImagesWithAnalysis(reportId);
        setImages(imagesData);
      } catch (error) {
        console.error('Error fetching damage summary:', error);
      } finally {
        setLoading(false);
      }
    };
    
    if (reportId) {
      fetchData();
    }
  }, [reportId]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!summary) {
    return (
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardHeader title="Damage Assessment Summary" />
        <CardContent>
          <Typography>No damage assessment data is available for this report.</Typography>
        </CardContent>
      </Card>
    );
  }

  // Prepare chart data for damage severity distribution
  const severityChartData = {
    labels: ['None', 'Minor', 'Moderate', 'Severe'],
    datasets: [
      {
        data: [
          summary.severityCount.none || 0,
          summary.severityCount.minor || 0,
          summary.severityCount.moderate || 0,
          summary.severityCount.severe || 0,
        ],
        backgroundColor: [
          theme.palette.success.light,
          theme.palette.info.light,
          theme.palette.warning.light,
          theme.palette.error.light,
        ],
        borderColor: [
          theme.palette.success.main,
          theme.palette.info.main,
          theme.palette.warning.main,
          theme.palette.error.main,
        ],
        borderWidth: 1,
      },
    ],
  };

  // Helper functions
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'severe':
        return theme.palette.error.main;
      case 'moderate':
        return theme.palette.warning.main;
      case 'minor':
        return theme.palette.info.main;
      default:
        return theme.palette.success.main;
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
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

  return (
    <Card variant="outlined" sx={{ mb: 3 }}>
      <CardHeader 
        title="Damage Assessment Summary" 
        subheader={`Based on ${summary.totalImagesAnalyzed} analyzed images`}
        avatar={<PieChart />}
      />
      <CardContent>
        <Grid container spacing={3}>
          {/* Overall Status */}
          <Grid item xs={12}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 2, 
                display: 'flex', 
                alignItems: 'center',
                bgcolor: summary.hasDamage ? 
                  alpha(getSeverityColor(summary.mostSevereDamage), 0.1) : 
                  theme.palette.success.light + '20'
              }}
            >
              {summary.hasDamage ? (
                getSeverityIcon(summary.mostSevereDamage)
              ) : (
                <CheckCircleIcon color="success" sx={{ mr: 1 }} />
              )}
              <Typography variant="h6" sx={{ ml: 1 }}>
                {summary.hasDamage ? 
                  `Damage Detected - ${summary.mostSevereDamage.charAt(0).toUpperCase() + summary.mostSevereDamage.slice(1)} Severity` : 
                  'No Damage Detected'}
              </Typography>
            </Paper>
          </Grid>

          {/* Charts Section */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Damage Severity Distribution</Typography>
            <Box sx={{ height: 200 }}>
              <Doughnut 
                data={severityChartData} 
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: 'right',
                    }
                  }
                }}
              />
            </Box>
          </Grid>

          {/* Common Issues */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom>Common Issues Found</Typography>
            
            {summary.commonDamageTypes.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                {summary.commonDamageTypes.map((type: string, index: number) => (
                  <Chip 
                    key={index}
                    label={capitalizeWords(type)}
                    color={
                      index === 0 ? 'error' : 
                      index === 1 ? 'warning' : 
                      'default'
                    }
                    variant="outlined"
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No damage types identified.
              </Typography>
            )}

            <Typography variant="subtitle1" gutterBottom>Affected Areas</Typography>
            {summary.commonAffectedAreas.length > 0 ? (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                {summary.commonAffectedAreas.map((area: string, index: number) => (
                  <Chip 
                    key={index}
                    label={capitalizeWords(area)}
                    variant="filled"
                  />
                ))}
              </Box>
            ) : (
              <Typography variant="body2" color="text.secondary">
                No specific areas identified.
              </Typography>
            )}
          </Grid>

          {/* Image Analysis List */}
          <Grid item xs={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle1" gutterBottom>
              Image Analysis Details
            </Typography>
            
            <List>
              {images.map((image: any) => {
                const imageAnalysis = image.image_analysis && image.image_analysis.length > 0 
                  ? image.image_analysis[0] 
                  : null;

                return (
                  <Paper
                    key={image.id}
                    elevation={0}
                    sx={{ 
                      mb: 1, 
                      p: 1,
                      bgcolor: imageAnalysis?.damage_detected ? 
                        alpha(getSeverityColor(imageAnalysis.damage_severity), 0.05) : 
                        'background.paper' 
                    }}
                  >
                    <ListItem>
                      <ListItemIcon>
                        <PhotoIcon />
                      </ListItemIcon>
                      <ListItemText
                        primary={image.filename || 'Image'}
                        secondary={
                          imageAnalysis ? 
                            `${imageAnalysis.damage_detected ? 
                              `Damage Detected: ${capitalizeWords(imageAnalysis.damage_severity)} severity` : 
                              'No Damage Detected'} | ${formatDate(imageAnalysis.analyzed_at)}` : 
                            'Not analyzed'
                        }
                      />
                      {imageAnalysis?.damage_detected && (
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          {imageAnalysis.damage_types?.slice(0, 2).map((type: string, index: number) => (
                            <Chip 
                              key={index}
                              size="small"
                              label={capitalizeWords(type)}
                              color={
                                imageAnalysis.damage_severity === 'severe' ? 'error' : 
                                imageAnalysis.damage_severity === 'moderate' ? 'warning' : 
                                imageAnalysis.damage_severity === 'minor' ? 'info' :
                                'default'
                              }
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      )}
                    </ListItem>
                  </Paper>
                );
              })}
            </List>
            
            {images.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                No images have been analyzed for this report.
              </Typography>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

// Helper function to create alpha colors
function alpha(color: string, opacity: number): string {
  return color + Math.round(opacity * 255).toString(16).padStart(2, '0');
}

// Helper function to capitalize words
function capitalizeWords(str: string): string {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1));
}

// Helper function to format dates
function formatDate(dateString: string): string {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString();
}

export default ReportDamageSummary;
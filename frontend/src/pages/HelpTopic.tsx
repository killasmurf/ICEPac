import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, CircularProgress, Button, Divider } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useParams, useNavigate } from 'react-router-dom';
import { getTopic, HelpTopic as HelpTopicType } from '../api/help';

const HelpTopic: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<HelpTopicType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError('');
    getTopic(Number(id))
      .then(setTopic)
      .catch(() => setError('Failed to load help topic.'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error || !topic) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/help')} sx={{ mb: 2 }}>
          Back to Help
        </Button>
        <Typography color="error">{error || 'Topic not found.'}</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/help')} sx={{ mb: 2 }}>
        Back to Help
      </Button>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          {topic.title}
        </Typography>

        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mb: 3 }}>
          {topic.content}
        </Typography>

        {topic.descriptions.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            {topic.descriptions
              .sort((a, b) => a.section_number - b.section_number)
              .map((desc) => (
                <Box key={desc.id} sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Section {desc.section_number}
                  </Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {desc.detailed_text}
                  </Typography>
                </Box>
              ))}
          </>
        )}
      </Paper>
    </Box>
  );
};

export default HelpTopic;

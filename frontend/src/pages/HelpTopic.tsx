import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchOffIcon from '@mui/icons-material/SearchOff';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink, useParams } from 'react-router-dom';
import { getTopic } from '../api/help';
import ErrorState from '../components/common/ErrorState';

const BackLink: React.FC = () => (
  <Button component={RouterLink} to="/help" startIcon={<ArrowBackIcon />} sx={{ mb: 2 }}>
    Back to Help
  </Button>
);

function statusOf(error: unknown): number | undefined {
  return (error as { response?: { status?: number } } | null)?.response?.status;
}

const HelpTopic: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const topicId = Number(id);
  const valid = Number.isInteger(topicId) && topicId > 0;

  // Not ['help','topics',id]: the shell's breadcrumb hook caches only the title under that key.
  const { data: topic, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['help', 'topics', topicId, 'detail'],
    queryFn: () => getTopic(topicId),
    enabled: valid,
    retry: (count, err) => statusOf(err) !== 404 && count < 1,
    meta: { silent: true }, // shown inline below
  });

  if (valid && isLoading) {
    return (
      <Box sx={{ maxWidth: '72ch' }} aria-busy="true" aria-label="Loading">
        <BackLink />
        <Skeleton variant="text" width="60%" height={48} />
        <Skeleton variant="text" />
        <Skeleton variant="text" />
        <Skeleton variant="text" width="70%" />
      </Box>
    );
  }

  if (!valid || (isError && statusOf(error) === 404)) {
    return (
      <Box>
        <BackLink />
        <ErrorState
          icon={<SearchOffIcon />}
          title="Topic not found"
          description="This help topic does not exist or is no longer available."
        />
      </Box>
    );
  }

  if (isError || !topic) {
    return (
      <Box>
        <BackLink />
        <ErrorState
          title="Could not load this topic"
          description="Something went wrong while loading the topic. Try again."
          action={
            <Button variant="outlined" onClick={() => refetch()}>
              Retry
            </Button>
          }
        />
      </Box>
    );
  }

  const sections = [...topic.descriptions].sort((a, b) => a.section_number - b.section_number);

  return (
    <Box>
      <BackLink />
      <Card sx={{ maxWidth: '72ch' }}>
        <CardContent sx={{ p: { xs: 2, sm: 4 } }}>
          <Typography variant="h3" component="h1" gutterBottom>
            {topic.title}
          </Typography>
          <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{topic.content}</Typography>

          {sections.map((desc) => (
            <Box key={desc.id} component="section" sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
              <Typography variant="h6" component="h2" gutterBottom>
                Section {desc.section_number}
              </Typography>
              <Typography sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>{desc.detailed_text}</Typography>
            </Box>
          ))}
        </CardContent>
      </Card>
    </Box>
  );
};

export default HelpTopic;

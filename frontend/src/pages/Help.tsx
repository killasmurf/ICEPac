import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useQuery } from '@tanstack/react-query';
import { Link as RouterLink } from 'react-router-dom';
import { getCategories, getTopics, getTopicsByCategory, searchTopics, type HelpTopic } from '../api/help';
import CardSkeleton from '../components/common/CardSkeleton';
import EmptyState from '../components/common/EmptyState';
import ErrorState from '../components/common/ErrorState';
import PageHeader from '../components/common/PageHeader';
import SearchField from '../components/common/SearchField';

const EXCERPT_LENGTH = 140;

function excerpt(text: string): string {
  const flat = text.replace(/\s+/g, ' ').trim();
  return flat.length > EXCERPT_LENGTH ? `${flat.slice(0, EXCERPT_LENGTH).trimEnd()}...` : flat;
}

const Help: React.FC = () => {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<number | null>(null);
  // Bumped when a category is chosen so the search box clears with it.
  const [searchKey, setSearchKey] = useState(0);

  const query = search.trim();

  const categories = useQuery({
    queryKey: ['help', 'categories'],
    queryFn: getCategories,
    meta: { silent: true }, // categories are optional; the topic list still works without them
  });

  const topics = useQuery({
    queryKey: ['help', 'topics', { search: query, category: query ? null : categoryId }],
    queryFn: async (): Promise<HelpTopic[]> => {
      if (query) return (await searchTopics(query)).items;
      if (categoryId !== null) return (await getTopicsByCategory(categoryId)).items;
      return (await getTopics()).items;
    },
  });

  const selectCategory = (id: number | null) => {
    setCategoryId(id);
    setSearch('');
    setSearchKey((k) => k + 1);
  };

  const onSearch = (value: string) => {
    setSearch(value);
    if (value.trim()) setCategoryId(null);
  };

  const items = topics.data ?? [];

  return (
    <Box>
      <PageHeader title="Help" subtitle="Guides and answers for estimating in ICEPac." />

      <Box sx={{ maxWidth: 560, mb: 2 }}>
        <SearchField
          key={searchKey}
          fullWidth
          label="Search help topics"
          placeholder="Search help topics"
          onChange={onSearch}
        />
      </Box>

      {categories.data && categories.data.length > 0 && (
        <Box role="group" aria-label="Categories" sx={{ mb: 3, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="All"
            clickable
            aria-pressed={categoryId === null && !query}
            onClick={() => selectCategory(null)}
            color={categoryId === null && !query ? 'primary' : 'default'}
            variant={categoryId === null && !query ? 'filled' : 'outlined'}
          />
          {categories.data.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              clickable
              aria-pressed={categoryId === cat.id}
              onClick={() => selectCategory(cat.id)}
              color={categoryId === cat.id ? 'primary' : 'default'}
              variant={categoryId === cat.id ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      )}

      {topics.isLoading ? (
        <Box sx={{ display: 'grid', gap: 1.5 }}>
          <CardSkeleton lines={1} />
          <CardSkeleton lines={1} />
          <CardSkeleton lines={1} />
        </Box>
      ) : topics.isError ? (
        <ErrorState
          title="Could not load help topics"
          description="Something went wrong while loading help. Try again."
          action={
            <Button variant="outlined" onClick={() => topics.refetch()}>
              Retry
            </Button>
          }
        />
      ) : items.length === 0 ? (
        <EmptyState
          icon={<HelpOutlineIcon />}
          title={query ? 'No matching topics' : 'No help topics yet'}
          description={query ? `Nothing matched "${query}". Try a different search term.` : 'There are no topics in this category.'}
          action={
            query || categoryId !== null ? (
              <Button variant="outlined" onClick={() => selectCategory(null)}>
                Show all topics
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Box component="ul" sx={{ listStyle: 'none', p: 0, m: 0, display: 'grid', gap: 1.5 }}>
          {items.map((topic) => (
            <li key={topic.id}>
              <Card>
                <CardActionArea component={RouterLink} to={`/help/${topic.id}`}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                      <Typography variant="subtitle1" component="h2" sx={{ fontWeight: 600 }}>
                        {topic.title}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {excerpt(topic.content)}
                      </Typography>
                    </Box>
                    <ChevronRightIcon aria-hidden sx={{ color: 'text.secondary' }} />
                  </CardContent>
                </CardActionArea>
              </Card>
            </li>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default Help;

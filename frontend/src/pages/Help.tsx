import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  TextField,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  InputAdornment,
  CircularProgress,
  Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useNavigate } from 'react-router-dom';
import { getTopics, searchTopics, getCategories, getTopicsByCategory, HelpTopic, HelpCategory } from '../api/help';

const Help: React.FC = () => {
  const navigate = useNavigate();
  const [topics, setTopics] = useState<HelpTopic[]>([]);
  const [categories, setCategories] = useState<HelpCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
    loadTopics();
  }, []);

  const loadCategories = async () => {
    try {
      const data = await getCategories();
      setCategories(data);
    } catch {
      // Categories are optional, don't block on error
    }
  };

  const loadTopics = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await getTopics();
      setTopics(data.items);
    } catch {
      setError('Failed to load help topics.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    setSelectedCategory(null);
    if (!query.trim()) {
      loadTopics();
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await searchTopics(query);
      setTopics(data.items);
    } catch {
      setError('Search failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleCategorySelect = async (categoryId: number | null) => {
    setSelectedCategory(categoryId);
    setSearchQuery('');
    setLoading(true);
    setError('');
    try {
      if (categoryId === null) {
        const data = await getTopics();
        setTopics(data.items);
      } else {
        const data = await getTopicsByCategory(categoryId);
        setTopics(data.items);
      }
    } catch {
      setError('Failed to load topics.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Help
      </Typography>

      <TextField
        fullWidth
        placeholder="Search help topics..."
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        sx={{ mb: 2 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon />
            </InputAdornment>
          ),
        }}
      />

      {categories.length > 0 && (
        <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            label="All"
            onClick={() => handleCategorySelect(null)}
            color={selectedCategory === null ? 'primary' : 'default'}
            variant={selectedCategory === null ? 'filled' : 'outlined'}
          />
          {categories.map((cat) => (
            <Chip
              key={cat.id}
              label={cat.name}
              onClick={() => handleCategorySelect(cat.id)}
              color={selectedCategory === cat.id ? 'primary' : 'default'}
              variant={selectedCategory === cat.id ? 'filled' : 'outlined'}
            />
          ))}
        </Box>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Typography color="error">{error}</Typography>
      ) : topics.length === 0 ? (
        <Typography color="text.secondary">No help topics found.</Typography>
      ) : (
        <Paper variant="outlined">
          <List disablePadding>
            {topics.map((topic, index) => (
              <ListItemButton
                key={topic.id}
                divider={index < topics.length - 1}
                onClick={() => navigate(`/help/${topic.id}`)}
              >
                <ListItemText
                  primary={topic.title}
                  secondary={topic.content.substring(0, 120) + (topic.content.length > 120 ? '...' : '')}
                />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      )}
    </Box>
  );
};

export default Help;

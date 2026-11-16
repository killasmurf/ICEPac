import { loadFixture } from './mockApi';

/** Mock routes for the login, help and dashboard specs (extra argument of mockApi). */
export const miscRoutes = {
  'GET /help/categories': () => loadFixture('misc-help-categories'),
  'GET /help/categories/1/topics': () => loadFixture('misc-help-topics-cat1'),
  'GET /help/search': (url: URL) => {
    const q = url.searchParams.get('q') ?? '';
    const all = loadFixture<{ items: { title: string }[] }>('help-topics');
    const items = all.items.filter((t) => t.title.toLowerCase().includes(q.toLowerCase()));
    return { items, total: items.length, skip: 0, limit: 100 };
  },
  'GET /help/topics/1': () => loadFixture('misc-help-topic-1'),
};

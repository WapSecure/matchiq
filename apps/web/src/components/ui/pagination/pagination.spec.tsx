import {
  act,
  render,
  renderHook,
  screen,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { PAGINATION_NOUNS } from '@/constants/pagination';
import { useInterfaceLanguage } from '@/features/interface-language/interface-language-store';
import { CursorPagination } from './cursor-pagination';
import { LoadMore } from './load-more';
import { Pagination } from './pagination';
import { useCursorPage, useNumberedPage } from './use-paged-url';

const replays = PAGINATION_NOUNS.replays;

afterEach(() => {
  window.history.replaceState(null, '', '/');
});

beforeEach(() => useInterfaceLanguage.setState({ locale: 'en-GB' }));

describe('Pagination', () => {
  const renderPages = (page: number, onPageChange = vi.fn()) => {
    render(
      <Pagination
        page={page}
        pageSize={8}
        total={23}
        onPageChange={onPageChange}
        noun={replays}
        label="Replay pages"
      />,
    );
    return onPageChange;
  };

  it('names the landmark, marks the current page and announces the range', () => {
    renderPages(2);
    const nav = screen.getByRole('navigation', { name: 'Replay pages' });
    expect(within(nav).getByRole('button', { name: 'Page 2' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(
      within(nav).getByRole('button', { name: 'Page 1' }),
    ).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 9–16 of 23 replays',
    );
    expect(screen.getByTestId('page-of')).toHaveTextContent('Page 2 of 3');
  });

  it('keeps edge buttons focusable but inert', async () => {
    const onPageChange = renderPages(1);
    const previous = screen.getByRole('button', { name: 'Previous page' });
    expect(previous).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(previous);
    expect(onPageChange).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Next page' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('moves by keyboard', async () => {
    const onPageChange = renderPages(2);
    await userEvent.tab();
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole('button', { name: 'Page 2' })).toHaveFocus();
    await userEvent.tab();
    await userEvent.keyboard('{Enter}');
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('hides the controls when everything fits on one page', () => {
    render(
      <Pagination
        page={1}
        pageSize={8}
        total={5}
        onPageChange={vi.fn()}
        noun={PAGINATION_NOUNS.matches}
        label="Match pages"
      />,
    );
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 1–5 of 5 matches',
    );
  });

  it('localizes ranges, controls and accessible page names', () => {
    useInterfaceLanguage.setState({ locale: 'fr-FR' });
    renderPages(2);
    expect(screen.getByRole('status')).toHaveTextContent(
      '9 à 16 sur 23 rediffusions',
    );
    expect(
      screen.getByRole('button', { name: 'Page précédente' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Page suivante' })).toBeTruthy();
    expect(screen.getByTestId('page-of')).toHaveTextContent('Page 2 sur 3');
  });
});

describe('CursorPagination', () => {
  it('says where the page sits when the walk is known', () => {
    render(
      <CursorPagination
        shown={8}
        offset={8}
        pageSize={8}
        total={23}
        hasPrevious
        hasNext
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        noun={replays}
        label="Recent replay pages"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 9–16 of 23 replays',
    );
    const nav = screen.getByRole('navigation', { name: 'Recent replay pages' });
    expect(nav).toHaveTextContent('Page 2 of 3');
  });

  it('falls back to a count for a page opened from a shared link', () => {
    render(
      <CursorPagination
        shown={8}
        offset={null}
        pageSize={8}
        total={23}
        hasPrevious
        hasNext={false}
        onPrevious={vi.fn()}
        onNext={vi.fn()}
        noun={replays}
        label="Recent replay pages"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Showing 8 of 23 replays',
    );
    expect(screen.getByRole('button', { name: 'Next page' })).toHaveAttribute(
      'aria-disabled',
      'true',
    );
  });
});

describe('LoadMore', () => {
  it('loads more, shows progress and then the end', async () => {
    const onLoadMore = vi.fn();
    const { rerender } = render(
      <LoadMore
        shown={50}
        hasMore
        onLoadMore={onLoadMore}
        noun={PAGINATION_NOUNS.activity}
        label="More activity"
      />,
    );
    expect(
      screen.getByRole('navigation', { name: 'More activity' }),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Show more' }));
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    rerender(
      <LoadMore
        shown={50}
        hasMore
        isLoading
        onLoadMore={onLoadMore}
        noun={PAGINATION_NOUNS.activity}
        label="More activity"
      />,
    );
    const busy = screen.getByRole('button', { name: 'Loading more…' });
    await userEvent.click(busy);
    expect(onLoadMore).toHaveBeenCalledTimes(1);
    rerender(
      <LoadMore
        shown={60}
        hasMore={false}
        onLoadMore={onLoadMore}
        noun={PAGINATION_NOUNS.activity}
        label="More activity"
      />,
    );
    expect(screen.getByText("You've reached the end.")).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Showing 60 entries');
  });

  it('localizes progress and actions', () => {
    useInterfaceLanguage.setState({ locale: 'es-ES' });
    render(
      <LoadMore
        shown={12}
        total={24}
        hasMore
        onLoadMore={vi.fn()}
        noun={PAGINATION_NOUNS.activity}
        label="Más actividad"
      />,
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Mostrando 12 de 24 entradas',
    );
    expect(screen.getByRole('button', { name: 'Mostrar más' })).toBeTruthy();
  });
});

describe('URL state', () => {
  it('syncs numbered pages to the query and follows Back', () => {
    const { result } = renderHook(() => useNumberedPage(6));
    expect(result.current.page).toBe(1);
    act(() => result.current.setPage(3));
    expect(window.location.search).toBe('?page=3');
    expect(result.current.page).toBe(3);
    act(() => result.current.setPageSize(12));
    expect(window.location.search).toBe('?size=12');
    expect(result.current).toMatchObject({ page: 1, pageSize: 12 });
    act(() => {
      window.history.replaceState(null, '', '/?page=3');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(result.current).toMatchObject({ page: 3, pageSize: 6 });
  });

  it('ignores a malformed page number', () => {
    window.history.replaceState(null, '', '/?page=-2');
    const { result } = renderHook(() => useNumberedPage(6));
    expect(result.current.page).toBe(1);
  });

  it('keeps a stack of cursors so Previous works on a forward-only list', () => {
    const { result } = renderHook(() => useCursorPage('spec-list'));
    expect(result.current).toMatchObject({ cursor: null, hasPrevious: false });
    act(() => result.current.goNext('c1', 8));
    act(() => result.current.goNext('c2', 8));
    expect(window.location.search).toBe('?after=c2');
    expect(result.current).toMatchObject({ cursor: 'c2', offset: 16 });
    act(() => result.current.goPrevious());
    expect(result.current).toMatchObject({ cursor: 'c1', offset: 8 });
    act(() => result.current.goPrevious());
    expect(window.location.search).toBe('');
    expect(result.current.hasPrevious).toBe(false);
  });
});

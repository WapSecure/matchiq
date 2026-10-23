'use client';

import { useState } from 'react';
import {
  CursorPagination,
  LoadMore,
  Pagination,
  SkeletonRows,
} from '@/components/ui/pagination';
import { PAGE_SIZES, PAGINATION_NOUNS } from '@/constants/pagination';
import { PAGINATION_GALLERY as G } from '@/constants/pagination-gallery';
import { GallerySection, Specimen } from './gallery-section';

const none = () => undefined;

function NumberedSpecimens() {
  const [page, setPage] = useState(2);
  const [size, setSize] = useState<number>(PAGE_SIZES.default[0]);
  const [many, setMany] = useState(6);
  return (
    <>
      <Specimen state={G.states.numbered} wide>
        <Pagination
          page={page}
          pageSize={size}
          total={G.total}
          onPageChange={setPage}
          pageSizeOptions={PAGE_SIZES.default}
          onPageSizeChange={(next) => {
            setSize(next);
            setPage(1);
          }}
          noun={PAGINATION_NOUNS.replays}
          label={G.numberedLabel}
        />
      </Specimen>
      <Specimen state={G.states.truncated} wide>
        <Pagination
          page={many}
          pageSize={G.manyPageSize}
          total={G.manyTotal}
          onPageChange={setMany}
          noun={PAGINATION_NOUNS.matches}
          label={G.truncatedLabel}
        />
      </Specimen>
    </>
  );
}

function CursorSpecimens() {
  const pageSize = PAGE_SIZES.replays;
  const [offset, setOffset] = useState<number>(pageSize);
  const shown = Math.min(pageSize, G.total - offset);
  return (
    <>
      <Specimen state={G.states.cursor} wide>
        <CursorPagination
          shown={shown}
          offset={offset}
          pageSize={pageSize}
          total={G.total}
          hasPrevious={offset > 0}
          hasNext={offset + shown < G.total}
          onPrevious={() => setOffset((o) => Math.max(0, o - pageSize))}
          onNext={() => setOffset((o) => o + pageSize)}
          noun={PAGINATION_NOUNS.replays}
          label={G.cursorLabel}
        />
      </Specimen>
      <Specimen state={G.states.cursorBusy}>
        <CursorPagination
          shown={pageSize}
          offset={0}
          pageSize={pageSize}
          total={G.total}
          hasPrevious={false}
          hasNext
          onPrevious={none}
          onNext={none}
          noun={PAGINATION_NOUNS.replays}
          label={G.cursorLabel}
          isLoading
        />
      </Specimen>
    </>
  );
}

function FeedSpecimens() {
  const [shown, setShown] = useState<number>(G.feedShown);
  return (
    <>
      <Specimen state={G.states.loadMore}>
        <LoadMore
          shown={shown}
          hasMore
          onLoadMore={() => setShown((n) => n + G.feedShown)}
          noun={PAGINATION_NOUNS.activity}
          label={G.moreLabel}
        />
      </Specimen>
      <Specimen state={G.states.loadMoreBusy}>
        <LoadMore
          shown={G.feedShown}
          hasMore
          isLoading
          onLoadMore={none}
          noun={PAGINATION_NOUNS.activity}
          label={G.moreLabel}
        />
      </Specimen>
      <Specimen state={G.states.end}>
        <LoadMore
          shown={G.total}
          total={G.total}
          hasMore={false}
          onLoadMore={none}
          noun={PAGINATION_NOUNS.moments}
          label={G.moreLabel}
        />
      </Specimen>
      <Specimen state={G.states.skeleton}>
        <SkeletonRows count={3} label={G.skeletonLabel} rowClassName="h-10" />
      </Specimen>
    </>
  );
}

export function PaginationSection() {
  return (
    <GallerySection title={G.section}>
      <NumberedSpecimens />
      <CursorSpecimens />
      <FeedSpecimens />
    </GallerySection>
  );
}

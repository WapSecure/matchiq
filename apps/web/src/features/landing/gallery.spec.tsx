import { render, screen, within } from '@testing-library/react';
import { CAPABILITIES, GALLERY, GUIDE_CTA } from '@/constants/landing-gallery';
import { CapabilitiesSection } from './capabilities-section';
import { GallerySection } from './gallery-section';
import { HeroSection } from './hero-section';

const JARGON = /foundry|azure|llm|json|schema|api|deterministic|metricRef/i;

describe('GallerySection', () => {
  beforeEach(() => render(<GallerySection />));

  it('renders four screenshots with alt text and captions', () => {
    const images = screen.getAllByRole('img');
    expect(images).toHaveLength(4);
    images.forEach((img, i) => {
      expect(img).toHaveAttribute('alt', GALLERY.shots[i].alt);
      expect(img).toHaveAttribute('width', '1280');
    });
    GALLERY.shots.forEach((shot) =>
      expect(screen.getByText(shot.caption)).toBeInTheDocument(),
    );
  });

  it('identifies the fact-checks screen as an earlier replay', () => {
    expect(screen.getByText(/earlier replay/i)).toBeInTheDocument();
  });

  it('has a heading per shot under one section heading', () => {
    const region = screen.getByRole('region', { name: GALLERY.title });
    expect(within(region).getAllByRole('heading', { level: 3 })).toHaveLength(
      4,
    );
  });

  it('uses no technical words', () => {
    const region = screen.getByRole('region', { name: GALLERY.title });
    expect(region.textContent).not.toMatch(JARGON);
  });
});

describe('CapabilitiesSection', () => {
  it('lists every capability in plain language', () => {
    render(<CapabilitiesSection />);
    const region = screen.getByRole('region', { name: CAPABILITIES.title });
    expect(within(region).getAllByRole('heading', { level: 3 })).toHaveLength(
      CAPABILITIES.items.length,
    );
    expect(region.textContent).not.toMatch(JARGON);
  });
});

describe('HeroSection tour link', () => {
  it('links to the guide', () => {
    render(<HeroSection />);
    expect(screen.getByRole('link', { name: GUIDE_CTA.label })).toHaveAttribute(
      'href',
      '/guide',
    );
  });
});

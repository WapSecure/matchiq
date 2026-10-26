import Image from 'next/image';
import { Container, SectionHeader } from '@/components/ui';
import { GALLERY } from '@/constants/landing-gallery';

export function GallerySection() {
  return (
    <section
      id={GALLERY.id}
      aria-labelledby={`${GALLERY.id}-title`}
      className="scroll-mt-20 border-t border-line py-20"
    >
      <Container>
        <SectionHeader
          id={GALLERY.id}
          eyebrow={GALLERY.eyebrow}
          title={GALLERY.title}
          description={GALLERY.description}
        />
        <ul className="mt-12 grid gap-8 md:grid-cols-2">
          {GALLERY.shots.map((shot) => (
            <li key={shot.key}>
              <figure>
                <Image
                  src={shot.src}
                  alt={shot.alt}
                  width={GALLERY.width}
                  height={GALLERY.height}
                  sizes="(min-width: 768px) 50vw, 100vw"
                  loading="lazy"
                  unoptimized
                  className="h-auto w-full rounded-lg border border-line-strong bg-ink/90 shadow-panel ring-1 ring-black/10"
                />
                <figcaption className="mt-3">
                  <h3 className="text-[15px] font-semibold tracking-tight text-ink">
                    {shot.title}
                  </h3>
                  <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                    {shot.caption}
                  </p>
                </figcaption>
              </figure>
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

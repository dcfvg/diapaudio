import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import SlideshowPlaceholder, {
  resolvePlaceholderSources,
  buildPlaceholderSignature,
} from '../SlideshowPlaceholder.jsx';

describe('SlideshowPlaceholder', () => {
  describe('resolvePlaceholderSources', () => {
    it('extracts URLs in priority order (previewUrl first)', () => {
      const image = {
        previewUrl: 'preview.jpg',
        thumbnailUrl: 'thumbnail.jpg',
        url: 'full.jpg',
      };
      const result = resolvePlaceholderSources({ previousImage: image });
      
      expect(result.previousSrc).toBe('preview.jpg');
    });

    it('falls back to thumbnailUrl when previewUrl is missing', () => {
      const image = {
        thumbnailUrl: 'thumbnail.jpg',
        url: 'full.jpg',
      };
      const result = resolvePlaceholderSources({ previousImage: image });
      
      expect(result.previousSrc).toBe('thumbnail.jpg');
    });

    it('falls back to url when preview and thumbnail are missing', () => {
      const image = { url: 'full.jpg' };
      const result = resolvePlaceholderSources({ previousImage: image });
      
      expect(result.previousSrc).toBe('full.jpg');
    });

    it('returns null when image has no URLs', () => {
      const image = { name: 'test.jpg' };
      const result = resolvePlaceholderSources({ previousImage: image });
      
      expect(result.previousSrc).toBe(null);
    });

    it('handles null image', () => {
      const result = resolvePlaceholderSources({ previousImage: null });
      
      expect(result.previousSrc).toBe(null);
    });

    it('handles undefined image', () => {
      const result = resolvePlaceholderSources({ previousImage: undefined });
      
      expect(result.previousSrc).toBe(null);
    });

    it('handles missing images object', () => {
      const result = resolvePlaceholderSources({});
      
      expect(result.previousSrc).toBe(null);
      expect(result.nextSrc).toBe(null);
    });

    it('resolves both previous and next images independently', () => {
      const previousImage = { previewUrl: 'prev.jpg' };
      const nextImage = { url: 'next.jpg' };
      
      const result = resolvePlaceholderSources({ previousImage, nextImage });
      
      expect(result.previousSrc).toBe('prev.jpg');
      expect(result.nextSrc).toBe('next.jpg');
    });

    it('handles only previousImage', () => {
      const previousImage = { url: 'prev.jpg' };
      
      const result = resolvePlaceholderSources({ previousImage });
      
      expect(result.previousSrc).toBe('prev.jpg');
      expect(result.nextSrc).toBe(null);
    });

    it('handles only nextImage', () => {
      const nextImage = { url: 'next.jpg' };
      
      const result = resolvePlaceholderSources({ nextImage });
      
      expect(result.previousSrc).toBe(null);
      expect(result.nextSrc).toBe('next.jpg');
    });

    it('handles empty URL strings', () => {
      const image = { previewUrl: '', url: 'full.jpg' };
      const result = resolvePlaceholderSources({ previousImage: image });
      
      // Empty string is falsy, should fall back
      expect(result.previousSrc).toBe('full.jpg');
    });
  });

  describe('buildPlaceholderSignature', () => {
    it('creates unique signature from sources and time', () => {
      const sig1 = buildPlaceholderSignature('a.jpg', 'b.jpg', 1000);
      const sig2 = buildPlaceholderSignature('a.jpg', 'b.jpg', 2000);
      
      expect(sig1).not.toBe(sig2);
      expect(sig1).toBe('a.jpg|b.jpg|1000');
      expect(sig2).toBe('a.jpg|b.jpg|2000');
    });

    it('creates different signatures for different sources', () => {
      const sig1 = buildPlaceholderSignature('a.jpg', 'b.jpg', 1000);
      const sig2 = buildPlaceholderSignature('x.jpg', 'y.jpg', 1000);
      
      expect(sig1).not.toBe(sig2);
    });

    it('handles null sources', () => {
      const sig = buildPlaceholderSignature(null, null, 1000);
      
      expect(sig).toBe('none|none|1000');
    });

    it('handles undefined sources', () => {
      const sig = buildPlaceholderSignature(undefined, undefined, 1000);
      
      expect(sig).toBe('none|none|1000');
    });

    it('handles mixed null and valid sources', () => {
      const sig1 = buildPlaceholderSignature('a.jpg', null, 1000);
      const sig2 = buildPlaceholderSignature(null, 'b.jpg', 1000);
      
      expect(sig1).toBe('a.jpg|none|1000');
      expect(sig2).toBe('none|b.jpg|1000');
    });

    it('handles invalid absoluteMs', () => {
      const sig1 = buildPlaceholderSignature('a.jpg', 'b.jpg', NaN);
      const sig2 = buildPlaceholderSignature('a.jpg', 'b.jpg', Infinity);
      
      expect(sig1).toBe('a.jpg|b.jpg|nan');
      expect(sig2).toBe('a.jpg|b.jpg|nan');
    });

    it('handles missing absoluteMs', () => {
      const sig1 = buildPlaceholderSignature('a.jpg', 'b.jpg', null);
      const sig2 = buildPlaceholderSignature('a.jpg', 'b.jpg', undefined);
      
      expect(sig1).toBe('a.jpg|b.jpg|nan');
      expect(sig2).toBe('a.jpg|b.jpg|nan');
    });

    it('handles zero absoluteMs', () => {
      const sig = buildPlaceholderSignature('a.jpg', 'b.jpg', 0);
      
      expect(sig).toBe('a.jpg|b.jpg|0');
    });

    it('handles negative absoluteMs', () => {
      const sig = buildPlaceholderSignature('a.jpg', 'b.jpg', -1000);
      
      expect(sig).toBe('a.jpg|b.jpg|-1000');
    });

    it('creates consistent signatures for same inputs', () => {
      const sig1 = buildPlaceholderSignature('test.jpg', 'next.jpg', 5000);
      const sig2 = buildPlaceholderSignature('test.jpg', 'next.jpg', 5000);
      
      expect(sig1).toBe(sig2);
    });
  });

  describe('SlideshowPlaceholder component', () => {
    it('renders with default className', () => {
      const { container } = render(<SlideshowPlaceholder />);
      
      const placeholder = container.querySelector('.slideshow__placeholder');
      expect(placeholder).toBeTruthy();
      expect(placeholder.classList.contains('slideshow__placeholder--hybrid')).toBe(true);
    });

    it('applies custom className', () => {
      const { container } = render(
        <SlideshowPlaceholder className="custom-class" />
      );
      
      const placeholder = container.querySelector('.slideshow__placeholder');
      expect(placeholder.classList.contains('custom-class')).toBe(true);
      expect(placeholder.classList.contains('slideshow__placeholder--hybrid')).toBe(true);
    });

    it('renders previous image when provided', () => {
      const image = { url: 'test.jpg' };
      const { container } = render(
        <SlideshowPlaceholder previousImage={image} />
      );
      
      const img = container.querySelector('.slideshow__placeholder-image--previous');
      expect(img).toBeTruthy();
      expect(img.src).toContain('test.jpg');
      expect(img.getAttribute('loading')).toBe('lazy');
    });

    it('renders next image when provided', () => {
      const image = { url: 'test.jpg' };
      const { container } = render(
        <SlideshowPlaceholder nextImage={image} />
      );
      
      const img = container.querySelector('.slideshow__placeholder-image--next');
      expect(img).toBeTruthy();
      expect(img.src).toContain('test.jpg');
    });

    it('renders both images when both provided', () => {
      const prevImage = { url: 'prev.jpg' };
      const nextImage = { url: 'next.jpg' };
      
      const { container } = render(
        <SlideshowPlaceholder
          previousImage={prevImage}
          nextImage={nextImage}
        />
      );
      
      const images = container.querySelectorAll('.slideshow__placeholder-image');
      expect(images.length).toBe(2);
      
      const prevImg = container.querySelector('.slideshow__placeholder-image--previous');
      const nextImg = container.querySelector('.slideshow__placeholder-image--next');
      
      expect(prevImg.src).toContain('prev.jpg');
      expect(nextImg.src).toContain('next.jpg');
    });

    it('renders empty when no images provided', () => {
      const { container } = render(<SlideshowPlaceholder />);
      
      const images = container.querySelectorAll('.slideshow__placeholder-image');
      expect(images.length).toBe(0);
    });

    it('does not render previous image when URL is missing', () => {
      const image = { name: 'test.jpg' }; // No URL
      const { container } = render(
        <SlideshowPlaceholder previousImage={image} />
      );
      
      const img = container.querySelector('.slideshow__placeholder-image--previous');
      expect(img).toBeFalsy();
    });

    it('does not render next image when URL is missing', () => {
      const image = { name: 'test.jpg' }; // No URL
      const { container } = render(
        <SlideshowPlaceholder nextImage={image} />
      );
      
      const img = container.querySelector('.slideshow__placeholder-image--next');
      expect(img).toBeFalsy();
    });

    it('uses previewUrl over thumbnailUrl over url', () => {
      const image = {
        previewUrl: 'preview.jpg',
        thumbnailUrl: 'thumb.jpg',
        url: 'full.jpg',
      };
      const { container } = render(
        <SlideshowPlaceholder previousImage={image} />
      );
      
      const img = container.querySelector('.slideshow__placeholder-image--previous');
      expect(img.src).toContain('preview.jpg');
    });

    it('sets alt attribute to empty string', () => {
      const image = { url: 'test.jpg' };
      const { container } = render(
        <SlideshowPlaceholder previousImage={image} />
      );
      
      const img = container.querySelector('.slideshow__placeholder-image--previous');
      expect(img.alt).toBe('');
    });

    it('applies lazy loading to images', () => {
      const image = { url: 'test.jpg' };
      const { container } = render(
        <SlideshowPlaceholder previousImage={image} nextImage={image} />
      );
      
      const images = container.querySelectorAll('.slideshow__placeholder-image');
      images.forEach((img) => {
        expect(img.getAttribute('loading')).toBe('lazy');
      });
    });

    it('handles null images gracefully', () => {
      const { container } = render(
        <SlideshowPlaceholder previousImage={null} nextImage={null} />
      );
      
      const images = container.querySelectorAll('.slideshow__placeholder-image');
      expect(images.length).toBe(0);
    });

    it('trims className correctly', () => {
      const { container } = render(
        <SlideshowPlaceholder className="  custom   " />
      );
      
      const placeholder = container.querySelector('.slideshow__placeholder');
      // Component joins with spaces and trims, but the input "  custom   " becomes "custom"
      // Result: "slideshow__placeholder slideshow__placeholder--hybrid custom"
      expect(placeholder.classList.contains('slideshow__placeholder')).toBe(true);
      expect(placeholder.classList.contains('slideshow__placeholder--hybrid')).toBe(true);
      expect(placeholder.classList.contains('custom')).toBe(true);
    });
  });
});

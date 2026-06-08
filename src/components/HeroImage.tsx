import { useState } from 'react';
import type { Hero } from '../types';
import { imageUrl, initials } from '../domain/heroes';

interface HeroImageProps {
  hero: Hero;
  className?: string;
}

export function HeroImage({ hero, className }: HeroImageProps) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="fallback visible">{initials(hero)}</span>;
  return <img className={className} src={imageUrl(hero.id)} alt={hero.name} onError={() => setFailed(true)} />;
}

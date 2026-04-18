export interface ArtStyle {
  id: string;
  label: string;
  gradient: string;
}

export const artPreviewFileOverrides: Record<string, string> = {
  pixel_art: "pixel",
  childrens_book: "childrens",
};

export const artPreviewMissing = new Set<string>([]);

export function artPreviewSrc(id: string): string | null {
  if (artPreviewMissing.has(id)) return null;
  const filename = artPreviewFileOverrides[id] ?? id;
  return `/art_style_previews/${filename}.png`;
}

export const ART_STYLES: ArtStyle[] = [
  // ── Existing 36 styles ──
  { id: "anime", label: "Anime", gradient: "from-pink-500 to-violet-600" },
  { id: "ghibli", label: "Ghibli", gradient: "from-green-400 to-cyan-500" },
  { id: "pixel_art", label: "Pixel Art", gradient: "from-emerald-400 to-lime-500" },
  { id: "comic", label: "Comic", gradient: "from-yellow-400 to-orange-500" },
  { id: "lego", label: "Lego", gradient: "from-red-400 to-yellow-500" },
  { id: "dark_fantasy", label: "Dark Fantasy", gradient: "from-slate-700 to-purple-900" },
  { id: "watercolor", label: "Watercolor", gradient: "from-sky-300 to-rose-300" },
  { id: "3d_toon", label: "3D Toon", gradient: "from-blue-400 to-indigo-500" },
  { id: "film_noir", label: "Film Noir", gradient: "from-zinc-600 to-zinc-900" },
  { id: "painting", label: "Painting", gradient: "from-amber-500 to-rose-600" },
  { id: "minecraft", label: "Minecraft", gradient: "from-green-600 to-emerald-800" },
  { id: "realism", label: "Realism", gradient: "from-amber-600 to-stone-700" },
  { id: "charcoal", label: "Charcoal", gradient: "from-neutral-500 to-neutral-800" },
  { id: "cinematic", label: "Cinematic", gradient: "from-slate-800 to-amber-700" },
  { id: "creepy_comic", label: "Creepy Comic", gradient: "from-red-800 to-zinc-900" },
  { id: "disney", label: "Disney", gradient: "from-sky-400 to-pink-400" },
  { id: "mythology", label: "Mythology", gradient: "from-amber-500 to-stone-800" },
  { id: "polaroid", label: "Polaroid", gradient: "from-amber-200 to-stone-400" },
  { id: "gtav", label: "GTAV", gradient: "from-orange-500 to-sky-600" },
  { id: "expressionism", label: "Expressionism", gradient: "from-fuchsia-500 to-yellow-500" },
  { id: "childrens_book", label: "Children's Book", gradient: "from-yellow-300 to-pink-400" },
  { id: "adult_cartoon", label: "Adult Cartoon", gradient: "from-rose-500 to-orange-400" },
  { id: "bw_comic", label: "B&W Comic", gradient: "from-zinc-300 to-zinc-800" },
  { id: "whiteboard", label: "Whiteboard", gradient: "from-gray-100 to-gray-300" },
  { id: "low_poly", label: "Low Poly", gradient: "from-teal-400 to-blue-600" },
  { id: "modern_cartoon", label: "Modern Cartoon", gradient: "from-red-400 to-teal-400" },
  { id: "fantastic", label: "Fantastic", gradient: "from-cyan-500 to-blue-700" },
  { id: "pixar", label: "Pixar", gradient: "from-orange-300 to-red-400" },
  { id: "simpsons", label: "Simpsons", gradient: "from-yellow-400 to-orange-500" },
  { id: "90s_disney", label: "90s Disney", gradient: "from-fuchsia-400 to-purple-600" },
  { id: "historical_18th", label: "18th Century", gradient: "from-amber-300 to-amber-700" },
  { id: "comic_realism", label: "Comic Realism", gradient: "from-red-500 to-slate-800" },
  { id: "2d_hand_drawn", label: "2D Hand Drawn", gradient: "from-orange-200 to-amber-400" },
  { id: "creepy_toon", label: "Creepy Toon", gradient: "from-purple-900 to-slate-900" },
  { id: "dark_comic", label: "Dark Comic", gradient: "from-green-800 to-green-950" },
  { id: "cute_anime", label: "Cute Anime", gradient: "from-pink-300 to-pink-500" },
  // ── 9 new styles ──
  { id: "flat_vector_dark", label: "Flat Vector Dark", gradient: "from-indigo-900 to-purple-900" },
  { id: "flat_vector_light", label: "Flat Vector Light", gradient: "from-slate-200 to-stone-300" },
  { id: "gradient_mesh", label: "Gradient Mesh", gradient: "from-pink-300 to-indigo-400" },
  { id: "soft_3d_diorama", label: "Soft 3D", gradient: "from-rose-200 to-violet-300" },
  { id: "neubrutalism", label: "Neubrutalism", gradient: "from-yellow-300 to-pink-500" },
  { id: "risograph", label: "Risograph", gradient: "from-pink-400 to-teal-400" },
  { id: "corkboard", label: "Corkboard", gradient: "from-amber-700 to-stone-600" },
  { id: "notebook_paper", label: "Notebook", gradient: "from-amber-100 to-blue-300" },
  { id: "anatomical", label: "Anatomical", gradient: "from-red-300 to-rose-400" },
];

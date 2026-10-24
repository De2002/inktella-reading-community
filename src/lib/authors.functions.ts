import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getAuthorCatalogueDetails = createServerFn({ method: "GET" })
  .inputValidator((input: { key?: string | null; name: string }) => z.object({ key: z.string().regex(/^\/authors\/OL\d+A$/).nullable().optional(), name: z.string().trim().min(1).max(200) }).parse(input))
  .handler(async ({ data }) => {
    try {
      let key = data.key;
      if (!key) {
        const search = await fetch(`https://openlibrary.org/search/authors.json?q=${encodeURIComponent(data.name)}&limit=5`, { signal: AbortSignal.timeout(8000) });
        if (!search.ok) return null;
        const matches = await search.json() as { docs?: { name: string; key: string }[] };
        const match = matches.docs?.find((author) => author.name.toLowerCase() === data.name.toLowerCase());
        if (!match || !/^OL\d+A$/.test(match.key)) return null;
        key = `/authors/${match.key}`;
      }
      const response = await fetch(`https://openlibrary.org${key}.json`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) return null;
      const author = await response.json() as { bio?: string | { value?: string }; alternate_names?: string[]; photos?: number[]; birth_date?: string; death_date?: string };
      const photo = author.photos?.find((id) => id > 0);
      return {
        bio: (typeof author.bio === "string" ? author.bio : author.bio?.value ?? "").slice(0, 20000),
        alternate_names: (author.alternate_names ?? []).filter((name) => typeof name === "string").slice(0, 30),
        photo_url: photo ? `https://covers.openlibrary.org/a/id/${photo}-L.jpg?default=false` : null,
        birth_date: author.birth_date ?? null,
        death_date: author.death_date ?? null,
      };
    } catch { return null; }
  });
export interface Heading {
  depth: number;
  slug: string;
  text: string;
}

export interface BlogCardProps {
  title: string;
  description: string;
  pubDate: Date;
  slug: string;
  externalUrl?: string;
}

export interface VenueDto {
  key: string;
  name: string;
  tagline: string;
  description: string;
  seated: number | null;
  standing: number | null;
  features: string[];
  suitableFor: string[];
  imageUrl: string | null;
}

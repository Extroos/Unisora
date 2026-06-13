export interface LinkPreview {
  url: string;
  title?: string;
  description?: string;
  image?: string;
  siteName?: string;
}

export const extractLinks = (text: string): string[] => {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  return text.match(urlRegex) || [];
};

// This is a mock function as we don't have a backend to scrape OG tags
export const fetchLinkPreview = async (url: string): Promise<LinkPreview | null> => {
  // Return mock data for common domains
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    return {
      url,
      title: 'A Beautiful Day in the Neighborhood - Official Trailer',
      description: 'Tom Hanks is Mister Rogers in TriStar Pictures’ A BEAUTIFUL DAY IN THE NEIGHBORHOOD.',
      image: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?auto=format&fit=crop&q=80&w=800',
      siteName: 'YouTube'
    };
  }
  
  if (url.includes('github.com')) {
    return {
      url,
      title: 'supabase/supabase: The open source Firebase alternative.',
      description: 'The open source Firebase alternative. Build your own backend in less than 2 minutes.',
      image: 'https://images.unsplash.com/photo-1618401471353-b98afee0b2eb?auto=format&fit=crop&q=80&w=800',
      siteName: 'GitHub'
    };
  }

  if (url.includes('unsplash.com')) {
    return {
      url,
      title: 'Beautiful Free Images & Pictures | Unsplash',
      description: 'Beautiful, free images and photos that you can download and use for any project.',
      image: url,
      siteName: 'Unsplash'
    };
  }

  return {
    url,
    title: url.replace('https://', '').split('/')[0],
    description: 'No description available for this link.',
    siteName: 'Web'
  };
};

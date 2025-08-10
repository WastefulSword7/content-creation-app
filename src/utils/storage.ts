// Storage utilities for the Content Creation App

export interface Character {
  id: string;
  name: string;
  imageUrl: string;
  dateCreated: string;
}

export interface ScrapingSession {
  id: string;
  name: string;
  type: 'hashtag' | 'account';
  data: any[];
  dateCreated: string;
}

export interface GeneratedVideo {
  id: string;
  characterId: string;
  characterName: string;
  videoUrl: string;
  textContent: string;
  dateCreated: string;
}

// User-specific storage keys
export const getStorageKey = (userId: string, dataType: string) => `cca_${dataType}_${userId}`;

// Character storage functions
export const loadCharacters = (userId: string): Character[] => {
  try {
    const saved = localStorage.getItem(getStorageKey(userId, 'characters'));
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Failed to load characters:', err);
    return [];
  }
};

export const saveCharacters = (userId: string, characters: Character[]): void => {
  try {
    localStorage.setItem(getStorageKey(userId, 'characters'), JSON.stringify(characters));
  } catch (err) {
    console.error('Failed to save characters:', err);
  }
};

// Scraping session storage functions
export const loadScrapingSessions = (userId: string): ScrapingSession[] => {
  try {
    const saved = localStorage.getItem(getStorageKey(userId, 'scraping_sessions'));
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Failed to load scraping sessions:', err);
    return [];
  }
};

export const saveScrapingSessions = (userId: string, sessions: ScrapingSession[]): void => {
  try {
    localStorage.setItem(getStorageKey(userId, 'scraping_sessions'), JSON.stringify(sessions));
  } catch (err) {
    console.error('Failed to save scraping sessions:', err);
  }
};

// Generated video storage functions
export const loadGeneratedVideos = (userId: string): GeneratedVideo[] => {
  try {
    const saved = localStorage.getItem(getStorageKey(userId, 'generated_videos'));
    return saved ? JSON.parse(saved) : [];
  } catch (err) {
    console.error('Failed to load generated videos:', err);
    return [];
  }
};

export const saveGeneratedVideos = (userId: string, videos: GeneratedVideo[]): void => {
  try {
    localStorage.setItem(getStorageKey(userId, 'generated_videos'), JSON.stringify(videos));
  } catch (err) {
    console.error('Failed to save generated videos:', err);
  }
};

// File to data URL conversion
export const fileToDataUrl = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// Clear all user data (for logout)
export const clearUserData = (userId: string): void => {
  try {
    localStorage.removeItem(getStorageKey(userId, 'characters'));
    localStorage.removeItem(getStorageKey(userId, 'scraping_sessions'));
    localStorage.removeItem(getStorageKey(userId, 'generated_videos'));
  } catch (err) {
    console.error('Failed to clear user data:', err);
  }
};

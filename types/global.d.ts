// Global type definitions for the project

declare module "config" {
  const config: {
    NCBIAPIKey?: string;
    [key: string]: any;
  };
  export default config;
}

// Extend Window interface for existingRequest
interface Window {
  existingRequest?: {
    id?: string;
    janCode?: string;
    species?: string;
    secondSpecies?: string;
    samples?: any[];
    constructs?: any[];
    supportingImages?: any[];
    isClone?: boolean;
  };
  supportedFileTypes?: string[];
}

// Global supportedFileTypes
declare var supportedFileTypes: string[] | undefined;

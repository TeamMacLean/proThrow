// Browser-safe config for frontend
// This file is used by webpack as an alias for config imports in frontend code
// Sensitive values are NOT included - only what's needed for the frontend

const config = {
  // Supported file types for image uploads
  supportedFileTypes: [
    ".png",
    ".PNG",
    ".jpg",
    ".JPG",
    ".jpeg",
    ".JPEG",
    ".gif",
    ".GIF",
  ],

  // Image upload paths (relative URLs)
  supportingImageRootURL: "/uploads/",
  supportingImagePreviewRootURL: "/preview/",

  // Base URL - use current origin for relative URLs
  baseURL: "",
};

export default config;

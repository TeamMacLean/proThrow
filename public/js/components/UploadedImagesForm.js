import { useState, useEffect } from "react";

/**
 * Component for managing previously uploaded images in the edit form.
 * Allows users to edit descriptions and mark images for deletion.
 *
 * @param {Function} onUploadedImagesChange - Callback when images state changes
 * @param {Array} initialUploadedImages - Array of existing image objects
 */
const UploadedImagesForm = ({
  onUploadedImagesChange,
  initialUploadedImages,
}) => {
  const [images, setImages] = useState(initialUploadedImages);

  // Notify parent component when images change
  useEffect(() => {
    onUploadedImagesChange(images);
  }, [images, onUploadedImagesChange]);

  /**
   * Generic helper to update a single image's properties by index.
   * Reduces code duplication between description and delete handlers.
   */
  const updateImageAtIndex = (index, updates) => {
    setImages((prevImages) =>
      prevImages.map((image, i) =>
        i === index ? { ...image, ...updates } : image
      )
    );
  };

  const handleDescriptionChange = (index, description) => {
    updateImageAtIndex(index, { description, editedDescription: true });
  };

  const toggleDeleteImage = (index) => {
    setImages((prevImages) =>
      prevImages.map((image, i) =>
        i === index ? { ...image, deleteRequest: !image.deleteRequest } : image
      )
    );
  };

  /**
   * Generates preview URL for each image based on its uid.
   * Memoized to avoid recalculating on every render.
   */
  const imagesWithPreviews = images.map((image) => ({
    ...image,
    preview: `/uploads/${image.uid}`,
  }));

  if (!imagesWithPreviews.length) {
    return <div>No images to display.</div>;
  }

  return (
    <div>
      {imagesWithPreviews.map((image, index) => (
        <ImageEditCard
          key={image.id || index}
          image={image}
          index={index}
          onDescriptionChange={handleDescriptionChange}
          onToggleDelete={toggleDeleteImage}
        />
      ))}
    </div>
  );
};

/**
 * Individual image card component for editing.
 * Separated for better readability and potential reuse.
 */
const ImageEditCard = ({
  image,
  index,
  onDescriptionChange,
  onToggleDelete,
}) => {
  const containerStyle = {
    display: "flex",
    alignItems: "flex-start",
    marginBottom: "15px",
    padding: "10px",
    border: "1px solid #ddd",
    borderRadius: "5px",
    opacity: image.deleteRequest ? 0.5 : 1,
    backgroundColor: image.deleteRequest ? "#fee" : "transparent",
  };

  return (
    <div style={containerStyle}>
      <img
        src={image.preview}
        alt={`preview ${index}`}
        style={{
          width: "100px",
          height: "100px",
          marginRight: "20px",
          objectFit: "cover",
        }}
        className="img-thumbnail"
      />
      <div style={{ flexGrow: 1 }}>
        <div className="form-group mb-2">
          <label className="form-label small text-muted">Description</label>
          <input
            type="text"
            className="form-control"
            value={image.description || ""}
            onChange={(e) => onDescriptionChange(index, e.target.value)}
            placeholder="Enter image description"
            disabled={image.deleteRequest}
          />
        </div>
        <button
          type="button"
          className={`btn btn-sm ${image.deleteRequest ? "btn-secondary" : "btn-danger"}`}
          onClick={() => onToggleDelete(index)}
        >
          {image.deleteRequest ? "Undo Remove" : "Remove Image"}
        </button>
        {image.deleteRequest && (
          <span className="text-danger ms-2 small">
            Will be deleted on save
          </span>
        )}
      </div>
    </div>
  );
};

export default UploadedImagesForm;

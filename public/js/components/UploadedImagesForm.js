import { useState, useEffect, useRef } from "react";

/**
 * Component for managing previously uploaded images in the edit form.
 * Allows users to edit descriptions and mark images for deletion.
 *
 * @param {Function} onUploadedImagesChange - Callback when images state changes
 * @param {Array} initialUploadedImages - Array of existing image objects
 */
const UploadedImagesForm = ({
  onUploadedImagesChange,
  initialUploadedImages = [],
}) => {
  const [images, setImages] = useState(initialUploadedImages);

  // The parent's callback is read through a ref rather than being listed as an
  // effect dependency. Listing it meant that any parent which recreated the
  // function each render - as this one did - fired the effect, set state in the
  // parent, re-rendered, and looped until React aborted with "Maximum update
  // depth exceeded" on every edit page that had images.
  const onChangeRef = useRef(onUploadedImagesChange);
  useEffect(() => {
    onChangeRef.current = onUploadedImagesChange;
  });

  useEffect(() => {
    onChangeRef.current?.(images);
  }, [images]);

  /**
   * Generic helper to update a single image's properties by index.
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

  const imagesWithPreviews = images.map((image) => ({
    ...image,
    // Records saved before previewUid existed have no reliable preview file, so
    // fall back to the full-size upload rather than a broken image.
    preview: image.previewUid
      ? `/preview/${image.previewUid}`
      : `/uploads/${image.uid}`,
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
          <label className="small text-muted">Description</label>
          <input
            type="text"
            className="form-control"
            maxLength="100"
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
          <span className="text-danger ml-2 small">Will be deleted on save</span>
        )}
      </div>
    </div>
  );
};

export default UploadedImagesForm;

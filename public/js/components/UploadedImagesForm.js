import React, { useState, useEffect } from "react";
import Dropzone from "react-dropzone";
import Resizer from "react-image-file-resizer";
import path from "path";

const UploadedImagesForm = ({
  onUploadedImagesChange,
  initialUploadedImages,
}) => {
  const [images, setImages] = useState(initialUploadedImages);

  useEffect(() => {
    onUploadedImagesChange(images);
  }, [images]);

  const handleDescriptionChange = (index, description) => {
    setImages((prevImages) =>
      prevImages.map((image, i) =>
        i === index ? { ...image, description } : image
      )
    );
  };

  const removeImage = (index) => {
    setImages((prevImages) => prevImages.filter((_, i) => i !== index));
  };

  const dropzoneStyle = {
    border: "2px dashed #007bff",
    padding: "20px",
    textAlign: "center",
    cursor: "pointer",
  };

  const imageContainerStyle = {
    display: "flex",
    alignItems: "center",
    marginBottom: "10px",
  };

  const descriptionInputStyle = {
    width: "100%",
    maxWidth: "100%",
    marginTop: "5px",
  };

  const maxSizeBytes = 2 * 1024 * 1024; // 2MB

  const newImages = images.map((image) => {
    // temp hack until we get actual preview images loading
    const newPreviewPath = path.join("/", "uploads", image.uid);
    return {
      ...image,
      preview: newPreviewPath,
    };
  });

  return (
    <div>
      <div>
        {newImages && newImages.length ? (
          newImages.map((image, index) => (
            <div key={index} style={imageContainerStyle}>
              <img
                src={image.preview}
                alt={`preview ${index}`}
                style={{
                  width: "100px",
                  height: "100px",
                  marginRight: "20px",
                }}
                className="img-thumbnail"
              />
              <div style={{ flexGrow: 1 }}>
                {image.description || "No description provided"}
                {/* <button
                  className="btn btn-outline-danger btn-sm"
                  onClick={() => removeImage(index)}
                >
                  Remove
                </button>
                <input
                  type="text"
                  className="form-control mt-2"
                  placeholder="Description"
                  maxLength="100"
                  value={image.description}
                  onChange={(e) =>
                    handleDescriptionChange(index, e.target.value)
                  }
                  style={descriptionInputStyle}
                /> */}
              </div>
            </div>
          ))
        ) : (
          <div>No images to display.</div>
        )}
      </div>
    </div>
  );
};

export default UploadedImagesForm;

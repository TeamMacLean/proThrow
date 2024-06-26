import React, { useState, useEffect } from "react";
import Dropzone from "react-dropzone";
import Resizer from "react-image-file-resizer";

const ImageUploadForm = ({
  onImagesChange,
  initialImages,
  supportedFileTypes, // TODO incorporate
}) => {
  const [images, setImages] = useState(initialImages);
  const [error, setError] = useState("");

  useEffect(() => {
    onImagesChange(images);
  }, [images]);

  const handleDrop = (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles && rejectedFiles.length > 0) {
      setError(
        "Some files were rejected. Only .png .PNG .jpg .JPG .jpeg .JPEG .gif .GIF files are accepted. 2MB is the maximum allowed file size. No more than 5 files are allowed."
      );
      return;
    }

    if (
      (images ? images.length : 0) +
        (acceptedFiles ? acceptedFiles.length : 0) >
      5
    ) {
      setError("You can only upload up to 5 files.");
      return;
    }

    setError(""); // Clear any previous errors

    acceptedFiles.forEach((file) => {
      if (file.size > maxSizeBytes) {
        setError(`File ${file.name} exceeds the 2MB size limit.`);
        return;
      }

      Resizer.imageFileResizer(
        file,
        300,
        300,
        "JPEG",
        100,
        0,
        (uri) => {
          setImages((prevImages) => [
            ...prevImages,
            { file, preview: uri, description: "" },
          ]);
        },
        "base64"
      );
    });
  };

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

  return (
    <div>
      <Dropzone
        onDrop={handleDrop}
        accept={{
          "image/png": [".png", ".PNG"],
          "image/jpeg": [".jpg", ".JPG", ".jpeg", ".JPEG"],
          "image/gif": [".gif", ".GIF"],
        }}
        multiple
        maxFiles={5}
        maxSize={maxSizeBytes}
      >
        {({ getRootProps, getInputProps, rejectedFiles }) => (
          <div {...getRootProps()} style={dropzoneStyle}>
            <input {...getInputProps()} />
            <p>Drag 'n' drop some files here, or click to select files</p>
            {rejectedFiles && rejectedFiles.length > 0 && (
              <p className="text-danger">
                Some files were rejected. Only .png .PNG .jpg .JPG .jpeg .JPEG
                .gif .GIF files are accepted. 2MB is the maximum allowed file
                size. No more than 5 files are allowed.
              </p>
            )}
          </div>
        )}
      </Dropzone>
      {error && <p className="text-danger">{error}</p>}
      <div>
        {images.map((image, index) => (
          <div key={index} style={imageContainerStyle}>
            <img
              src={image.preview}
              alt={`preview ${index}`}
              style={{ width: "100px", height: "100px", marginRight: "10px" }}
              className="img-thumbnail"
            />
            <div style={{ flexGrow: 1 }}>
              <button
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
                onChange={(e) => handleDescriptionChange(index, e.target.value)}
                style={descriptionInputStyle}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ImageUploadForm;

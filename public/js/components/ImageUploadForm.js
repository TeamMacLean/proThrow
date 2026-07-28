import { useState, useEffect, useRef } from "react";
import Dropzone from "react-dropzone";
import Resizer from "react-image-file-resizer";

const MAX_FILES = 5;
const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
// If a resize never calls back (a corrupt file that never fires onload), give
// up rather than leaving the submit button disabled forever.
const RESIZE_TIMEOUT_MS = 15000;

/**
 * Drag-and-drop upload for new supporting images.
 *
 * @param {object} props
 * @param {Function} props.onImagesChange - called with the current image list
 * @param {Function} [props.onPendingCountChange] - called with the number of
 *   images still being resized, so the parent can block submission until the
 *   previews exist. Submitting mid-resize used to drop the image silently.
 * @param {Array} [props.initialImages]
 * @param {string[]} [props.supportedFileTypes]
 */
const ImageUploadForm = ({
  onImagesChange,
  onPendingCountChange,
  initialImages = [],
  supportedFileTypes = [],
}) => {
  const [images, setImages] = useState(initialImages);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState("");

  // Held in refs so the effects below do not depend on the parent's callback
  // identity: a parent that recreates these on every render would otherwise
  // drive an endless render loop through this component's effects.
  const onImagesChangeRef = useRef(onImagesChange);
  const onPendingCountChangeRef = useRef(onPendingCountChange);
  useEffect(() => {
    onImagesChangeRef.current = onImagesChange;
    onPendingCountChangeRef.current = onPendingCountChange;
  });

  useEffect(() => {
    onImagesChangeRef.current?.(images);
  }, [images]);

  useEffect(() => {
    onPendingCountChangeRef.current?.(pendingCount);
  }, [pendingCount]);

  const acceptedExtensions = supportedFileTypes.length
    ? supportedFileTypes.join(" ")
    : ".png .jpg .jpeg .gif";

  const handleDrop = (acceptedFiles, rejectedFiles) => {
    if (rejectedFiles && rejectedFiles.length > 0) {
      setError(
        `Some files were rejected. Only ${acceptedExtensions} files are accepted. 2MB is the maximum allowed file size. No more than ${MAX_FILES} files are allowed.`
      );
      return;
    }

    if (images.length + (acceptedFiles ? acceptedFiles.length : 0) > MAX_FILES) {
      setError(`You can only upload up to ${MAX_FILES} files.`);
      return;
    }

    setError("");

    acceptedFiles.forEach((file) => {
      if (file.size > MAX_SIZE_BYTES) {
        setError(`File ${file.name} exceeds the 2MB size limit.`);
        return;
      }

      setPendingCount((count) => count + 1);

      let settled = false;
      const settle = () => {
        if (settled) return false;
        settled = true;
        clearTimeout(timeoutId);
        setPendingCount((count) => Math.max(0, count - 1));
        return true;
      };

      const timeoutId = setTimeout(() => {
        if (settle()) {
          setError(`Could not generate a preview for ${file.name}.`);
        }
      }, RESIZE_TIMEOUT_MS);

      try {
        Resizer.imageFileResizer(
          file,
          300,
          300,
          "JPEG",
          100,
          0,
          (uri) => {
            if (!settle()) return;
            setImages((prevImages) => [
              ...prevImages,
              { file, preview: uri, description: "" },
            ]);
          },
          "base64"
        );
      } catch (err) {
        console.error("Image resize failed:", err);
        if (settle()) {
          setError(`Could not generate a preview for ${file.name}.`);
        }
      }
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
        maxFiles={MAX_FILES}
        maxSize={MAX_SIZE_BYTES}
      >
        {({ getRootProps, getInputProps }) => (
          <div {...getRootProps()} style={dropzoneStyle}>
            <input {...getInputProps()} />
            <p>Drag 'n' drop some files here, or click to select files</p>
          </div>
        )}
      </Dropzone>
      {error && <p className="text-danger">{error}</p>}
      {pendingCount > 0 && (
        <p className="text-muted">
          Preparing {pendingCount} image{pendingCount === 1 ? "" : "s"}...
        </p>
      )}
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
              {/* Without an explicit type this defaults to submit and posts the
                  whole form when the admin only wanted to drop an image. */}
              <button
                type="button"
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

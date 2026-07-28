import { useState, useEffect, useCallback, useRef } from "react";
import dragula from "dragula";
import "dragula/dist/dragula.css";
import Toastify from "toastify-js";
import "toastify-js/src/toastify.css";
import $ from "jquery";
import AsyncSelect from "react-select/async";
import axios from "axios";
import config from "config";
import { FORM_OPTIONS } from "../../../lib/formOptions";
import Construct from "./Construct";
import Sample from "./Sample";
import OptionWithChildAsValue from "./OptionWithChildAsValue";
import ImageUploadForm from "./ImageUploadForm";
import UploadedImagesForm from "./UploadedImagesForm";

const supportedFileTypes = config.supportedFileTypes;

/** Delay before a species keystroke triggers a lookup. */
const SPECIES_SEARCH_DEBOUNCE_MS = 300;

const s4 = () =>
  Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1);
const guid = () =>
  s4() + s4() + "-" + s4() + "-" + s4() + "-" + s4() + "-" + s4() + s4() + s4();

/**
 * Auto-grow a textarea to fit its content.
 *
 * Defined once at module scope so that passing it as a ref callback does not
 * hand React a new function identity on every render, which would make it
 * detach and re-attach (and re-measure every textarea) on each keystroke.
 *
 * @param {HTMLTextAreaElement|null} el
 */
const autosizeTextarea = (el) => {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = el.scrollHeight + 2 + "px";
};

/**
 * Options for a select, including the stored value when it predates the current
 * list. Without this an older record whose value is no longer offered would
 * silently display (and then save) the first option instead.
 *
 * @param {string} field - key into FORM_OPTIONS
 * @param {string} currentValue - the value stored on the request, if any
 * @returns {string[]}
 */
const optionsFor = (field, currentValue) => {
  const options = FORM_OPTIONS[field];
  if (currentValue && !options.includes(currentValue)) {
    return [currentValue, ...options];
  }
  return options;
};

/**
 * Show a notification.
 *
 * @param {string} text
 * @param {"success"|"error"} kind
 * @param {number} duration
 */
const notify = (text, kind = "error", duration = 4500) =>
  Toastify({
    text,
    duration,
    gravity: "top",
    position: "right",
    style: { background: kind === "success" ? "green" : "red" },
  }).showToast();

// Helper function to convert base64 to Blob
const base64ToBlob = (base64, contentType) => {
  const byteCharacters = atob(base64.split(",")[1]);
  const byteArrays = [];
  for (let offset = 0; offset < byteCharacters.length; offset += 512) {
    const slice = byteCharacters.slice(offset, offset + 512);
    const byteNumbers = new Array(slice.length);
    for (let i = 0; i < slice.length; i++) {
      byteNumbers[i] = slice.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    byteArrays.push(byteArray);
  }
  return new Blob(byteArrays, { type: contentType });
};

const MyForm = () => {
  const hasPreExistingSupportingImages =
    window?.existingRequest?.supportingImages &&
    window.existingRequest.supportingImages.length > 0;

  const preExistingSupportingImagesObjList = hasPreExistingSupportingImages
    ? window.existingRequest.supportingImages.map((image) => ({
        ...image,
        deleteRequest: false,
        editedDescription: false,
      }))
    : [];

  const getInitialState = () => {
    if (!window.existingRequest) {
      return {
        samples: [],
        additionalSupportingImages: [],
        preExistingSupportingImages: [],
        constructs: [],
        notes: [],
        species: null,
        secondSpecies: null,
        initialValues: { species: null, secondSpecies: null },
        shouldUseInitial: { species: false, secondSpecies: false },
      };
    }

    const speciesOption = window.existingRequest.species
      ? {
          label: window.existingRequest.species,
          value: window.existingRequest.species,
          taxId: window.existingRequest.speciesTaxId || "",
        }
      : null;
    const secondSpeciesOption = window.existingRequest.secondSpecies
      ? {
          label: window.existingRequest.secondSpecies,
          value: window.existingRequest.secondSpecies,
          taxId: window.existingRequest.secondSpeciesTaxId || "",
        }
      : null;

    return {
      // Notes are held as {key, text} so that reordering or removing one does
      // not make React reuse the wrong textarea.
      notes: (window.existingRequest.notes || []).map((text) => ({
        key: guid(),
        text,
      })),
      // Every row gets a stable key up front. Cloned rows arrive with both `id`
      // and `key` cleared, which left React without a key and made the remove
      // handler - which matches on key and id - delete every keyless row at
      // once instead of just the one that was clicked.
      samples: (window.existingRequest.samples || []).map((sample) => ({
        ...sample,
        key: sample.key || guid(),
      })),
      preExistingSupportingImages: preExistingSupportingImagesObjList,
      additionalSupportingImages: [],
      constructs: (window.existingRequest.constructs || []).map(
        (construct) => ({ ...construct, key: construct.key || guid() })
      ),
      species: speciesOption,
      secondSpecies: secondSpeciesOption,
      initialValues: {
        species: speciesOption,
        secondSpecies: secondSpeciesOption,
      },
      shouldUseInitial: {
        species: !!window.existingRequest.species,
        secondSpecies: !!window.existingRequest.secondSpecies,
      },
    };
  };

  const [state, setState] = useState(getInitialState());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pendingImageCount, setPendingImageCount] = useState(0);
  const [isDirty, setIsDirty] = useState(false);

  // Tracks the in-flight species lookup per field so a slow early response
  // cannot overwrite a faster later one.
  const speciesSearchRef = useRef({});
  // Set once the redirect is scheduled, so the unsaved-changes prompt does not
  // fire on our own navigation.
  const isRedirectingRef = useRef(false);

  const existingRequest = window.existingRequest;
  const isEditing = !!(existingRequest?.id && !existingRequest.isClone);

  // Hide the server-rendered page loader once React has taken over.
  // window.existingRequest is injected by EJS before this bundle runs and never
  // changes afterwards, so this deliberately runs only on mount: re-running it
  // would reset state and discard whatever the admin had typed.
  useEffect(() => {
    $("#page-loader").fadeOut("slow", function () {
      $(this).remove();
    });
  }, []);

  // Warn before leaving with unsaved edits. On a form this long an accidental
  // click on "Cancel Edit" or a closed tab costs real work.
  useEffect(() => {
    if (!isDirty) return undefined;

    const handleBeforeUnload = (event) => {
      if (isRedirectingRef.current) return undefined;
      event.preventDefault();
      // Required by Chrome to actually show the prompt.
      event.returnValue = "";
      return "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  // Drag-to-reorder the sample rows.
  //
  // The container is #samples. It used to be `el.classList.contains("dragg")`,
  // but `.dragg` is on each individual row (Sample.js), so every row was its
  // own drop target and a drag nested one row's inputs inside another. React
  // still believed each row owned its own inputs, so removing a row took the
  // nested one's fields with it - and an empty payload plus samplesSubmitted
  // then deleted every stored sample for the request.
  //
  // Dragula moves DOM nodes directly, which React does not know about, so the
  // resulting order is read back out and pushed into state. React's keyed
  // reconciliation then converges on the order the DOM already has.
  useEffect(() => {
    const container = document.getElementById("samples");
    if (!container) return undefined;

    const drake = dragula([container], {
      // Let the inputs and the remove button behave normally.
      moves: (_el, _source, handle) =>
        !handle.closest("input, textarea, select, button, a"),
    });

    drake.on("drop", () => {
      const order = [...container.querySelectorAll("[data-sample-key]")].map(
        (el) => el.dataset.sampleKey
      );

      setState((prevState) => {
        const byKey = new Map(prevState.samples.map((s) => [s.key, s]));
        const reordered = order.map((key) => byKey.get(key)).filter(Boolean);
        // Bail out if the DOM and state have somehow diverged, rather than
        // dropping rows on the floor.
        if (reordered.length !== prevState.samples.length) return prevState;
        return { ...prevState, samples: reordered };
      });
      markDirty();
    });

    return () => drake.destroy();
  }, [markDirty]);

  // Bootstrap 4 tooltips, re-initialised whenever a row is added so that
  // dynamically added help icons get one too, and disposed on unmount.
  //
  // The plugin lives on the CDN jQuery that foot.ejs loads, which is a
  // different instance from the jQuery bundled into this file - and foot.ejs
  // runs after this bundle, so on mount it may not exist yet. Hence reading
  // window.jQuery lazily and waiting for load if it is not ready.
  const constructCount = state.constructs.length;
  const sampleCount = state.samples.length;
  useEffect(() => {
    let $tooltips = null;

    const init = () => {
      const jq = window.jQuery;
      if (!jq || typeof jq.fn?.tooltip !== "function") return;
      $tooltips = jq('[data-toggle="tooltip"]');
      $tooltips.tooltip();
    };

    init();
    if (!$tooltips) window.addEventListener("load", init);

    return () => {
      window.removeEventListener("load", init);
      if ($tooltips) $tooltips.tooltip("dispose");
    };
  }, [constructCount, sampleCount]);

  const addConstruct = () => {
    markDirty();
    const key = guid();
    setState((prevState) => ({
      ...prevState,
      constructs: prevState.constructs.concat([{ key }]),
    }));
  };

  const removeConstruct = (construct) => {
    markDirty();
    setState((prevState) => ({
      ...prevState,
      // Every construct carries a key, so matching on it alone is unambiguous.
      constructs: prevState.constructs.filter((c) => c.key !== construct.key),
    }));
  };

  const addSample = () => {
    markDirty();
    const key = guid();
    setState((prevState) => ({
      ...prevState,
      samples: prevState.samples.concat([{ key }]),
    }));
  };

  const removeSample = (sample) => {
    markDirty();
    setState((prevState) => ({
      ...prevState,
      samples: prevState.samples.filter((s) => s.key !== sample.key),
    }));
  };

  // useCallback is load-bearing here, not an optimisation: UploadedImagesForm
  // lists this callback in its effect dependencies, so a new identity on every
  // render would make the effect fire, set state here, and re-render forever.
  const handleImagesChange = useCallback((images) => {
    setState((prevState) => ({
      ...prevState,
      additionalSupportingImages: images,
    }));
  }, []);

  const handleUploadedImagesChange = useCallback((images) => {
    setState((prevState) => ({
      ...prevState,
      preExistingSupportingImages: images,
    }));
  }, []);

  // --- Notes Management ---
  // Notes are held as {key, text}; empty ones are filtered out on the backend.

  const addNote = () => {
    markDirty();
    setState((prevState) => ({
      ...prevState,
      notes: [...prevState.notes, { key: guid(), text: "" }],
    }));
  };

  const updateNote = (key, text) => {
    markDirty();
    setState((prevState) => ({
      ...prevState,
      notes: prevState.notes.map((note) =>
        note.key === key ? { ...note, text } : note
      ),
    }));
  };

  const removeNote = (key) => {
    markDirty();
    setState((prevState) => ({
      ...prevState,
      notes: prevState.notes.filter((note) => note.key !== key),
    }));
  };

  /**
   * Look up species names through our own server.
   *
   * The browser used to call NCBI directly with an axios `proxy` option that
   * only works in Node, and then stored whatever the user had typed rather than
   * the name NCBI matched. The proxy route keeps the API key server-side,
   * applies the institute proxy, and returns canonical scientific names.
   *
   * @param {string} input
   * @param {"species"|"secondSpecies"} stateKeyName
   * @returns {Promise<Array<{label: string, value: string, taxId: string}>>}
   */
  const getListOfSpecies = (input, stateKeyName) => {
    // With defaultOptions enabled, react-select calls this with an empty input
    // on mount. Returning the stored value is what makes an existing species
    // show up when an admin opens the edit form.
    const useInitial = !!(
      !input &&
      state[stateKeyName] &&
      state.shouldUseInitial[stateKeyName]
    );

    if (useInitial) {
      const initial = state.initialValues[stateKeyName];
      return Promise.resolve([
        { label: initial.label, value: initial.value, taxId: initial.taxId },
      ]);
    }

    if (!input || !input.trim()) {
      return Promise.resolve([]);
    }

    setState((prevState) => ({
      ...prevState,
      shouldUseInitial: {
        ...prevState.shouldUseInitial,
        [stateKeyName]: false,
      },
    }));

    // Cancel whatever this field had in flight. Without this, every keystroke
    // fired a request and a slow early response could land after a fast later
    // one and replace the correct options.
    const pending = speciesSearchRef.current[stateKeyName];
    if (pending) {
      clearTimeout(pending.timer);
      pending.controller.abort();
    }

    return new Promise((resolve) => {
      const controller = new AbortController();
      const timer = setTimeout(async () => {
        try {
          const response = await axios.get("/api/taxonomy", {
            params: { term: input },
            signal: controller.signal,
            timeout: 8000,
          });
          resolve(response.data?.options || []);
        } catch (error) {
          if (!axios.isCancel(error)) {
            console.error("Error fetching species", error.message);
          }
          resolve([]);
        }
      }, SPECIES_SEARCH_DEBOUNCE_MS);

      speciesSearchRef.current[stateKeyName] = { timer, controller };
    });
  };

  // Cancel any outstanding lookup when the form unmounts.
  useEffect(
    () => () => {
      Object.values(speciesSearchRef.current).forEach(({ timer, controller }) => {
        clearTimeout(timer);
        controller.abort();
      });
    },
    []
  );

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) {
      return; // Prevent multiple submissions
    }

    if (pendingImageCount > 0) {
      notify(
        "Please wait for the images to finish processing before submitting."
      );
      return;
    }

    setIsSubmitting(true);

    // Everything below runs inside the try. Building the payload can throw -
    // base64ToBlob will reject a malformed preview - and when that happened
    // outside the try the button stayed on "Submitting..." forever with no
    // error shown and no way back except a reload.
    try {
      const form = e.target;
      const formData = new FormData(form);

      // Species comes from react-select rather than a native input.
      formData.set("species", state.species ? state.species.label : "");
      formData.set("speciesTaxId", state.species?.taxId || "");
      formData.set(
        "secondSpecies",
        state.secondSpecies ? state.secondSpecies.label : ""
      );
      formData.set("secondSpeciesTaxId", state.secondSpecies?.taxId || "");

      state.preExistingSupportingImages.forEach((image, index) => {
        // Cloned images have had their id cleared, and FormData would stringify
        // undefined into the literal "undefined" for the server to reject.
        if (!image.id) return;

        formData.append(`preExistingSupportingImages[${index}][id]`, image.id);
        if (image.deleteRequest) {
          formData.append(
            `preExistingSupportingImages[${index}][deleteRequest]`,
            "true"
          );
        }
        if (image.editedDescription) {
          formData.append(
            `preExistingSupportingImages[${index}][editedDescription]`,
            "true"
          );
        }
        formData.append(
          `preExistingSupportingImages[${index}][description]`,
          image.description || ""
        );
      });

      state.additionalSupportingImages.forEach((supportingImage, index) => {
        if (!supportingImage.file?.name) return;

        formData.append(`image[${index}]`, supportingImage.file);

        // The preview is stored as its own upload; the backend records the
        // filename multer gives it rather than trying to derive it. The resizer
        // always emits JPEG, so the name carries .jpg rather than the original
        // extension - otherwise a .png preview would be served with the wrong
        // content type.
        const previewBlob = base64ToBlob(supportingImage.preview, "image/jpeg");
        const previewName =
          supportingImage.file.name.replace(/\.[^.]+$/, "") + ".jpg";
        formData.append(`preview[${index}]`, previewBlob, previewName);

        formData.append(
          `imageDescriptions[${index}]`,
          supportingImage.description || ""
        );
        formData.append(`imageNames[${index}]`, supportingImage.file.name);
      });

      state.notes.forEach((note, index) => {
        formData.append(`notes[${index}]`, note.text);
      });

      // Defence in depth for the sections whose absence means "delete these".
      // The rows are uncontrolled inputs collected from the DOM, so if anything
      // ever moves them out from under React - a drag library, a browser
      // extension, a stray script - the payload could come back short while
      // still claiming to carry the section, and the server would treat the
      // missing rows as deliberate deletions. Refusing to submit is always
      // safer than silently discarding someone's samples.
      const countMismatch = [
        ["sample", "sampleNumbers[]", state.samples.length],
        ["construct", "accessions[]", state.constructs.length],
      ].find(([, field, expected]) => formData.getAll(field).length !== expected);

      if (countMismatch) {
        const [label, field, expected] = countMismatch;
        console.error(
          `Aborting submit: expected ${expected} ${label} row(s), form produced ${formData.getAll(field).length}.`
        );
        notify(
          `The ${label} rows on this page are out of step with the form. Please reload and try again - nothing has been saved.`,
          "error",
          9000
        );
        setIsSubmitting(false);
        return;
      }

      // requestID, janCode, updatedAt and the section markers are all rendered
      // as hidden inputs, so FormData picks them up from the DOM. They used to
      // also be appended here, which sent each one twice and left the server
      // guessing which copy to trust.

      const response = await axios.post("/new", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { requestID, janCode, editingForm, warnings } = response.data;

      if (Array.isArray(warnings) && warnings.length) {
        // Parts of the request saved but some child rows did not; say so rather
        // than reporting a clean success.
        notify(
          `Saved with ${warnings.length} problem(s): ${warnings.join(" ")}`,
          "error",
          9000
        );
      } else {
        notify(
          `Form ${janCode} ${editingForm ? "edited" : "created"} successfully. Now redirecting...`,
          "success",
          1500
        );
      }

      isRedirectingRef.current = true;
      setIsDirty(false);

      // Bulletproof redirect that doesn't rely on Toastify's onHidden event
      setTimeout(
        () => {
          window.location.href = `/request/${requestID}`;
        },
        warnings?.length ? 4000 : 1500
      );
    } catch (error) {
      console.error("Error uploading form:", error);

      // The server reports validation problems as JSON so they can be shown
      // verbatim instead of a generic failure message.
      const data = error.response?.data;
      if (data?.errors?.length) {
        notify(data.errors.slice(0, 3).join(" "), "error", 9000);
      } else if (data?.error) {
        notify(data.error, "error", 9000);
      } else {
        notify(
          "Error submitting request. It may or may not be fully formed. Contact system admin with a timestamp to resolve the issue.",
          "error"
        );
      }

      setIsSubmitting(false);
    }
  };

  const handleCancelEdit = () => {
    if (!existingRequest?.id) return;
    if (
      isDirty &&
      !window.confirm("Discard your unsaved changes to this request?")
    ) {
      return;
    }
    isRedirectingRef.current = true;
    window.location.href = `/request/${existingRequest.id}`;
  };

  /**
   * Render a labelled select backed by the shared option list.
   *
   * `defaultsToNone` marks a select whose first option is "None" and which is
   * therefore already answered when the form loads. Those stay `required` so a
   * value is always submitted, but they carry no asterisk: the asterisk means
   * "we need something from you", and telling a scientist a pre-answered field
   * is outstanding just sends them hunting for a value they do not have.
   *
   * @param {object} props
   * @param {string} props.field - key into FORM_OPTIONS
   * @param {string} props.label
   * @param {string} [props.tooltip]
   * @param {boolean} [props.defaultsToNone]
   * @returns {JSX.Element}
   */
  const renderSelect = ({ field, label, tooltip, defaultsToNone = false }) => (
    <div className="form-group">
      <label htmlFor={field}>
        {label}
        {defaultsToNone ? (
          <span className="text-muted small"> (leave as None if unsure)</span>
        ) : (
          <span className="text-danger"> *</span>
        )}
        {tooltip && (
          <span
            data-icon="&#x74;"
            className="tip far fa-question-circle"
            data-toggle="tooltip"
            title={tooltip}
          />
        )}
      </label>
      <select
        className="form-control"
        id={field}
        name={field}
        required
        defaultValue={existingRequest?.[field]}
        onChange={markDirty}
      >
        {optionsFor(field, existingRequest?.[field]).map((option) => (
          <OptionWithChildAsValue key={option}>{option}</OptionWithChildAsValue>
        ))}
      </select>
    </div>
  );

  return (
    <div>
      <form onSubmit={handleSubmit} id="new-form" encType="multipart/form-data">
        <div className="container">
          {isEditing && (
            <button
              type="button"
              className="btn btn-danger mb-3 mr-3"
              onClick={handleCancelEdit}
            >
              Cancel Edit
            </button>
          )}

          {/* Pre-ticked when editing: the submitter already confirmed this when
              the request was created, so an admin correcting a typo should not
              have to re-confirm it. A clone is a genuinely new submission of new
              material, so that still needs its own confirmation. */}
          <label>
            <input
              type="checkbox"
              id="required-readme"
              defaultChecked={isEditing}
              required
            />{" "}
            <span>
              I have completed the above
              {isEditing && (
                <em className="text-muted">
                  {" "}
                  &mdash; confirmed when this request was submitted
                </em>
              )}
            </span>
          </label>

          {/* Now that the asterisk is only on fields that genuinely need an
              answer, the convention is worth stating rather than leaving the
              reader to infer it. */}
          <p className="text-muted small mt-2 mb-3">
            Fields marked <span className="text-danger">*</span> are required.
            Everything else can be left as it is if it does not apply.
          </p>

          {isEditing && (
            <>
              <input
                type="hidden"
                name="requestID"
                id="requestID"
                defaultValue={existingRequest.id}
              />
              {/* Lets the server detect that someone else saved this request
                  while this form was open. */}
              <input
                type="hidden"
                name="updatedAt"
                defaultValue={existingRequest.updatedAt || ""}
              />
            </>
          )}

          {existingRequest?.janCode && !existingRequest.isClone && (
            <div className="form-group">
              {/* Pre-filled, but an admin can edit it and the server rejects an
                  empty or malformed code, so it needs the marker too. */}
              <label htmlFor="janCode">
                Label <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                className="form-control"
                name="janCode"
                id="janCode"
                required
                pattern="[A-Za-z0-9_\-]+"
                title="Letters, numbers, hyphens and underscores only"
                defaultValue={existingRequest.janCode}
                onChange={markDirty}
              />
            </div>
          )}

          <div className="row">
            <div className="col-md-12">
              <div className="group">
                <div className="container">
                  <span className="badge" />
                  <fieldset>
                    <img src="/img/Eyedropper-Tool.png" className="center" />

                    <h3 className="group-label">Biological Material</h3>

                    <div className="form-group">
                      <label>
                        Species <span className="text-danger">*</span>
                        <span
                          data-icon="&#x74;"
                          className="tip far fa-question-circle"
                          data-toggle="tooltip"
                          title="Select the species that are present in your samples, e.g. N.benthamina and Pseudomonas syringae if you have infected leave from N.bent"
                        />
                      </label>
                      <AsyncSelect
                        id="species"
                        required
                        onBlurResetsInput={false}
                        onSelectResetsInput={false}
                        loadOptions={(input) =>
                          getListOfSpecies(input, "species")
                        }
                        defaultOptions={true}
                        name="species"
                        isClearable
                        value={state.species}
                        onChange={(value) => {
                          markDirty();
                          setState((prev) => ({ ...prev, species: value }));
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label>
                        Second Species
                        <span
                          data-icon="&#x74;"
                          className="tip far fa-question-circle"
                          data-toggle="tooltip"
                          title="Select the second species that are present in your samples, e.g. N.benthamina and Pseudomonas syringae if you have infected leave from N.bent"
                        />
                      </label>
                      <AsyncSelect
                        id="secondSpecies"
                        onBlurResetsInput={false}
                        onSelectResetsInput={false}
                        loadOptions={(input) =>
                          getListOfSpecies(input, "secondSpecies")
                        }
                        defaultOptions={true}
                        name="secondSpecies"
                        isClearable
                        value={state.secondSpecies}
                        onChange={(value) => {
                          markDirty();
                          setState((prev) => ({ ...prev, secondSpecies: value }));
                        }}
                      />
                    </div>

                    {renderSelect({ field: "tissue", label: "Tissue" })}

                    <div className="form-group">
                      <label htmlFor="tissueAgeNum">
                        Tissue age <span className="text-danger">*</span>
                      </label>

                      <div className="row">
                        <div className="col-md-12">
                          <input
                            className="form-control"
                            type="number"
                            id="tissueAgeNum"
                            name="tissueAgeNum"
                            min="0"
                            step="1"
                            defaultValue={existingRequest?.tissueAgeNum}
                            onChange={markDirty}
                            required
                          />
                        </div>
                        <div className="col-md-12">
                          <select
                            className="form-control"
                            id="tissueAgeType"
                            name="tissueAgeType"
                            defaultValue={existingRequest?.tissueAgeType}
                            onChange={markDirty}
                            required
                          >
                            {optionsFor(
                              "tissueAgeType",
                              existingRequest?.tissueAgeType
                            ).map((option) => (
                              <OptionWithChildAsValue key={option}>
                                {option}
                              </OptionWithChildAsValue>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {renderSelect({
                      field: "growthConditions",
                      label: "Growth conditions",
                    })}
                  </fieldset>
                </div>
              </div>

              <div className="group">
                <div className="container">
                  <span className="badge" />
                  <fieldset>
                    <img src="/img/Properties.png" className="center" />

                    <h3 className="group-label">Primary Analysis</h3>

                    {renderSelect({
                      field: "analysisType",
                      label: "Type of analysis",
                      tooltip:
                        "If you know the type of analysis you want, select it here",
                    })}
                    {renderSelect({
                      field: "secondaryAnalysisType",
                      defaultsToNone: true,
                      label: "Secondary analysis",
                      tooltip:
                        "Select only if you want multiple types of analysis done on the same sample, e.g. discovery and targeted",
                    })}
                    {renderSelect({
                      field: "typeOfPTM",
                      defaultsToNone: true,
                      label: "Type of PTM",
                      tooltip: "Select the type of PTM you are interested in",
                    })}
                    {renderSelect({
                      field: "quantitativeAnalysisRequired",
                      defaultsToNone: true,
                      label: "Quantitative analysis required",
                      tooltip:
                        "Select the type of quantitative analysis if you have discussed with the Proteomics team. Otherwise leave this in the default option ",
                    })}
                    {renderSelect({
                      field: "typeOfLabeling",
                      defaultsToNone: true,
                      label: "Type of labeling",
                      tooltip:
                        "Select the type of labeling if you have discussed with the proteomics team. Otherwise leave this in the default option ",
                    })}
                    {renderSelect({
                      field: "labelUsed",
                      defaultsToNone: true,
                      label: "Label used",
                      tooltip:
                        "Select the type of label if you have discussed with the proteomics team. Otherwise leave this in the default option",
                    })}
                  </fieldset>
                </div>
              </div>

              <div className="group">
                <div className="container">
                  <span className="badge" />
                  <fieldset>
                    <img src="/img/Wash-Cold.png" className="center" />

                    <h3 className="group-label">Sample Preparation</h3>

                    {renderSelect({
                      field: "samplePrep",
                      label: "Sample preparation",
                      tooltip:
                        "Select the type of sample preparation used. If not available let the proteomics team know so it can be added ",
                    })}
                    {renderSelect({ field: "digestion", label: "Digestion" })}
                    {renderSelect({
                      field: "enzyme",
                      label: "Enzyme",
                      tooltip:
                        "Other enzyme combinations can be selected if previously discussed with proteomics team",
                    })}
                  </fieldset>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-12">
            <div className="group">
              <div className="container">
                <span className="badge" />

                <fieldset>
                  <img src="/img/Attachment.png" className="center" />

                  <h3 className="group-label">Project Summary</h3>

                  <div className="form-group">
                    <label htmlFor="projectDescription">
                      Project description
                    </label>
                    <textarea
                      className="form-control"
                      id="projectDescription"
                      name="projectDescription"
                      maxLength="10000"
                      defaultValue={existingRequest?.projectDescription || ""}
                      ref={autosizeTextarea}
                      onChange={(e) => {
                        markDirty();
                        autosizeTextarea(e.target);
                      }}
                      style={{ overflow: "hidden", minHeight: "50px" }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="hopedAnalysis">
                      What data do you hope to get from this analysis
                    </label>
                    <textarea
                      className="form-control"
                      id="hopedAnalysis"
                      name="hopedAnalysis"
                      maxLength="10000"
                      defaultValue={existingRequest?.hopedAnalysis || ""}
                      ref={autosizeTextarea}
                      onChange={(e) => {
                        markDirty();
                        autosizeTextarea(e.target);
                      }}
                      style={{ overflow: "hidden", minHeight: "50px" }}
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="bufferComposition">Buffer composition</label>
                    <input
                      className="form-control"
                      type="text"
                      id="bufferComposition"
                      name="bufferComposition"
                      maxLength="2000"
                      defaultValue={existingRequest?.bufferComposition || ""}
                      onChange={markDirty}
                    />
                  </div>

                  <div>
                    <h4 className="group-label">Supporting Images</h4>
                    {isEditing && (
                      <div>
                        <h6 className="group-label">
                          Previously uploaded images
                        </h6>
                        {hasPreExistingSupportingImages ? (
                          <div>
                            <label>Pre-uploaded Images:</label>
                            <UploadedImagesForm
                              onUploadedImagesChange={
                                handleUploadedImagesChange
                              }
                              initialUploadedImages={
                                preExistingSupportingImagesObjList
                              }
                            />
                          </div>
                        ) : (
                          <div>No previously uploaded images found.</div>
                        )}
                        <br />
                      </div>
                    )}
                    {existingRequest?.id &&
                      existingRequest.isClone &&
                      hasPreExistingSupportingImages && (
                        <div>
                          <i>
                            Users cannot clone pre-existing images. Please
                            contact system admin if this is a feature you would
                            like to see developed.
                          </i>
                          <br />
                          <br />
                        </div>
                      )}
                    <h6 className="group-label">Upload new images</h6>
                    <ImageUploadForm
                      onImagesChange={handleImagesChange}
                      onPendingCountChange={setPendingImageCount}
                      supportedFileTypes={supportedFileTypes}
                    />{" "}
                  </div>
                </fieldset>
              </div>
            </div>

            <div className="group">
              <div className="container">
                <fieldset>
                  <img src="/img/Right-Align-Txt.png" className="center" />

                  <h3 className="group-label">Sample Description</h3>

                  {/* Deliberately rendered inside this section: it tells the
                      server the submission really carried the samples, so an
                      empty list means "the user removed them" rather than "the
                      form failed to send them". Keeping it here means deleting
                      the section also removes the claim, instead of leaving the
                      server free to delete every stored sample. */}
                  <input type="hidden" name="samplesSubmitted" value="true" />

                  <div id="samples">
                    {state.samples.map((sample) => (
                      <Sample
                        key={sample.key}
                        data={sample}
                        onChange={markDirty}
                        removeSample={() => removeSample(sample)}
                      />
                    ))}
                  </div>

                  {state.samples.length === 0 && (
                    <p className="text-muted">No samples added yet.</p>
                  )}

                  {/* Every input in a row is required, and per-field asterisks
                      on a repeating row would be noise, so it is said once. */}
                  <p className="text-muted small mb-1">
                    Samples are optional, but every field of a sample you add is
                    required.
                  </p>

                  <label>Drag to reorder items</label>

                  <button
                    type="button"
                    className="btn btn-outline-primary btn-block"
                    onClick={addSample}
                  >
                    Add Another Sample
                  </button>
                </fieldset>
              </div>
            </div>

            <div className="group">
              <div className="container">
                <fieldset>
                  <img src="/img/Right-Align-Txt.png" className="center" />

                  <h3 className="group-label">New Constructs for Database</h3>

                  {/* Paired with this section for the same reason as
                      samplesSubmitted above. */}
                  <input type="hidden" name="constructsSubmitted" value="true" />

                  <p className="text-muted small mb-2">
                    Constructs are optional, but every field of a construct you
                    add is required.
                  </p>

                  <div id="constructs">
                    {state.constructs.map((construct) => (
                      <Construct
                        key={construct.key}
                        data={construct}
                        onChange={markDirty}
                        removeConstruct={() => removeConstruct(construct)}
                      />
                    ))}
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-primary btn-block"
                    onClick={addConstruct}
                  >
                    Add Another Construct
                  </button>
                </fieldset>
              </div>
            </div>

            <div className="group">
              <div className="container">
                <fieldset>
                  <h3 className="group-label">Notes</h3>

                  <div id="notes">
                    {state.notes.map((note) => (
                      <div
                        key={note.key}
                        className="d-flex mb-2 align-items-start"
                      >
                        <textarea
                          className="form-control"
                          value={note.text}
                          maxLength="5000"
                          onChange={(e) => {
                            updateNote(note.key, e.target.value);
                            autosizeTextarea(e.target);
                          }}
                          placeholder="Enter note..."
                          ref={autosizeTextarea}
                          style={{ overflow: "hidden", minHeight: "50px" }}
                        />
                        <button
                          type="button"
                          className="btn btn-danger btn-sm ml-2"
                          onClick={() => removeNote(note.key)}
                          title="Remove note"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    {state.notes.length === 0 && (
                      <p className="text-muted">No notes added yet.</p>
                    )}
                  </div>

                  <button
                    type="button"
                    className="btn btn-outline-primary btn-block mt-4"
                    onClick={addNote}
                  >
                    Add Note
                  </button>
                </fieldset>
              </div>
            </div>
          </div>

          <div className="d-flex mt-3 mb-3">
            {window?.isAdmin && existingRequest?.id && (
              <div className="alert alert-warning flex-grow-1 mb-0">
                <i className="fas fa-user-shield mr-2"></i>
                <strong>Admin Mode:</strong> You are editing this request as an
                administrator.
                <div className="form-check mt-2">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="silentUpdate"
                    name="silentUpdate"
                    value="true"
                  />
                  <label className="form-check-label" htmlFor="silentUpdate">
                    Silent Update (Do not send email notification to the user)
                  </label>
                </div>
              </div>
            )}
          </div>

          <div className="d-flex mt-3">
            {isEditing && (
              <button
                type="button"
                className="btn btn-lg btn-danger mr-2"
                onClick={handleCancelEdit}
              >
                Cancel Edit
              </button>
            )}
            <button
              className="btn btn-lg btn-success"
              type="submit"
              disabled={isSubmitting || pendingImageCount > 0}
            >
              {isSubmitting
                ? "Submitting..."
                : pendingImageCount > 0
                  ? "Processing images..."
                  : "Submit"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default MyForm;

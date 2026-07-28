import { Component } from "react";

/**
 * One row of the Sample Description section.
 *
 * The inputs are uncontrolled and named with the `[]` suffix so that the
 * browser's own FormData collects them in DOM order, which is what makes
 * drag-to-reorder produce the right positions on the server.
 */
class Sample extends Component {
  render() {
    const { data, onChange, removeSample } = this.props;

    return (
      // data-sample-key lets the drag handler map the reordered DOM back onto
      // the samples in React state.
      <div className="dragg" data-sample-key={data.key}>
        <div className="draggInner">
          <div className="row">
            <div className="col-md-10 fix-10">
              <div className="row">
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Sample number</label>
                    <input
                      className="form-control"
                      type="number"
                      min="0"
                      max="150"
                      name="sampleNumbers[]"
                      defaultValue={data.sampleNumber || ""}
                      onChange={onChange}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Sample label</label>
                    <input
                      className="form-control"
                      type="text"
                      maxLength="500"
                      name="sampleLabels[]"
                      defaultValue={data.sampleLabel || ""}
                      onChange={onChange}
                      required
                    />
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="form-group">
                    <label>Sample description</label>
                    <input
                      className="form-control"
                      type="text"
                      maxLength="2000"
                      name="sampleDescriptions[]"
                      defaultValue={data.sampleDescription || ""}
                      onChange={onChange}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-2 fix-2">
              <button
                type="button"
                className="btn btn-link removeSample"
                onClick={removeSample}
                title="Remove sample"
              >
                <i className="far fa-trash-alt"></i>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default Sample;

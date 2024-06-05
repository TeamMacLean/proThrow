import React, { Component } from "react";

class Sample extends Component {
  render() {
    var self = this;
    return (
      <div className="dragg">
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
                      id="sampleNumber"
                      name="sampleNumber[]"
                      defaultValue={self.props.data.sampleNumber || ""}
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
                      id="sampleLabel"
                      name="sampleLabel[]"
                      defaultValue={self.props.data.sampleLabel || ""}
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
                      id="sampleDescription"
                      name="sampleDescription[]"
                      defaultValue={self.props.data.sampleDescription || ""}
                      required
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="col-md-2 fix-2">
              <div
                className="removeSample"
                onClick={this.props.removeSample.bind(null, this)}
              >
                <i className="far fa-trash-alt"></i>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
}
export default Sample;

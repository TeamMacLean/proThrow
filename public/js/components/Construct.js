import React, { Component } from "react";

class Construct extends Component {
  render() {
    var self = this;
    return (
      <div>
        <div className="form-group">
          <label>
            Species and accession of the parent gene{" "}
            <span
              className="tip far fa-question-circle"
              data-toggle="tooltip"
              title="Tell us from which species the gene comes from and what the accession number is of the gene you used to create this construct"
            />
          </label>
          <input
            className="form-control"
            type="text"
            id="accession"
            name="accession[]"
            defaultValue={self.props.data.accession || ""}
            required
          />
        </div>

        <div className="form-group">
          <label>
            Amino acid sequence{" "}
            <span
              data-icon="&#x74;"
              className="tip far fa-question-circle"
              data-toggle="tooltip"
              title="Provided the entire amino acid sequence of the construct including tags and junctions"
            />
          </label>
          <textarea
            className="form-control"
            type="text"
            id="sequenceInfo"
            name="sequenceInfo[]"
            defaultValue={self.props.data.sequenceInfo || ""}
            required
          />
        </div>

        <div className="form-group">
          <label>
            Database entry{" "}
            <span
              data-icon="&#x74;"
              className="tip far fa-question-circle"
              data-toggle="tooltip"
              title=">date_of_submition|protein_short_name|for_whom some description if required
        e.g.
        >160201|RRS1-R-HF|for_Zane"
            />
          </label>
          <input
            className="form-control"
            type="text"
            id="dbEntry"
            name="dbEntry[]"
            defaultValue={self.props.data.dbEntry || ""}
            required
          />
        </div>
        <div
          className="removeSample"
          onClick={this.props.removeConstruct.bind(null, this)}
        >
          <i className="far fa-trash-alt"></i>
        </div>
        <hr />
      </div>
    );
  }
}

export default Construct;

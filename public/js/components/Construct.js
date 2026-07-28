import { Component } from "react";

/**
 * One construct in the "New Constructs for Database" section.
 *
 * The three inputs are position-matched on the server, so they must always be
 * rendered together: hiding one would shift every later construct's data onto
 * the wrong row.
 */
class Construct extends Component {
  render() {
    const { data, onChange, removeConstruct } = this.props;

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
            maxLength="500"
            name="accessions[]"
            defaultValue={data.accession || ""}
            onChange={onChange}
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
            maxLength="20000"
            name="sequenceInfos[]"
            defaultValue={data.sequenceInfo || ""}
            onChange={onChange}
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
            maxLength="500"
            name="dbEntries[]"
            defaultValue={data.dbEntry || ""}
            onChange={onChange}
            required
          />
        </div>
        <button
          type="button"
          className="btn btn-link removeSample"
          onClick={removeConstruct}
          title="Remove construct"
        >
          <i className="far fa-trash-alt"></i>
        </button>
        <hr />
      </div>
    );
  }
}

export default Construct;

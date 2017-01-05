const Species = [
    'Albugo candida',
    'Arabidopsis thaliana',
    'Lotus japonicus',
    'Medicago truncatula',
    'Nicotiana benthamiana',
    'Nicotiana tabacum',
    'Oryza sativa',
    'Populus',
    'Solanum lycopersicum',
    'Zea mays',
    'Phytophthora infestans',
    'Magnaporthe oryzae',
    'Pseudomonas syringae',
    'Sclerotonia sclerotiorum',
    'Phaseolus vulgaris'
].sort();

var supportedFileTypes = global.supportedFileTypes;

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
}

$(function () {
    initDrag();
    initToolTips();
});

function initDrag() {

    const drake = dragula({
        isContainer: function (el) {
            return el.classList.contains('dragg');
        }
    });

}

function initToolTips() {
    $('[data-toggle="tooltip"]').tooltip();
}

const Option = React.createClass({
    render: function render() {
        var text = this.props.children;
        return (
            <option value={text}>{text}</option>
        )
    }
});

const Construct = React.createClass({
    displayName: 'Construct',
    render: function () {
        var self = this;
        return (
            <div>
                <div className="form-group">
                    <label>Species and accession of the parent gene <span data-icon="&#x74;"
                                                                          className="tip"
                                                                          data-toggle="tooltip"
                                                                          title="Tell us from which species the gene comes from and what the accession number is of the gene you used to create this construct"/>
                    </label>
                    <input className="form-control" type="text" id="accession"
                           name="accession[]"
                           defaultValue={self.props.data.accession || ''}
                           required/>
                </div>

                <div className="form-group">
                    <label>Amino acid sequence <span data-icon="&#x74;" className="tip"
                                                     data-toggle="tooltip"
                                                     title="Provided the entire amino acid sequence of the construct including tags and junctions"/>
                    </label>
                    <textarea className="form-control" type="text" id="sequenceInfo"
                              name="sequenceInfo[]"
                              defaultValue={self.props.data.sequenceInfo || ''}
                              required/>
                </div>


                <div className="form-group">
                    <label>Database entry <span data-icon="&#x74;" className="tip"
                                                data-toggle="tooltip"
                                                title=">date_of_submition|protein_short_name|for_whom some description if required
        e.g.
        >160201|RRS1-R-HF|for_Zane"/>
                    </label>
                    <input className="form-control" type="text" id="dbEntry"
                           name="dbEntry[]"
                           defaultValue={self.props.data.dbEntry || ''}
                           required/>
                </div>
                <div className="removeSample" onClick={this.props.removeConstruct.bind(null, this)}>
                    <span data-icon="&#xe019;"/>
                </div>
                <hr/>
            </div>
        )
    }
});

const App = React.createClass({
    displayName: 'app',
    componentDidMount: function componentDidMount() {
        // console.log('mounted');
        $('#page-loader').fadeOut('slow', function () {
            this.remove();
        });
        this.initSocketUpload();

    },
    getInitialState: function getInitialState() {
        if (window.existingRequest) {

            return {
                samples: window.existingRequest.samples || [],
                supportingImages: window.existingRequest.supportingImages || [],
                constructs: window.existingRequest.constructs || []
            };
        } else {
            window.existingRequest = {};
            return {samples: [], supportingImages: [], constructs: []};
        }
    },
    addConstruct: function addConstruct() {
        const key = guid();
        this.setState({constructs: this.state.constructs.concat([{key: key}])});
    },
    removeConstruct: function removeConstruct(construct) {
        const newConstructs = this.state.constructs.filter(function (c) {
            return c.key != construct.props.data.key || c.id != construct.props.data.id;
        });
        this.setState({constructs: newConstructs});
    },
    addSample: function addSample() {
        const key = guid();
        this.setState({samples: this.state.samples.concat([{key: key}])});
    },
    removeSample: function removeSample(sample) {
        const newSamples = this.state.samples.filter(function (s) {
            return s.key != sample.props.data.key || s.id != sample.props.data.id;
        });
        this.setState({samples: newSamples});
    },
    removeSupportImage: function removeSupportImage(index) { //TODO
        const replacement = this.state.supportingImages;
        delete replacement[index];
        this.setState({supportingImages: replacement});
    },
    initSocketUpload: function initSocketUpload() {

        const self = this;

        $(function () {

            const socket = io(window.location.host);
            socket.on('connect', function () {
                const delivery = new Delivery(socket);


                delivery.on('delivery.connect', function (delivery) {
                    $('input[type=file]').on('change', function (evt) {
                        const file = $(this)[0].files[0];
                        delivery.send(file);
                        evt.preventDefault();
                    });
                });

                delivery.on('send.success', function (fileUID) {
                    console.log('file was successfully sent.');
                });

                socket.on('upload.complete', function (obj) {
                    self.setState({supportingImages: self.state.supportingImages.concat([obj])});
                    // console.log('received object', obj);


                    $('input[type=file]').val('');
                })

            });
        })
    },
    render: function render() {
        const self = this;

        return (
            <form action="/new" method="post" id="new-form">
                <div className="container">

                    <label>
                        <input type="checkbox" id="required-readme"
                               defaultChecked={window.existingRequest.id}
                               required/> <span>I have completed the above</span>
                    </label>

                    {(window.existingRequest.id && !window.existingRequest.isClone
                            ? <input type="hidden" name="requestID" id="requestID"
                                     defaultValue={window.existingRequest.id}/>
                            : <div></div>
                    )}

                    {(window.existingRequest.janCode && !window.existingRequest.isClone
                            ?
                            <div className="form-group">
                                <label>Label</label>
                                <input type="text" className="form-control" name="janCode" id="janCode"
                                       defaultValue={window.existingRequest.janCode}/>
                            </div>
                            : <div></div>
                    )}

                    <div className="row">
                        <div className="col-md-6">
                            <div className="group">
                                <div className="container">
                                    <span className="badge"/>
                                    <fieldset>
                                        <img src="/img/Eyedropper-Tool.png" className="center"/>

                                        <h3 className="group-label">Biological Material</h3>

                                        <div className="form-group">
                                            <label>Species <span data-icon="&#x74;" className="tip"
                                                                 data-toggle="tooltip"
                                                                 title="Select the species that are present in your samples, e.g. N.benthamina and Pseudomonas syringae if you have infected leave from N.bent"/></label>
                                            <select className="form-control" id="species" name="species"
                                                    defaultValue={window.existingRequest.species}
                                                    required>
                                                {Species.map(function (object, i) {
                                                    return <Option key={i}>{object}</Option>;
                                                })}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Second Species <span data-icon="&#x74;" className="tip"
                                                                        data-toggle="tooltip"
                                                                        title="Select the second species that are present in your samples, e.g. N.benthamina and Pseudomonas syringae if you have infected leave from N.bent"/></label>
                                            <select className="form-control" id="secondSpecies"
                                                    name="secondSpecies"
                                                    defaultValue={window.existingRequest.secondSpecies }
                                                    required>
                                                {['None'].concat(Species).map(function (object, i) {
                                                    return <Option key={i}>{object}</Option>;
                                                })}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Tissue</label>
                                            <select className="form-control" id="tissue" name="tissue" required
                                                    defaultValue={window.existingRequest.tissue }>
                                                <Option>seedlings</Option>
                                                <Option>leaves</Option>
                                                <Option>rosette</Option>
                                                <Option>roots</Option>
                                                <Option>cell culture</Option>
                                                <Option>callus</Option>
                                                <Option>flower</Option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Tissue age</label>

                                            <div className="row">
                                                <div className="col-md-6">
                                                    <input className="form-control" type="number"
                                                           id="tissueAgeNum"
                                                           name="tissueAgeNum"
                                                           min="0"
                                                           defaultValue={window.existingRequest.tissueAgeNum}
                                                           required/>
                                                </div>
                                                <div className="col-md-6">
                                                    <select className="form-control" id="tissueAgeType"
                                                            name="tissueAgeType"
                                                            defaultValue={window.existingRequest.tissueAgeType }
                                                            required>
                                                        <Option>hour(s)</Option>
                                                        <Option>day(s)</Option>
                                                        <Option>week(s)</Option>
                                                    </select>
                                                </div>
                                            </div>


                                        </div>
                                        <div className="form-group">
                                            <label>Growth conditions</label>
                                            <select className="form-control" id="growthConditions"
                                                    name="growthConditions"
                                                    required
                                                    defaultValue={window.existingRequest.growthConditions }>
                                                <Option>plate</Option>
                                                <Option>liquid</Option>
                                                <Option>6well</Option>
                                                <Option>soil grown</Option>
                                                <Option>hydrophonics</Option>
                                            </select>
                                        </div>
                                    </fieldset>

                                </div>
                            </div>

                            <div className="group">
                                <div className="container">
                                    <span className="badge"/>
                                    <fieldset>
                                        <img src="/img/Properties.png" className="center"/>

                                        <h3 className="group-label">Primary Analysis</h3>

                                        <div className="form-group">
                                            <label>Type of analysis <span data-icon="&#x74;" className="tip"
                                                                          data-toggle="tooltip"
                                                                          title="If you know the type of analysis you want, select it here"/></label>
                                            <select className="form-control" id="analysisType"
                                                    name="analysisType"
                                                    required
                                                    defaultValue={window.existingRequest.analysisType }>
                                                <Option>Discovery</Option>
                                                <Option>SRM</Option>
                                                <Option>PRM</Option>
                                                <Option>DIA</Option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Secondary analysis <span data-icon="&#x74;" className="tip"
                                                                            data-toggle="tooltip"
                                                                            title="Select only if you want multiple types of analysis done on the same sample, e.g. discovery and targeted"/></label>
                                            <select className="form-control" id="secondaryAnalysisType"
                                                    name="secondaryAnalysisType"
                                                    required
                                                    defaultValue={window.existingRequest.secondaryAnalysisType}>
                                                <Option>None</Option>
                                                <Option>Discovery</Option>
                                                <Option>SRM</Option>
                                                <Option>PRM</Option>
                                                <Option>DIA</Option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Type of PTM <span data-icon="&#x74;" className="tip"
                                                                     data-toggle="tooltip"
                                                                     title="Select the type of PTM you are interested in"/></label>
                                            <select className="form-control" id="typeOfPTM" name="typeOfPTM"
                                                    required
                                                    defaultValue={window.existingRequest.typeOfPTM}>
                                                <Option>None</Option>
                                                <Option>Biotinylation</Option>
                                                <Option>Phosphorylation</Option>
                                                <Option>Acetylation</Option>
                                                <Option>Ubiquitination</Option>
                                                <Option>Glycosylation</Option>
                                                <Option>Poly ADP Ribosylation</Option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Quantitative analysis required <span data-icon="&#x74;"
                                                                                        className="tip"
                                                                                        data-toggle="tooltip"
                                                                                        title="Select the type of quantitative analysis if you have discussed with the Proteomics team. Otherwise leave this in the default option "/></label>
                                            <select className="form-control" id="quantitativeAnalysisRequired"
                                                    name="quantitativeAnalysisRequired"
                                                    defaultValue={window.existingRequest.quantitativeAnalysisRequired }
                                                    required>
                                                <Option>None</Option>
                                                <Option>Semi</Option>
                                                <Option>Relative</Option>
                                                <Option>Absolute</Option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Type of labeling <span data-icon="&#x74;" className="tip"
                                                                          data-toggle="tooltip"
                                                                          title="Select the type of labeling if you have discussed with the proteomics team. Otherwise leave this in the default option "/></label>
                                            <select className="form-control" id="typeOfLabeling"
                                                    name="typeOfLabeling"
                                                    required
                                                    defaultValue={window.existingRequest.typeOfLabeling }>
                                                <Option>None</Option>
                                                <Option>Label-free</Option>
                                                <Option>Post-extraction</Option>
                                                <Option>Metabolic</Option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Label used <span data-icon="&#x74;" className="tip"
                                                                    data-toggle="tooltip"
                                                                    title="Select the type of label if you have discussed with the proteomics team. Otherwise leave this in the default option"/></label>
                                            <select className="form-control" id="labelUsed" name="labelUsed"
                                                    required
                                                    defaultValue={window.existingRequest.labelUsed }>
                                                <Option>None</Option>
                                                <Option>TMT0</Option>
                                                <Option>TMT6</Option>
                                                <Option>TMT10</Option>
                                                <Option>iTRAQ</Option>
                                                <Option>15N</Option>
                                            </select>
                                        </div>
                                    </fieldset>

                                </div>
                            </div>
                            <div className="group">
                                <div className="container">
                                    <span className="badge"/>
                                    <fieldset>
                                        <img src="/img/Wash-Cold.png" className="center"/>

                                        <h3 className="group-label">Sample Preparation</h3>

                                        <div className="form-group">
                                            <label>Sample preparation <span data-icon="&#x74;" className="tip"
                                                                            data-toggle="tooltip"
                                                                            title="Select the type of sample preparation used. If not available let the proteomics team know so it can be added "/></label>
                                            <select className="form-control" id="samplePrep" name="samplePrep"
                                                    defaultValue={window.existingRequest.samplePrep }
                                                    required>
                                                <Option>crude extract</Option>
                                                <Option>microsomal</Option>
                                                <Option>plasma membrane</Option>
                                                <Option>IP</Option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Digestion</label>
                                            <select className="form-control" id="digestion" name="digestion"
                                                    required
                                                    defaultValue={window.existingRequest.digestion }>
                                                <Option>in gel</Option>
                                                <Option>on bead</Option>
                                                <Option>in solution</Option>
                                            </select>
                                        </div>


                                        <div className="form-group">
                                            <label>Enzyme <span data-icon="&#x74;" className="tip"
                                                                data-toggle="tooltip"
                                                                title="Other enzyme combinations can be selected if previously discussed with proteomics team"/></label>
                                            <select className="form-control" id="enzyme" name="enzyme" required
                                                    defaultValue={window.existingRequest.enzyme }>
                                                <Option>Trypsin</Option>
                                                <Option>AspN</Option>
                                                <Option>Trypsin AspN</Option>
                                                <Option>LysC</Option>
                                                <Option>Trypsin LysC</Option>
                                            </select>
                                        </div>

                                    </fieldset>

                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="group">
                                <div className="container">
                                    <span className="badge"/>

                                    <fieldset>

                                        <img src="/img/Attachment.png" className="center"/>

                                        <h3 className="group-label">Project Summary</h3>


                                        <div className="form-group">
                                            <label>Project description</label>
                                            <textarea className="form-control" type="text"
                                                      id="projectDescription"
                                                      name="projectDescription"
                                                      defaultValue={window.existingRequest.projectDescription || ''}/>
                                        </div>

                                        <div className="form-group">
                                            <label>What data do you hope to get from this analysis</label>
                                            <textarea className="form-control" type="text" id="hopedAnalysis"
                                                      name="hopedAnalysis"
                                                      defaultValue={window.existingRequest.hopedAnalysis || ''}/>
                                        </div>

                                        <div className="form-group">
                                            <label>Buffer composition</label>
                                            <input className="form-control" type="text" id="bufferComposition"
                                                   name="bufferComposition"
                                                   defaultValue={window.existingRequest.bufferComposition || ''}/>
                                        </div>

                                        <div className="form-group">
                                            <label>Supporting images <span data-icon="&#x74;" className="tip"
                                                                           data-toggle="tooltip"
                                                                           title="Please only use images in .png, .jpg, .jpeg or .gif format "/></label>
                                            <input className="form-control" type="file" id="imageUpload"
                                                   accept={supportedFileTypes}
                                                   name="imageUpload"/>
                                        </div>


                                        <div id="supportingImages" name="supportingImages">
                                            {self.state.supportingImages.map(function (object, i) { //TODO

                                                const removeImage = self.removeSupportImage.bind(null, i);
                                                return <div className="row" key={i}>
                                                    <div className="col-sm-12">
                                                        <div className="tile">
                                                            <img
                                                                src={object.preview || object.url}
                                                                className="img-fluid center-block"/>
                                                            <br/>
                                                            <span className="removeImage"/>
                                                            <input type="hidden" name="imageName[]"
                                                                   defaultValue={object.name}/>
                                                            <input type="hidden" name="imagePath[]"
                                                                   defaultValue={object.preview || object.url}/>
                                                            <span className="imageName">{object.name}</span>
                                                            <span className="right clickable"
                                                                  data-icon="&#xe019;"
                                                                  onClick={removeImage}/>
                                                            <hr/>


                                                            <input type="hidden" defaultValue={object.uid}
                                                                   name="image[]"/>

                                                            <div className="form-group">
                                                                <label>Supporting image description</label>
                                                                <input className="form-control" type="text"
                                                                       id="imageDescription"
                                                                       name="imageDescription[]"
                                                                       defaultValue={object.description || ''}
                                                                       required/>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            })}
                                        </div>


                                    </fieldset>

                                </div>
                            </div>


                            <div className="group">
                                <div className="container">
                                    <fieldset>
                                        <img src="/img/Right-Align-Txt.png" className="center"/>

                                        <h3 className="group-label">New Constructs for Database</h3>


                                        <div id="constructs">
                                            {this.state.constructs.map(function (construct) {
                                                return <Construct key={construct.key || construct.id} data={construct}
                                                                  removeConstruct={self.removeConstruct}/>
                                            })}

                                        </div>

                                        <div className="btn btn-primary-outline btn-block"
                                             onClick={this.addConstruct}>
                                            Add Another
                                            Construct
                                        </div>

                                    </fieldset>
                                </div>
                            </div>
                        </div>
                    </div>


                    <div className="group">
                        <div className="container">
                            <img src="/img/Guides.png" className="center"/>

                            <h3 className="group-label">Sample Description</h3>

                            <div id="samples">
                                {this.state.samples.map(function (sample) {
                                    return <Sample key={sample.key || sample.id} data={sample}
                                                   removeSample={self.removeSample}/>

                                })}
                            </div>

                            <label><span data-icon="&#x2a;"/> Drag to reorder items</label>

                            <div className="btn btn-primary-outline btn-block" onClick={this.addSample}>Add
                                Another
                                Sample
                            </div>

                        </div>
                    </div>

                    <input type="submit" className="btn btn-success btn-block"/>

                </div>
            </form>
        )
    }
});


const Sample = React.createClass({
    displayName: 'Sample',
    render: function () {
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
                                        <input className="form-control" type="number" min="0" max="150"
                                               id="sampleNumber"
                                               name="sampleNumber[]" defaultValue={self.props.data.sampleNumber || ''}
                                               required/>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="form-group">
                                        <label>Sample label</label>
                                        <input className="form-control" type="text"
                                               id="sampleLabel"
                                               name="sampleLabel[]" defaultValue={self.props.data.sampleLabel || ''}
                                               required/>
                                    </div>
                                </div>
                                <div className="col-md-4">
                                    <div className="form-group">
                                        <label>Sample description</label>
                                        <input className="form-control" type="text" id="sampleDescription"
                                               name="sampleDescription[]"
                                               defaultValue={self.props.data.sampleDescription || ''}
                                               required/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-2 fix-2">
                            <div className="removeSample" onClick={this.props.removeSample.bind(null, this)}>
                                <span data-icon="&#xe019;"/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

});


ReactDOM.render(<App/>, document.getElementById('app'));
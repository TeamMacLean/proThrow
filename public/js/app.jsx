const Species = [
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
    'Pseudomonas syringae'
];

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

            // console.log('constructs',window.existingRequest.constructs);

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
    removeSupportImage: function removeSupportImage(index) {
        const replacement = this.state.supportingImages;
        delete replacement[index];
        this.setState({samples: replacement});
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
                               defaultChecked={window.existingRequest != null}
                               required/> <span>I have completed the above</span>
                    </label>

                    {(window.existingRequest.id && !window.existingRequest.isClone
                            ? <input type="hidden" name="requestID" id="requestID" defaultValue={window.existingRequest.id}/>
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
                                                    defaultValue={window.existingRequest.species || ''}
                                                    required>
                                                <option disabled defaultValue=''/>
                                                {Species.map(function (object, i) {
                                                    return <option key={i}>{object}</option>;
                                                })}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Second Species <span data-icon="&#x74;" className="tip"
                                                                        data-toggle="tooltip"
                                                                        title="Select the second species that are present in your samples, e.g. N.benthamina and Pseudomonas syringae if you have infected leave from N.bent"/></label>
                                            <select className="form-control" id="secondSpecies"
                                                    name="secondSpecies"
                                                    defaultValue={window.existingRequest.secondSpecies || 'None'}
                                                    required>
                                                <option disabled defaultValue=''/>
                                                {['None'].concat(Species).map(function (object, i) {
                                                    return <option key={i}>{object}</option>;
                                                })}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Tissue</label>
                                            <select className="form-control" id="tissue" name="tissue" required
                                                    defaultValue={window.existingRequest.tissue || ''}>
                                                <option disabled defaultValue=''/>
                                                <option>seedlings</option>
                                                <option>leaves</option>
                                                <option>rosette</option>
                                                <option>roots</option>
                                                <option>cell culture</option>
                                                <option>callus</option>
                                                <option>flower</option>
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
                                                           defaultValue={window.existingRequest.tissueAgeNum || ''}
                                                           required/>
                                                </div>
                                                <div className="col-md-6">
                                                    <select className="form-control" id="tissueAgeType"
                                                            name="tissueAgeType"
                                                            defaultValue={window.existingRequest.tissueAgeType || ''}
                                                            required>
                                                        <option disabled defaultValue=''/>
                                                        <option>hour(s)</option>
                                                        <option>day(s)</option>
                                                        <option>week(s)</option>
                                                    </select>
                                                </div>
                                            </div>


                                        </div>
                                        <div className="form-group">
                                            <label>Growth conditions</label>
                                            <select className="form-control" id="growthConditions"
                                                    name="growthConditions"
                                                    required
                                                    defaultValue={window.existingRequest.growthConditions || ''}>
                                                <option disabled defaultValue=''/>
                                                <option>plate</option>
                                                <option>liquid</option>
                                                <option>6well</option>
                                                <option>soil grown</option>
                                                <option>hydrophonics</option>
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
                                                    defaultValue={window.existingRequest.analysisType || 'discovery'}>
                                                <option>Discovery</option>
                                                <option>SRM</option>
                                                <option>PRM</option>
                                                <option>DIA</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Secondary analysis <span data-icon="&#x74;" className="tip"
                                                                            data-toggle="tooltip"
                                                                            title="Select only if you want multiple types of analysis done on the same sample, e.g. discovery and targeted"/></label>
                                            <select className="form-control" id="secondaryAnalysisType"
                                                    name="secondaryAnalysisType"
                                                    required
                                                    defaultValue={window.existingRequest.secondaryAnalysisType || 'None'}>
                                                <option disabled defaultValue=''/>
                                                <option>None</option>
                                                <option>Discovery</option>
                                                <option>SRM</option>
                                                <option>PRM</option>
                                                <option>DIA</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Type of PTM <span data-icon="&#x74;" className="tip"
                                                                     data-toggle="tooltip"
                                                                     title="Select the type of PTM you are interested in"/></label>
                                            <select className="form-control" id="typeOfPTM" name="typeOfPTM"
                                                    required
                                                    defaultValue={window.existingRequest.typeOfPTM || 'none'}>
                                                <option>None</option>
                                                <option>Phosphorylation</option>
                                                <option>Acetylation</option>
                                                <option>Ubiquitination</option>
                                                <option>Glycosylation</option>
                                                <option>Poly ADP Ribosylation</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Quantitative analysis required <span data-icon="&#x74;"
                                                                                        className="tip"
                                                                                        data-toggle="tooltip"
                                                                                        title="Select the type of quantitative analysis if you have discussed with the Proteomics team. Otherwise leave this in the default option "/></label>
                                            <select className="form-control" id="quantitativeAnalysisRequired"
                                                    name="quantitativeAnalysisRequired"
                                                    defaultValue={window.existingRequest.quantitativeAnalysisRequired || 'None'}
                                                    required>
                                                <option>None</option>
                                                <option>Semi</option>
                                                <option>Relative</option>
                                                <option>Absolute</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Type of labeling <span data-icon="&#x74;" className="tip"
                                                                          data-toggle="tooltip"
                                                                          title="Select the type of labeling if you have discussed with the proteomics team. Otherwise leave this in the default option "/></label>
                                            <select className="form-control" id="typeOfLabeling"
                                                    name="typeOfLabeling"
                                                    required
                                                    defaultValue={window.existingRequest.typeOfLabeling || 'None'}>
                                                <option>None</option>
                                                <option>Label-free</option>
                                                <option>Post-extraction</option>
                                                <option>Metabolic</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Label used <span data-icon="&#x74;" className="tip"
                                                                    data-toggle="tooltip"
                                                                    title="Select the type of label if you have discussed with the proteomics team. Otherwise leave this in the default option"/></label>
                                            <select className="form-control" id="labelUsed" name="labelUsed"
                                                    required
                                                    defaultValue={window.existingRequest.labelUsed || 'None'}>
                                                <option>None</option>
                                                <option>TMT0</option>
                                                <option>TMT6</option>
                                                <option>TMT10</option>
                                                <option>iTRAQ</option>
                                                <option>15N</option>
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
                                                    defaultValue={window.existingRequest.samplePrep || ''}
                                                    required>
                                                <option disabled defaultValue=''/>
                                                <option>crude extract</option>
                                                <option>microsomal</option>
                                                <option>plasma membrane</option>
                                                <option>IP</option>
                                            </select>
                                        </div>

                                        <div className="form-group">
                                            <label>Digestion</label>
                                            <select className="form-control" id="digestion" name="digestion"
                                                    required
                                                    defaultValue={window.existingRequest.digestion || 'in gel'}>
                                                <option>in gel</option>
                                                <option>on bead</option>
                                                <option>in solution</option>
                                            </select>
                                        </div>


                                        <div className="form-group">
                                            <label>Enzyme <span data-icon="&#x74;" className="tip"
                                                                data-toggle="tooltip"
                                                                title="Other enzyme combinations can be selected if previously discussed with proteomics team"/></label>
                                            <select className="form-control" id="enzyme" name="enzyme" required
                                                    defaultValue={window.existingRequest.enzyme || 'Trypsin'}>
                                                <option>Trypsin</option>
                                                <option>AspN</option>
                                                <option>Trypsin AspN</option>
                                                <option>LysC</option>
                                                <option>Trypsin LysC</option>
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

                                                const remove = self.removeSupportImage.bind(null, i);
                                                return <div className="row" key={i}>
                                                    <div className="col-sm-12">
                                                        <div className="tile">
                                                            <img
                                                                src={object.preview || object.url}
                                                                className="img-fluid center-block"/>
                                                            <br/>
                                                            <span className="removeImage"/>
                                                            <span className="imageName">{object.name}</span>
                                                            <span className="right clickable"
                                                                  data-icon="&#xe019;"
                                                                  onClick={remove}/>
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
                                                {/*console.log(construct);*/
                                                }
                                                return React.createElement(Construct, {
                                                    key: construct.key || construct.id,
                                                    data: construct,
                                                    removeConstruct: self.removeConstruct
                                                });
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
                                    return React.createElement(Sample, {
                                        key: sample.key || sample.id,
                                        data: sample,
                                        removeSample: self.removeSample
                                    });
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


ReactDOM.render(React.createElement(App), document.getElementById('app'));
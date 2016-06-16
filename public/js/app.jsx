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
        return {samples: [], supportingImages: []};
    },
    addSample: function addSample() {
        const key = guid();
        this.setState({samples: this.state.samples.concat([{key: key}])});
    },
    removeSample: function removeSample(sample) {
        const newSamples = this.state.samples.filter(function (s) {
            return s.key != sample.props.data.key;
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
                    $("input[type=file]").on('change', function (evt) {
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


                    $("input[type=file]").val('');
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
                        <input type="checkbox" id="required-readme" required/> I have completed the above
                    </label>

                    <div className="row">
                        <div className="col-md-6">
                            <div className="group">
                                <div className="container">
                                    <span className="badge"/>
                                    <fieldset>
                                        <img src="/img/Eyedropper-Tool.png" className="center"/>

                                        <h3 className="group-label">Biological Materia</h3>

                                        <div className="form-group">
                                            <label>Species <span data-icon="&#x74;" className="tip"
                                                                 data-toggle="tooltip"
                                                                 title="This needs to be filled out"/></label>
                                            <select className="form-control" id="species" name="species" defaultValue=''
                                                    required>
                                                <option disabled value=''/>
                                                {Species.map(function (object, i) {
                                                    return <option key={i}>{object}</option>;
                                                })}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Preferred database for searches <span data-icon="&#x74;"
                                                                                         className="tip"
                                                                                         data-toggle="tooltip"
                                                                                         title="This needs to be filled out"/></label>
                                            <select className="form-control" id="searchDatabase" name="searchDatabase"
                                                    required defaultValue=''>
                                                <option disabled value=''/>
                                                {Species.map(function (object, i) {
                                                    return <option key={i}>{object}</option>;
                                                })}
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Tissue <span data-icon="&#x74;" className="tip"
                                                                data-toggle="tooltip"
                                                                title="This needs to be filled out"/></label>
                                            <select className="form-control" id="tissue" name="tissue" required
                                                    defaultValue=''>
                                                <option disabled value=''/>
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
                                            <label>Tissue age <span data-icon="&#x74;" className="tip"
                                                                    data-toggle="tooltip"
                                                                    title="This needs to be filled out"/></label>

                                            <div className="row">
                                                <div className="col-md-6">
                                                    <input className="form-control" type="number" id="tissueAgeNum"
                                                           name="tissueAgeNum"
                                                           required/>
                                                </div>
                                                <div className="col-md-6">
                                                    <select className="form-control" id="tissueAgeType"
                                                            name="tissueAgeType"
                                                            required defaultValue=''>
                                                        <option disabled value=''/>
                                                        <option>hour(s)</option>
                                                        <option>day(s)</option>
                                                        <option>week(s)</option>
                                                    </select>
                                                </div>
                                            </div>


                                        </div>
                                        <div className="form-group">
                                            <label>Growth conditions <span data-icon="&#x74;" className="tip"
                                                                           data-toggle="tooltip"
                                                                           title="This needs to be filled out"/></label>
                                            <select className="form-control" id="growthConditions"
                                                    name="growthConditions"
                                                    required defaultValue=''>
                                                <option disabled value=''/>
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
                                                                          title="This needs to be filled out"/></label>
                                            <select className="form-control" id="analysisType" name="analysisType"
                                                    required defaultValue=''>
                                                <option disabled value=''/>
                                                <option>discovery</option>
                                                <option>SRM</option>
                                                <option>PRM</option>
                                                <option>DIA</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Secondary analysis <span data-icon="&#x74;" className="tip"
                                                                            data-toggle="tooltip"
                                                                            title="This needs to be filled out"/></label>
                                            <select className="form-control" id="secondaryAnalysisType"
                                                    name="secondaryAnalysisType"
                                                    required defaultValue=''>
                                                <option disabled value=''/>
                                                <option>none</option>
                                                <option>discovery</option>
                                                <option>SRM</option>
                                                <option>PRM</option>
                                                <option>DIA</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Type of PTM <span data-icon="&#x74;" className="tip"
                                                                     data-toggle="tooltip"
                                                                     title="This needs to be filled out"/></label>
                                            <select className="form-control" id="typeOfPTM" name="typeOfPTM" required
                                                    defaultValue=''>
                                                <option disabled value=''/>
                                                <option>all</option>
                                                <option>non-modified</option>
                                                <option>phosphorylation</option>
                                                <option>acetylation</option>
                                                <option>Ubiquitination</option>
                                                <option>glycosylation</option>
                                                <option>poly ADP ribosylation</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Quantitative analysis required <span data-icon="&#x74;"
                                                                                        className="tip"
                                                                                        data-toggle="tooltip"
                                                                                        title="This needs to be filled out"/></label>
                                            <select className="form-control" id="quantitativeAnalysisRequired"
                                                    name="quantitativeAnalysisRequired" required defaultValue=''>
                                                <option disabled value=''/>
                                                <option>none</option>
                                                <option>semi</option>
                                                <option>relative</option>
                                                <option>absolute</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Type of labeling <span data-icon="&#x74;" className="tip"
                                                                          data-toggle="tooltip"
                                                                          title="This needs to be filled out"/></label>
                                            <select className="form-control" id="typeOfLabeling" name="typeOfLabeling"
                                                    required defaultValue=''>
                                                <option disabled value=''/>
                                                <option>label-free</option>
                                                <option>post-extraction</option>
                                                <option>metabolic</option>
                                            </select>
                                        </div>
                                        <div className="form-group">
                                            <label>Label used <span data-icon="&#x74;" className="tip"
                                                                    data-toggle="tooltip"
                                                                    title="This needs to be filled out"/></label>
                                            <select className="form-control" id="labelUsed" name="labelUsed" required
                                                    defaultValue=''>
                                                <option>none (added due to label-free option above)</option>
                                                <option disabled value=''/>
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
                        </div>
                        <div className="col-md-6">
                            <div className="group">
                                <div className="container">
                                    <span className="badge"/>

                                    <fieldset>

                                        <img src="/img/Attachment.png" className="center"/>

                                        <h3 className="group-label">Project Summary</h3>


                                        <div className="form-group">
                                            <label>Project description <span data-icon="&#x74;" className="tip"
                                                                             data-toggle="tooltip"
                                                                             title="This needs to be filled out"/></label>
                                            <input className="form-control" type="text" id="projectDescription"
                                                   name="projectDescription"/>
                                        </div>
                                        <div className="form-group">
                                            <label>Buffer composition <span data-icon="&#x74;" className="tip"
                                                                            data-toggle="tooltip"
                                                                            title="This needs to be filled out"/></label>
                                            <input className="form-control" type="text" id="bufferComposition"
                                                   name="bufferComposition"/>
                                        </div>

                                        <div className="form-group">
                                            <label>Supporting images <span data-icon="&#x74;" className="tip"
                                                                           data-toggle="tooltip"
                                                                           title="This needs to be filled out"/></label>
                                            <input className="form-control" type="file" id="imageUpload"
                                                   accept={supportedFileTypes}
                                                   name="imageUpload"
                                                   required/>
                                        </div>

                                        <div id="supportingImages" name="supportingImages">
                                            {self.state.supportingImages.map(function (object, i) {
                                                const remove = self.removeSupportImage.bind(null, i);
                                                return <div className="row" key={i}>
                                                    <div className="col-sm-12">
                                                        <div className="tile">
                                                            <img src={object.preview}
                                                                 className="img-fluid center-block"/>
                                                            <br/>
                                                            <span className="removeImage"/>
                                                            <span className="imageName">{object.name}</span>
                                                            <span className="right clickable" data-icon="&#xe019;"
                                                                  onClick={remove}/>
                                                            <hr/>

                                                            <input type="hidden" value={object.id} name="image[]"/>

                                                            <div className="form-group">
                                                                <label>Supporting image description <span
                                                                    data-icon="&#x74;"
                                                                    className="tip"
                                                                    data-toggle="tooltip"
                                                                    title="This needs to be filled out"/></label>
                                                                <input className="form-control" type="text"
                                                                       id="supportingImageDescription"
                                                                       name="supportingImageDescription[]"
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
                                    <span className="badge"/>
                                    <fieldset>
                                        <img src="/img/Wash-Cold.png" className="center"/>

                                        <h3 className="group-label">Sample Preparation</h3>

                                        <div className="form-group">
                                            <label>Sample preparation <span data-icon="&#x74;" className="tip"
                                                                            data-toggle="tooltip"
                                                                            title="This needs to be filled out"/></label>
                                            <select className="form-control" id="samplePrep" name="samplePrep" required
                                                    defaultValue=''>
                                                <option disabled value=''/>
                                                <option>crude extract</option>
                                                <option>microsomal</option>
                                                <option>plasma membrane</option>
                                                <option>IP</option>
                                            </select>
                                        </div>


                                        <div className="form-group">
                                            <label>Digestion <span data-icon="&#x74;" className="tip"
                                                                   data-toggle="tooltip"
                                                                   title="This needs to be filled out"/></label>
                                            <select className="form-control" id="digestion" name="digestion" required
                                                    defaultValue=''>
                                                <option disabled value=''/>
                                                <option>in gel</option>
                                                <option>on bead</option>
                                                <option>in solution</option>
                                            </select>
                                        </div>


                                        <div className="form-group">
                                            <label>Enzyme <span data-icon="&#x74;" className="tip"
                                                                data-toggle="tooltip"
                                                                title="This needs to be filled out"/></label>
                                            <select className="form-control" id="enzyme" name="enzyme" required
                                                    defaultValue=''>
                                                <option disabled value=''/>
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

                            <div className="group">
                                <div className="container">
                                    <fieldset>
                                        <img src="/img/Right-Align-Txt.png" className="center"/>

                                        <h3 className="group-label">New Construct for Database</h3>


                                        <div className="form-group">
                                            <label>Accession of the parent gene <span data-icon="&#x74;" className="tip"
                                                                                      data-toggle="tooltip"
                                                                                      title="This needs to be filled out"/>
                                            </label>
                                            <input className="form-control" type="text" id="accession"
                                                   name="accession"
                                                   required/>
                                        </div>

                                        <div className="form-group">
                                            <label>Amino acid sequence <span data-icon="&#x74;" className="tip"
                                                                             data-toggle="tooltip"
                                                                             title="This needs to be filled out"/>
                                            </label>
                                            <textarea className="form-control" type="text" id="sequenceInfo"
                                                      name="sequenceInfo"
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
                                                   name="dbEntry"
                                                   required/>
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
                                        key: sample.key,
                                        data: sample,
                                        removeSample: self.removeSample
                                    });
                                })}
                            </div>

                            <label><span data-icon="&#x2a;"/> Drag to reorder items</label>

                            <div className="btn btn-primary-outline btn-block" onClick={this.addSample}>Add Another
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
    displayName: "Sample",
    render: function () {
        return (
            <div className="dragg">
                <div className="draggInner">
                    <div className="row">
                        <div className="col-md-10 fix-10">
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label>Sample number <span data-icon="&#x74;" className="tip"
                                                                   data-tipso="This needs to be filled out"/></label>
                                        <input className="form-control" type="number" min="0" max="150"
                                               id="sampleNumber"
                                               name="sampleNumber[]" required/>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label>Sample description <span data-icon="&#x74;" className="tip"
                                                                        data-tipso="This needs to be filled out"/></label>
                                        <input className="form-control" type="text" id="sampleDescription"
                                               name="sampleDescription[]"
                                               required/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-2 fix-2">
                            <div className="removeSample" onClick={this.props.removeSample.bind(null,this)}>
                                <span data-icon="&#xe019;"/>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        )
    }

});

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


ReactDOM.render(React.createElement(App), document.getElementById('app'));
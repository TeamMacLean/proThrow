var App = React.createClass({
    displayName: "app",
    componentDidMount: function componentDidMount() {
        console.log('mounted');
        $('#page-loader').fadeOut('slow', function () {
            this.remove();
        });
    },
    getInitialState: function getInitialState() {
        return {samples: []};
    },
    addSample: function addSample() {
        var key = guid();
        this.setState({samples: this.state.samples.concat([{key: key}])});
    },
    removeSample: function removeSample(sample) {
        var newSamples = this.state.samples.filter(function (s) {
            return s.key != sample.props.data.key;
        });
        this.setState({samples: newSamples});
    },
    // onChange: function onChange() {
    //     var groupSelect = ':input[required]:visible, select[required]:visible';
    //     $('.group').each(function () {
    //         var $group = $(this);
    //         //console.log('group');
    //         $group.find(groupSelect).each(function () {
    //             //console.log('input');
    //             var $input = $(this);
    //             $input.on('input', function () {
    //                 //console.log('change', $input.val());
    //
    //                 var $badge = $group.find('.badge');
    //
    //                 if (groupValid($group)) {
    //                     console.log("valid");
    //                     if (!$badge.hasClass('complete')) {
    //                         $badge.addClass('complete');
    //                     }
    //                 } else {
    //                     console.log("not valid");
    //                     if ($badge.hasClass('complete')) {
    //                         $badge.removeClass('complete');
    //                     }
    //                 }
    //             })
    //         })
    //     });
    //     function groupValid(g) {
    //         var allvalid = true;
    //         g.find(groupSelect).each(function () {
    //
    //             if ($(this).is('input:text') || $(this).is(':input[type="number"]')) {
    //                 if (!$(this).val()) {
    //                     allvalid = false;
    //                 }
    //             } else if ($(this).is('select')) {
    //                 var text = $(this).find(':value=''').text();
    //                 if (text.length < 1) {
    //                     allvalid = false;
    //                 }
    //             }
    //
    //
    //         });
    //         return allvalid;
    //     }
    // },
    render: function render() {
        var self = this;
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
                                                <option>
                                                    Arabidopsis
                                                </option>
                                                <option>
                                                    Nicotiana benthamiana
                                                </option>
                                                <option>
                                                    tamato
                                                </option>
                                                <option>
                                                    medicago
                                                </option>
                                                <option>
                                                    rice
                                                </option>
                                                <option>
                                                    poplar
                                                </option>
                                                <option>
                                                    phytopthora
                                                </option>
                                                <option>
                                                    magnaporte
                                                </option>
                                                <option>
                                                    tobacco
                                                </option>

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
                                                <option>Arabidopsis</option>
                                                <option>Nicotiana benthamiana</option>
                                                <option>tamato</option>
                                                <option>medicago</option>
                                                <option>rice</option>
                                                <option>poplar</option>
                                                <option>phytopthora</option>
                                                <option>magnaporte</option>
                                                <option>tobacco</option>
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

                                        <h3 className="group-label">Type of Analysis</h3>

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
                                                <option>polyadenine ribosylation</option>
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

                                        <h3 className="group-label">Project Description</h3>

                                        <div className="form-group">
                                            <label>Supporting images <span data-icon="&#x74;" className="tip"
                                                                           data-toggle="tooltip"
                                                                           title="This needs to be filled out"/></label>
                                            <input className="form-control" type="file" id="supportingImages"
                                                   name="supportingImages"
                                                   required/>
                                        </div>
                                        <div className="form-group">
                                            <label>Supporting image description <span data-icon="&#x74;" className="tip"
                                                                                      data-toggle="tooltip"
                                                                                      title="This needs to be filled out"/></label>
                                            <input className="form-control" type="text" id="supportingImageDescription"
                                                   name="supportingImageDescription"
                                                   required/>
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

                                        <p>React Node Here</p>
                                    </fieldset>

                                </div>
                            </div>

                            <div className="group">
                                <div className="container">
                                    <span className="badge"/>
                                    <fieldset>
                                        <img src="/img/Right-Align-Txt.png" className="center"/>

                                        <h3 className="group-label">New Construct for Database</h3>

                                        <div className="form-group">
                                            <label>Sequence information
                                                <span data-icon="&#x74;" className="tip" data-toggle="tooltip"
                                                      title="This needs to be filled out"/>
                                            </label>
                                            <input className="form-control" type="text" id="sequenceInfo"
                                                   name="sequenceInfo"
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

var Sample = React.createClass({
    displayName: "Sample",
    render: function () {
        return (
            <div className="dragg">
                <div className="draggInner">
                    <div className="row">
                        <div className="col-md-10">
                            <div className="row">
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label>Sample number <span data-icon="&#x74;" className="tip"
                                                                   data-tipso="This needs to be filled out"/></label>
                                        <input className="form-control" type="number" min="0" max="150"
                                               id="sampleNumber"
                                               name="sampleNumber" required/>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="form-group">
                                        <label>Sample description <span data-icon="&#x74;" className="tip"
                                                                        data-tipso="This needs to be filled out"/></label>
                                        <input className="form-control" type="text" id="sampleDescription"
                                               name="sampleDescription"
                                               required/>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-2">
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


ReactDOM.render(React.createElement(App), document.getElementById('app'));
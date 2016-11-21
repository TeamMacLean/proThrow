'use strict';

var Species = ['Arabidopsis thaliana', 'Lotus japonicus', 'Medicago truncatula', 'Nicotiana benthamiana', 'Nicotiana tabacum', 'Oryza sativa', 'Populus', 'Solanum lycopersicum', 'Zea mays', 'Phytophthora infestans', 'Magnaporthe oryzae', 'Pseudomonas syringae'];

var supportedFileTypes = '.png,.PNG,.jpg,.JPG,.jpeg,.JPEG,.gif,.GIF' /*defines: supportedFileTypes = ".png,.PNG,.jpg,.JPG,.jpeg,.JPEG,.gif,.GIF"*/;

function guid() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    }

    return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4();
}

$(function () {
    initDrag();
    initToolTips();
});

function initDrag() {

    var drake = dragula({
        isContainer: function isContainer(el) {
            return el.classList.contains('dragg');
        }
    });
}

function initToolTips() {
    $('[data-toggle="tooltip"]').tooltip();
}

var App = React.createClass({
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
            return { samples: [], supportingImages: [], constructs: [] };
        }
    },
    addConstruct: function addConstruct() {
        var key = guid();
        this.setState({ constructs: this.state.constructs.concat([{ key: key }]) });
    },
    removeConstruct: function removeConstruct(construct) {
        var newConstructs = this.state.constructs.filter(function (c) {
            return c.key != construct.props.data.key || c.id != construct.props.data.id;
        });
        this.setState({ constructs: newConstructs });
    },
    addSample: function addSample() {
        var key = guid();
        this.setState({ samples: this.state.samples.concat([{ key: key }]) });
    },
    removeSample: function removeSample(sample) {
        var newSamples = this.state.samples.filter(function (s) {
            return s.key != sample.props.data.key || s.id != sample.props.data.id;
        });
        this.setState({ samples: newSamples });
    },
    removeSupportImage: function removeSupportImage(index) {
        //TODO
        var replacement = this.state.supportingImages;
        delete replacement[index];
        this.setState({ supportingImages: replacement });
    },
    initSocketUpload: function initSocketUpload() {

        var self = this;

        $(function () {

            var socket = io(window.location.host);
            socket.on('connect', function () {
                var delivery = new Delivery(socket);

                delivery.on('delivery.connect', function (delivery) {
                    $('input[type=file]').on('change', function (evt) {
                        var file = $(this)[0].files[0];
                        delivery.send(file);
                        evt.preventDefault();
                    });
                });

                delivery.on('send.success', function (fileUID) {
                    console.log('file was successfully sent.');
                });

                socket.on('upload.complete', function (obj) {
                    self.setState({ supportingImages: self.state.supportingImages.concat([obj]) });
                    // console.log('received object', obj);


                    $('input[type=file]').val('');
                });
            });
        });
    },
    render: function render() {
        var self = this;

        return React.createElement(
            'form',
            { action: '/new', method: 'post', id: 'new-form' },
            React.createElement(
                'div',
                { className: 'container' },
                React.createElement(
                    'label',
                    null,
                    React.createElement('input', { type: 'checkbox', id: 'required-readme',
                        defaultChecked: window.existingRequest != null,
                        required: true }),
                    ' ',
                    React.createElement(
                        'span',
                        null,
                        'I have completed the above'
                    )
                ),
                window.existingRequest.id && !window.existingRequest.isClone ? React.createElement('input', { type: 'hidden', name: 'requestID', id: 'requestID', defaultValue: window.existingRequest.id }) : React.createElement('div', null),
                window.existingRequest.janCode && !window.existingRequest.isClone ? React.createElement(
                    'div',
                    { className: 'form-group' },
                    React.createElement(
                        'label',
                        null,
                        'Label'
                    ),
                    React.createElement('input', { type: 'text', className: 'form-control', name: 'janCode', id: 'janCode',
                        defaultValue: window.existingRequest.janCode })
                ) : React.createElement('div', null),
                React.createElement(
                    'div',
                    { className: 'row' },
                    React.createElement(
                        'div',
                        { className: 'col-md-6' },
                        React.createElement(
                            'div',
                            { className: 'group' },
                            React.createElement(
                                'div',
                                { className: 'container' },
                                React.createElement('span', { className: 'badge' }),
                                React.createElement(
                                    'fieldset',
                                    null,
                                    React.createElement('img', { src: '/img/Eyedropper-Tool.png', className: 'center' }),
                                    React.createElement(
                                        'h3',
                                        { className: 'group-label' },
                                        'Biological Material'
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Species ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'Select the species that are present in your samples, e.g. N.benthamina and Pseudomonas syringae if you have infected leave from N.bent' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'species', name: 'species',
                                                defaultValue: window.existingRequest.species || '',
                                                required: true },
                                            Species.map(function (object, i) {
                                                return React.createElement(
                                                    'option',
                                                    { key: i },
                                                    object
                                                );
                                            })
                                        )
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Second Species ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'Select the second species that are present in your samples, e.g. N.benthamina and Pseudomonas syringae if you have infected leave from N.bent' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'secondSpecies',
                                                name: 'secondSpecies',
                                                defaultValue: window.existingRequest.secondSpecies || 'None',
                                                required: true },
                                            ['None'].concat(Species).map(function (object, i) {
                                                return React.createElement(
                                                    'option',
                                                    { key: i },
                                                    object
                                                );
                                            })
                                        )
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Tissue'
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'tissue', name: 'tissue', required: true,
                                                defaultValue: window.existingRequest.tissue || '' },
                                            React.createElement(
                                                'option',
                                                null,
                                                'seedlings'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'leaves'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'rosette'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'roots'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'cell culture'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'callus'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'flower'
                                            )
                                        )
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Tissue age'
                                        ),
                                        React.createElement(
                                            'div',
                                            { className: 'row' },
                                            React.createElement(
                                                'div',
                                                { className: 'col-md-6' },
                                                React.createElement('input', { className: 'form-control', type: 'number',
                                                    id: 'tissueAgeNum',
                                                    name: 'tissueAgeNum',
                                                    min: '0',
                                                    defaultValue: window.existingRequest.tissueAgeNum || '',
                                                    required: true })
                                            ),
                                            React.createElement(
                                                'div',
                                                { className: 'col-md-6' },
                                                React.createElement(
                                                    'select',
                                                    { className: 'form-control', id: 'tissueAgeType',
                                                        name: 'tissueAgeType',
                                                        defaultValue: window.existingRequest.tissueAgeType || '',
                                                        required: true },
                                                    React.createElement(
                                                        'option',
                                                        null,
                                                        'hour(s)'
                                                    ),
                                                    React.createElement(
                                                        'option',
                                                        null,
                                                        'day(s)'
                                                    ),
                                                    React.createElement(
                                                        'option',
                                                        null,
                                                        'week(s)'
                                                    )
                                                )
                                            )
                                        )
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Growth conditions'
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'growthConditions',
                                                name: 'growthConditions',
                                                required: true,
                                                defaultValue: window.existingRequest.growthConditions || '' },
                                            React.createElement(
                                                'option',
                                                null,
                                                'plate'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'liquid'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                '6well'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'soil grown'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'hydrophonics'
                                            )
                                        )
                                    )
                                )
                            )
                        ),
                        React.createElement(
                            'div',
                            { className: 'group' },
                            React.createElement(
                                'div',
                                { className: 'container' },
                                React.createElement('span', { className: 'badge' }),
                                React.createElement(
                                    'fieldset',
                                    null,
                                    React.createElement('img', { src: '/img/Properties.png', className: 'center' }),
                                    React.createElement(
                                        'h3',
                                        { className: 'group-label' },
                                        'Primary Analysis'
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Type of analysis ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'If you know the type of analysis you want, select it here' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'analysisType',
                                                name: 'analysisType',
                                                required: true,
                                                defaultValue: window.existingRequest.analysisType || 'discovery' },
                                            React.createElement(
                                                'option',
                                                null,
                                                'Discovery'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'SRM'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'PRM'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'DIA'
                                            )
                                        )
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Secondary analysis ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'Select only if you want multiple types of analysis done on the same sample, e.g. discovery and targeted' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'secondaryAnalysisType',
                                                name: 'secondaryAnalysisType',
                                                required: true,
                                                defaultValue: window.existingRequest.secondaryAnalysisType || 'None' },
                                            React.createElement(
                                                'option',
                                                null,
                                                'None'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Discovery'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'SRM'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'PRM'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'DIA'
                                            )
                                        )
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Type of PTM ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'Select the type of PTM you are interested in' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'typeOfPTM', name: 'typeOfPTM',
                                                required: true,
                                                defaultValue: window.existingRequest.typeOfPTM || 'none' },
                                            React.createElement(
                                                'option',
                                                null,
                                                'None'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Phosphorylation'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Acetylation'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Ubiquitination'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Glycosylation'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Poly ADP Ribosylation'
                                            )
                                        )
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Quantitative analysis required ',
                                            React.createElement('span', { 'data-icon': 't',
                                                className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'Select the type of quantitative analysis if you have discussed with the Proteomics team. Otherwise leave this in the default option ' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'quantitativeAnalysisRequired',
                                                name: 'quantitativeAnalysisRequired',
                                                defaultValue: window.existingRequest.quantitativeAnalysisRequired || 'None',
                                                required: true },
                                            React.createElement(
                                                'option',
                                                null,
                                                'None'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Semi'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Relative'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Absolute'
                                            )
                                        )
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Type of labeling ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'Select the type of labeling if you have discussed with the proteomics team. Otherwise leave this in the default option ' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'typeOfLabeling',
                                                name: 'typeOfLabeling',
                                                required: true,
                                                defaultValue: window.existingRequest.typeOfLabeling || 'None' },
                                            React.createElement(
                                                'option',
                                                null,
                                                'None'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Label-free'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Post-extraction'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Metabolic'
                                            )
                                        )
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Label used ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'Select the type of label if you have discussed with the proteomics team. Otherwise leave this in the default option' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'labelUsed', name: 'labelUsed',
                                                required: true,
                                                defaultValue: window.existingRequest.labelUsed || 'None' },
                                            React.createElement(
                                                'option',
                                                null,
                                                'None'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'TMT0'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'TMT6'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'TMT10'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'iTRAQ'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                '15N'
                                            )
                                        )
                                    )
                                )
                            )
                        ),
                        React.createElement(
                            'div',
                            { className: 'group' },
                            React.createElement(
                                'div',
                                { className: 'container' },
                                React.createElement('span', { className: 'badge' }),
                                React.createElement(
                                    'fieldset',
                                    null,
                                    React.createElement('img', { src: '/img/Wash-Cold.png', className: 'center' }),
                                    React.createElement(
                                        'h3',
                                        { className: 'group-label' },
                                        'Sample Preparation'
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Sample preparation ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'Select the type of sample preparation used. If not available let the proteomics team know so it can be added ' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'samplePrep', name: 'samplePrep',
                                                defaultValue: window.existingRequest.samplePrep || '',
                                                required: true },
                                            React.createElement(
                                                'option',
                                                null,
                                                'crude extract'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'microsomal'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'plasma membrane'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'IP'
                                            )
                                        )
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Digestion'
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'digestion', name: 'digestion',
                                                required: true,
                                                defaultValue: window.existingRequest.digestion || 'in gel' },
                                            React.createElement(
                                                'option',
                                                null,
                                                'in gel'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'on bead'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'in solution'
                                            )
                                        )
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Enzyme ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'Other enzyme combinations can be selected if previously discussed with proteomics team' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'enzyme', name: 'enzyme', required: true,
                                                defaultValue: window.existingRequest.enzyme || 'Trypsin' },
                                            React.createElement(
                                                'option',
                                                null,
                                                'Trypsin'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'AspN'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Trypsin AspN'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'LysC'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Trypsin LysC'
                                            )
                                        )
                                    )
                                )
                            )
                        )
                    ),
                    React.createElement(
                        'div',
                        { className: 'col-md-6' },
                        React.createElement(
                            'div',
                            { className: 'group' },
                            React.createElement(
                                'div',
                                { className: 'container' },
                                React.createElement('span', { className: 'badge' }),
                                React.createElement(
                                    'fieldset',
                                    null,
                                    React.createElement('img', { src: '/img/Attachment.png', className: 'center' }),
                                    React.createElement(
                                        'h3',
                                        { className: 'group-label' },
                                        'Project Summary'
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Project description'
                                        ),
                                        React.createElement('textarea', { className: 'form-control', type: 'text',
                                            id: 'projectDescription',
                                            name: 'projectDescription',
                                            defaultValue: window.existingRequest.projectDescription || '' })
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'What data do you hope to get from this analysis'
                                        ),
                                        React.createElement('textarea', { className: 'form-control', type: 'text', id: 'hopedAnalysis',
                                            name: 'hopedAnalysis',
                                            defaultValue: window.existingRequest.hopedAnalysis || '' })
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Buffer composition'
                                        ),
                                        React.createElement('input', { className: 'form-control', type: 'text', id: 'bufferComposition',
                                            name: 'bufferComposition',
                                            defaultValue: window.existingRequest.bufferComposition || '' })
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Supporting images ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'Please only use images in .png, .jpg, .jpeg or .gif format ' })
                                        ),
                                        React.createElement('input', { className: 'form-control', type: 'file', id: 'imageUpload',
                                            accept: supportedFileTypes,
                                            name: 'imageUpload' })
                                    ),
                                    React.createElement(
                                        'div',
                                        { id: 'supportingImages', name: 'supportingImages' },
                                        self.state.supportingImages.map(function (object, i) {
                                            //TODO

                                            var removeImage = self.removeSupportImage.bind(null, i);
                                            return React.createElement(
                                                'div',
                                                { className: 'row', key: i },
                                                React.createElement(
                                                    'div',
                                                    { className: 'col-sm-12' },
                                                    React.createElement(
                                                        'div',
                                                        { className: 'tile' },
                                                        React.createElement('img', {
                                                            src: object.preview || object.url,
                                                            className: 'img-fluid center-block' }),
                                                        React.createElement('br', null),
                                                        React.createElement('span', { className: 'removeImage' }),
                                                        React.createElement('input', { type: 'hidden', name: 'imageName[]', defaultValue: object.name }),
                                                        React.createElement('input', { type: 'hidden', name: 'imagePath[]', defaultValue: object.preview || object.url }),
                                                        React.createElement(
                                                            'span',
                                                            { className: 'imageName' },
                                                            object.name
                                                        ),
                                                        React.createElement('span', { className: 'right clickable',
                                                            'data-icon': '\uE019',
                                                            onClick: removeImage }),
                                                        React.createElement('hr', null),
                                                        React.createElement('input', { type: 'hidden', defaultValue: object.uid,
                                                            name: 'image[]' }),
                                                        React.createElement(
                                                            'div',
                                                            { className: 'form-group' },
                                                            React.createElement(
                                                                'label',
                                                                null,
                                                                'Supporting image description'
                                                            ),
                                                            React.createElement('input', { className: 'form-control', type: 'text',
                                                                id: 'imageDescription',
                                                                name: 'imageDescription[]',
                                                                defaultValue: object.description || '',
                                                                required: true })
                                                        )
                                                    )
                                                )
                                            );
                                        })
                                    )
                                )
                            )
                        ),
                        React.createElement(
                            'div',
                            { className: 'group' },
                            React.createElement(
                                'div',
                                { className: 'container' },
                                React.createElement(
                                    'fieldset',
                                    null,
                                    React.createElement('img', { src: '/img/Right-Align-Txt.png', className: 'center' }),
                                    React.createElement(
                                        'h3',
                                        { className: 'group-label' },
                                        'New Constructs for Database'
                                    ),
                                    React.createElement(
                                        'div',
                                        { id: 'constructs' },
                                        this.state.constructs.map(function (construct) {
                                            {/*console.log(construct);*/
                                            }
                                            return React.createElement(Construct, {
                                                key: construct.key || construct.id,
                                                data: construct,
                                                removeConstruct: self.removeConstruct
                                            });
                                        })
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'btn btn-primary-outline btn-block',
                                            onClick: this.addConstruct },
                                        'Add Another Construct'
                                    )
                                )
                            )
                        )
                    )
                ),
                React.createElement(
                    'div',
                    { className: 'group' },
                    React.createElement(
                        'div',
                        { className: 'container' },
                        React.createElement('img', { src: '/img/Guides.png', className: 'center' }),
                        React.createElement(
                            'h3',
                            { className: 'group-label' },
                            'Sample Description'
                        ),
                        React.createElement(
                            'div',
                            { id: 'samples' },
                            this.state.samples.map(function (sample) {
                                return React.createElement(Sample, {
                                    key: sample.key || sample.id,
                                    data: sample,
                                    removeSample: self.removeSample
                                });
                            })
                        ),
                        React.createElement(
                            'label',
                            null,
                            React.createElement('span', { 'data-icon': '*' }),
                            ' Drag to reorder items'
                        ),
                        React.createElement(
                            'div',
                            { className: 'btn btn-primary-outline btn-block', onClick: this.addSample },
                            'Add Another Sample'
                        )
                    )
                ),
                React.createElement('input', { type: 'submit', className: 'btn btn-success btn-block' })
            )
        );
    }
});

var Construct = React.createClass({
    displayName: 'Construct',
    render: function render() {
        var self = this;
        return React.createElement(
            'div',
            null,
            React.createElement(
                'div',
                { className: 'form-group' },
                React.createElement(
                    'label',
                    null,
                    'Species and accession of the parent gene ',
                    React.createElement('span', { 'data-icon': 't',
                        className: 'tip',
                        'data-toggle': 'tooltip',
                        title: 'Tell us from which species the gene comes from and what the accession number is of the gene you used to create this construct' })
                ),
                React.createElement('input', { className: 'form-control', type: 'text', id: 'accession',
                    name: 'accession[]',
                    defaultValue: self.props.data.accession || '',
                    required: true })
            ),
            React.createElement(
                'div',
                { className: 'form-group' },
                React.createElement(
                    'label',
                    null,
                    'Amino acid sequence ',
                    React.createElement('span', { 'data-icon': 't', className: 'tip',
                        'data-toggle': 'tooltip',
                        title: 'Provided the entire amino acid sequence of the construct including tags and junctions' })
                ),
                React.createElement('textarea', { className: 'form-control', type: 'text', id: 'sequenceInfo',
                    name: 'sequenceInfo[]',
                    defaultValue: self.props.data.sequenceInfo || '',
                    required: true })
            ),
            React.createElement(
                'div',
                { className: 'form-group' },
                React.createElement(
                    'label',
                    null,
                    'Database entry ',
                    React.createElement('span', { 'data-icon': 't', className: 'tip',
                        'data-toggle': 'tooltip',
                        title: '>date_of_submition|protein_short_name|for_whom some description if required e.g. >160201|RRS1-R-HF|for_Zane' })
                ),
                React.createElement('input', { className: 'form-control', type: 'text', id: 'dbEntry',
                    name: 'dbEntry[]',
                    defaultValue: self.props.data.dbEntry || '',
                    required: true })
            ),
            React.createElement(
                'div',
                { className: 'removeSample', onClick: this.props.removeConstruct.bind(null, this) },
                React.createElement('span', { 'data-icon': '\uE019' })
            ),
            React.createElement('hr', null)
        );
    }
});

var Sample = React.createClass({
    displayName: 'Sample',
    render: function render() {
        var self = this;
        return React.createElement(
            'div',
            { className: 'dragg' },
            React.createElement(
                'div',
                { className: 'draggInner' },
                React.createElement(
                    'div',
                    { className: 'row' },
                    React.createElement(
                        'div',
                        { className: 'col-md-10 fix-10' },
                        React.createElement(
                            'div',
                            { className: 'row' },
                            React.createElement(
                                'div',
                                { className: 'col-md-4' },
                                React.createElement(
                                    'div',
                                    { className: 'form-group' },
                                    React.createElement(
                                        'label',
                                        null,
                                        'Sample number'
                                    ),
                                    React.createElement('input', { className: 'form-control', type: 'number', min: '0', max: '150',
                                        id: 'sampleNumber',
                                        name: 'sampleNumber[]', defaultValue: self.props.data.sampleNumber || '',
                                        required: true })
                                )
                            ),
                            React.createElement(
                                'div',
                                { className: 'col-md-4' },
                                React.createElement(
                                    'div',
                                    { className: 'form-group' },
                                    React.createElement(
                                        'label',
                                        null,
                                        'Sample label'
                                    ),
                                    React.createElement('input', { className: 'form-control', type: 'text',
                                        id: 'sampleLabel',
                                        name: 'sampleLabel[]', defaultValue: self.props.data.sampleLabel || '',
                                        required: true })
                                )
                            ),
                            React.createElement(
                                'div',
                                { className: 'col-md-4' },
                                React.createElement(
                                    'div',
                                    { className: 'form-group' },
                                    React.createElement(
                                        'label',
                                        null,
                                        'Sample description'
                                    ),
                                    React.createElement('input', { className: 'form-control', type: 'text', id: 'sampleDescription',
                                        name: 'sampleDescription[]',
                                        defaultValue: self.props.data.sampleDescription || '',
                                        required: true })
                                )
                            )
                        )
                    ),
                    React.createElement(
                        'div',
                        { className: 'col-md-2 fix-2' },
                        React.createElement(
                            'div',
                            { className: 'removeSample', onClick: this.props.removeSample.bind(null, this) },
                            React.createElement('span', { 'data-icon': '\uE019' })
                        )
                    )
                )
            )
        );
    }

});

ReactDOM.render(React.createElement(App), document.getElementById('app'));
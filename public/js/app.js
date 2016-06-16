'use strict';

var Species = ['Arabidopsis thaliana', 'Lotus japonicus', 'Medicago truncatula', 'Nicotiana benthamiana', 'Nicotiana tabacum', 'Oryza sativa', 'Populus', 'Solanum lycopersicum', 'Zea mays', 'Phytophthora infestans', 'Magnaporthe oryzae', 'Pseudomonas syringae'];

var supportedFileTypes = '.png,.PNG,.jpg,.JPG,.jpeg,.JPEG,.gif,.GIF' /*defines: supportedFileTypes = ".png,.PNG,.jpg,.JPG,.jpeg,.JPEG,.gif,.GIF"*/;

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
        return { samples: [], supportingImages: [] };
    },
    addSample: function addSample() {
        var key = guid();
        this.setState({ samples: this.state.samples.concat([{ key: key }]) });
    },
    removeSample: function removeSample(sample) {
        var newSamples = this.state.samples.filter(function (s) {
            return s.key != sample.props.data.key;
        });
        this.setState({ samples: newSamples });
    },
    removeSupportImage: function removeSupportImage(index) {
        var replacement = this.state.supportingImages;
        delete replacement[index];
        this.setState({ samples: replacement });
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
                    React.createElement('input', { type: 'checkbox', id: 'required-readme', required: true }),
                    ' I have completed the above'
                ),
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
                                        'Biological Materia'
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
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'species', name: 'species', defaultValue: '',
                                                required: true },
                                            React.createElement('option', { disabled: true, value: '' }),
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
                                            'Preferred database for searches ',
                                            React.createElement('span', { 'data-icon': 't',
                                                className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'searchDatabase', name: 'searchDatabase',
                                                required: true, defaultValue: '' },
                                            React.createElement('option', { disabled: true, value: '' }),
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
                                            'Tissue ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'tissue', name: 'tissue', required: true,
                                                defaultValue: '' },
                                            React.createElement('option', { disabled: true, value: '' }),
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
                                            'Tissue age ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'div',
                                            { className: 'row' },
                                            React.createElement(
                                                'div',
                                                { className: 'col-md-6' },
                                                React.createElement('input', { className: 'form-control', type: 'number', id: 'tissueAgeNum',
                                                    name: 'tissueAgeNum',
                                                    required: true })
                                            ),
                                            React.createElement(
                                                'div',
                                                { className: 'col-md-6' },
                                                React.createElement(
                                                    'select',
                                                    { className: 'form-control', id: 'tissueAgeType',
                                                        name: 'tissueAgeType',
                                                        required: true, defaultValue: '' },
                                                    React.createElement('option', { disabled: true, value: '' }),
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
                                            'Growth conditions ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'growthConditions',
                                                name: 'growthConditions',
                                                required: true, defaultValue: '' },
                                            React.createElement('option', { disabled: true, value: '' }),
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
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'analysisType', name: 'analysisType',
                                                required: true, defaultValue: '' },
                                            React.createElement('option', { disabled: true, value: '' }),
                                            React.createElement(
                                                'option',
                                                null,
                                                'discovery'
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
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'secondaryAnalysisType',
                                                name: 'secondaryAnalysisType',
                                                required: true, defaultValue: '' },
                                            React.createElement('option', { disabled: true, value: '' }),
                                            React.createElement(
                                                'option',
                                                null,
                                                'none'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'discovery'
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
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'typeOfPTM', name: 'typeOfPTM', required: true,
                                                defaultValue: '' },
                                            React.createElement('option', { disabled: true, value: '' }),
                                            React.createElement(
                                                'option',
                                                null,
                                                'all'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'non-modified'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'phosphorylation'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'acetylation'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'Ubiquitination'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'glycosylation'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'poly ADP ribosylation'
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
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'quantitativeAnalysisRequired',
                                                name: 'quantitativeAnalysisRequired', required: true, defaultValue: '' },
                                            React.createElement('option', { disabled: true, value: '' }),
                                            React.createElement(
                                                'option',
                                                null,
                                                'none'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'semi'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'relative'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'absolute'
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
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'typeOfLabeling', name: 'typeOfLabeling',
                                                required: true, defaultValue: '' },
                                            React.createElement('option', { disabled: true, value: '' }),
                                            React.createElement(
                                                'option',
                                                null,
                                                'label-free'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'post-extraction'
                                            ),
                                            React.createElement(
                                                'option',
                                                null,
                                                'metabolic'
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
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'labelUsed', name: 'labelUsed', required: true,
                                                defaultValue: '' },
                                            React.createElement(
                                                'option',
                                                null,
                                                'none (added due to label-free option above)'
                                            ),
                                            React.createElement('option', { disabled: true, value: '' }),
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
                                            'Project description ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement('input', { className: 'form-control', type: 'text', id: 'projectDescription',
                                            name: 'projectDescription' })
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Buffer composition ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement('input', { className: 'form-control', type: 'text', id: 'bufferComposition',
                                            name: 'bufferComposition' })
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
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement('input', { className: 'form-control', type: 'file', id: 'imageUpload',
                                            accept: supportedFileTypes,
                                            name: 'imageUpload',
                                            required: true })
                                    ),
                                    React.createElement(
                                        'div',
                                        { id: 'supportingImages', name: 'supportingImages' },
                                        self.state.supportingImages.map(function (object, i) {
                                            var remove = self.removeSupportImage.bind(null, i);
                                            return React.createElement(
                                                'div',
                                                { className: 'row', key: i },
                                                React.createElement(
                                                    'div',
                                                    { className: 'col-sm-12' },
                                                    React.createElement(
                                                        'div',
                                                        { className: 'tile' },
                                                        React.createElement('img', { src: object.preview,
                                                            className: 'img-fluid center-block' }),
                                                        React.createElement('br', null),
                                                        React.createElement('span', { className: 'removeImage' }),
                                                        React.createElement(
                                                            'span',
                                                            { className: 'imageName' },
                                                            object.name
                                                        ),
                                                        React.createElement('span', { className: 'right clickable', 'data-icon': '',
                                                            onClick: remove }),
                                                        React.createElement('hr', null),
                                                        React.createElement('input', { type: 'hidden', value: object.id, name: 'image[]' }),
                                                        React.createElement(
                                                            'div',
                                                            { className: 'form-group' },
                                                            React.createElement(
                                                                'label',
                                                                null,
                                                                'Supporting image description ',
                                                                React.createElement('span', {
                                                                    'data-icon': 't',
                                                                    className: 'tip',
                                                                    'data-toggle': 'tooltip',
                                                                    title: 'This needs to be filled out' })
                                                            ),
                                                            React.createElement('input', { className: 'form-control', type: 'text',
                                                                id: 'supportingImageDescription',
                                                                name: 'supportingImageDescription[]',
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
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'samplePrep', name: 'samplePrep', required: true,
                                                defaultValue: '' },
                                            React.createElement('option', { disabled: true, value: '' }),
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
                                            'Digestion ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'digestion', name: 'digestion', required: true,
                                                defaultValue: '' },
                                            React.createElement('option', { disabled: true, value: '' }),
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
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement(
                                            'select',
                                            { className: 'form-control', id: 'enzyme', name: 'enzyme', required: true,
                                                defaultValue: '' },
                                            React.createElement('option', { disabled: true, value: '' }),
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
                                        'New Construct for Database'
                                    ),
                                    React.createElement(
                                        'div',
                                        { className: 'form-group' },
                                        React.createElement(
                                            'label',
                                            null,
                                            'Accession of the parent gene ',
                                            React.createElement('span', { 'data-icon': 't', className: 'tip',
                                                'data-toggle': 'tooltip',
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement('input', { className: 'form-control', type: 'text', id: 'accession',
                                            name: 'accession',
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
                                                title: 'This needs to be filled out' })
                                        ),
                                        React.createElement('textarea', { className: 'form-control', type: 'text', id: 'sequenceInfo',
                                            name: 'sequenceInfo',
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
                                                title: '>date_of_submition|protein_short_name|for_whom some description if required\ne.g.\n>160201|RRS1-R-HF|for_Zane' })
                                        ),
                                        React.createElement('input', { className: 'form-control', type: 'text', id: 'dbEntry',
                                            name: 'dbEntry',
                                            required: true })
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
                                    key: sample.key,
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

var Sample = React.createClass({
    displayName: 'Sample',
    render: function render() {
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
                                { className: 'col-md-6' },
                                React.createElement(
                                    'div',
                                    { className: 'form-group' },
                                    React.createElement(
                                        'label',
                                        null,
                                        'Sample number ',
                                        React.createElement('span', { 'data-icon': 't', className: 'tip',
                                            'data-tipso': 'This needs to be filled out' })
                                    ),
                                    React.createElement('input', { className: 'form-control', type: 'number', min: '0', max: '150',
                                        id: 'sampleNumber',
                                        name: 'sampleNumber[]', required: true })
                                )
                            ),
                            React.createElement(
                                'div',
                                { className: 'col-md-6' },
                                React.createElement(
                                    'div',
                                    { className: 'form-group' },
                                    React.createElement(
                                        'label',
                                        null,
                                        'Sample description ',
                                        React.createElement('span', { 'data-icon': 't', className: 'tip',
                                            'data-tipso': 'This needs to be filled out' })
                                    ),
                                    React.createElement('input', { className: 'form-control', type: 'text', id: 'sampleDescription',
                                        name: 'sampleDescription[]',
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
                            React.createElement('span', { 'data-icon': '' })
                        )
                    )
                )
            )
        );
    }

});

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

ReactDOM.render(React.createElement(App), document.getElementById('app'));
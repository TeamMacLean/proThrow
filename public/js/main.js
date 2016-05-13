// //run on load
// $(function () {
//     var requiredCheckbox = $('#required-readme');
//     var form = $('#new-form');
//     if (form && requiredCheckbox) {
//         checkCompletion();
//         // sampleManager();
//         initToolTips();
//         // sampleManager();
//     }
// });
//
//
// // updateCompleteStatus();
// // addNote();
//
// function initToolTips() {
//     $('[data-toggle="tooltip"]').tooltip();
// }
//
// function checkCompletion() {
//
//     var groupSelect = ':input[required]:visible, select[required]:visible';
//
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
//     groupSelect
// }
//
//
// // function updateCompleteStatus() {
// //     var toggle = $('#complete-toggle');
// //     var url = '/admin/request/' + toggle.data('uuid') + '/toggle';
// //     toggle.on('change', function (e) {
// //         $.ajax({
// //             url: url
// //         });
// //     })
// // }
//
// // function addNote() {
// //     var noteText = $('#note-text');
// //     var noteButton = $('#note-button');
// //     var notes = $('#notes');
// //     var url = '/admin/request/' + noteButton.data('uuid') + '/addnote';
// //     noteButton.on('click', function (e) {
// //         $.ajax({
// //             type: "POST",
// //             url: url,
// //             data: {text: noteText.val()},
// //             success: function () {
// //                 notes.find('ul').append('<li>' + noteText.val() + '</li>')
// //             }
// //         });
// //     })
// // }
//
// // function sampleManager() {
// //
// //     var Sample = React.createClass({
// //         displayName: "Sample",
// //         render: function () {
// //             return React.createElement(
// //                 "div",
// //                 {"className": "dragg"},
// //                 React.createElement(
// //                     "div",
// //                     {"className": "row"},
// //                     React.createElement(
// //                         "div",
// //                         {"className": "col-md-10"},
// //                         React.createElement(
// //                             "div",
// //                             {"className": "row"},
// //                             React.createElement(
// //                                 "div",
// //                                 {"className": "col-md-6"},
// //                                 React.createElement(
// //                                     "div",
// //                                     {"className": "form-group"},
// //                                     React.createElement(
// //                                         "label",
// //                                         null,
// //                                         "Sample number ",
// //                                         React.createElement("span", {
// //                                             "data-icon": "t",
// //                                             "className": "tip",
// //                                             "data-tipso": "This needs to be filled out"
// //                                         })
// //                                     ),
// //                                     React.createElement("input", {
// //                                         "className": "form-control",
// //                                         type: "number",
// //                                         min: "0",
// //                                         max: "150",
// //                                         id: "sampleNumber",
// //                                         name: "sampleNumber",
// //                                         required: true
// //                                     })
// //                                 )
// //                             ),
// //                             React.createElement(
// //                                 "div",
// //                                 {"className": "col-md-6"},
// //                                 React.createElement(
// //                                     "div",
// //                                     {"className": "form-group"},
// //                                     React.createElement(
// //                                         "label",
// //                                         null,
// //                                         "Sample description ",
// //                                         React.createElement("span", {
// //                                             "data-icon": "t", "className": "tip",
// //                                             "data-tipso": "This needs to be filled out"
// //                                         })
// //                                     ),
// //                                     React.createElement("input", {
// //                                         "className": "form-control",
// //                                         type: "text",
// //                                         id: "sampleDescription",
// //                                         name: "sampleDescription",
// //                                         required: true
// //                                     })
// //                                 )
// //                             )
// //                         )
// //                     ),
// //                     React.createElement(
// //                         "div",
// //                         {"className": "col-md-2"},
// //                         React.createElement(
// //                             "div",
// //                             {"className": "removeSample"},
// //                             React.createElement("span", {"data-icon": ""})
// //                         )
// //                     )
// //                 )
// //             );
// //         }
// //     });
// //
// //     var Samples = React.createClass({
// //         displayName: "Samples",
// //         getInitialState: function getInitialState() {
// //             return {samples: []};
// //         },
// //         render: function render() {
// //             return React.createElement(
// //                 "div",
// //                 null,
// //                 this.state.samples.map(function (sample) {
// //                     return React.createElement(Sample, {key: sample.id, data: sample});
// //                 })
// //             );
// //         },
// //         addSample: function addSample() {
// //             var key = guid();
// //             this.setState({samples: this.state.samples.concat([{key: key}])});
// //         },
// //         componentDidMount: function componentDidMount() {
// //             var self = this;
// //             self.addSample();
// //         }
// //     });
// //
// //     var samples = ReactDOM.render(React.createElement(Samples), document.getElementById('samples'));
// //
// //
// // }
// //
// // function guid() {
// //     function s4() {
// //         return Math.floor((1 + Math.random()) * 0x10000)
// //             .toString(16)
// //             .substring(1);
// //     }
// //
// //     return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
// //         s4() + '-' + s4() + s4() + s4();
// // }
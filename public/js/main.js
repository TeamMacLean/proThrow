//run on load
$(function () {
    // var requiredCheckbox = $('#required-readme');
    // var form = $('#new-form');
    // if (form && requiredCheckbox) {
    // checkCompletion();
    // sampleManager();
    // initToolTips();
    // sampleManager();
    // }


    initDrag();
    initToolTips();
});

function initDrag() {

    var drake = dragula({
        isContainer: function (el) {
            return el.classList.contains('dragg');
        }
    });

}

// updateCompleteStatus();
// addNote();

function initToolTips() {
    $('[data-toggle="tooltip"]').tooltip();
}

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
// }


// function updateCompleteStatus() {
//     var toggle = $('#complete-toggle');
//     var url = '/admin/request/' + toggle.data('uuid') + '/toggle';
//     toggle.on('change', function (e) {
//         $.ajax({
//             url: url
//         });
//     })
// }

// function addNote() {
//     var noteText = $('#note-text');
//     var noteButton = $('#note-button');
//     var notes = $('#notes');
//     var url = '/admin/request/' + noteButton.data('uuid') + '/addnote';
//     noteButton.on('click', function (e) {
//         $.ajax({
//             type: "POST",
//             url: url,
//             data: {text: noteText.val()},
//             success: function () {
//                 notes.find('ul').append('<li>' + noteText.val() + '</li>')
//             }
//         });
//     })
// }
var requiredCheckbox = $('#required-readme');
var form = $('#new-form');
var className = 'disabled';

if (form && requiredCheckbox) {
  addTheListener();
  checkCheckBox();
}

//TODO check if on admin show page
updateCompleteStatus();
addNote();

function addTheListener() {
  requiredCheckbox.on('change', checkCheckBox);
}

function checkCheckBox() {
  if (requiredCheckbox.is(':checked')) {
    form.removeClass('disabled');

    $('html, body').animate({
      scrollTop: form.offset().top
    }, 1000);

  } else {
    form.addClass('disabled');
  }
}


//function addClass(el) {
//  if (el.classList)
//    el.classList.add(className);
//  else
//    el.className += ' ' + className;
//}

//function removeClass(el) {
//  if (el.classList)
//    el.classList.remove(className);
//  else
//    el.className = el.className.replace(new RegExp('(^|\\b)' + className.split(' ').join('|') + '(\\b|$)', 'gi'), ' ');
//}

function updateCompleteStatus() {
  var toggle = $('#complete-toggle');
  var url = '/admin/request/' + toggle.data('uuid') + '/toggle';
  toggle.on('change', function (e) {
    //console.log('toggle', e);

    $.ajax({
      url: url
    });

  })
}

function addNote() {
  var noteText = $('#note-text');
  var noteButton = $('#note-button');
  var notes = $('#notes');

  var url = '/admin/request/' + noteButton.data('uuid') + '/addnote';

  noteButton.on('click', function (e) {

    $.ajax({
      type: "POST",
      url: url,
      data: {text: noteText.val()},
      success: function () {
        notes.find('ul').append('<li>' + noteText.val() + '</li>')
      }
    });

  })
}
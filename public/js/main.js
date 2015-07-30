var requiredCheckbox = $('#required-readme');
var form = $('#new-form');
var className = 'disabled';

if (form && requiredCheckbox) {
  addTheListener();
  checkCheckBox();
}

//TODO check if on admin show page
updateCompleteStatus();

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

  toggle.on('change', function (e) {
    console.log('toggle', e);


    var url = '/admin/request/' + toggle.data('uuid') + '/toggle';

    $.ajax({
      url: url
    });

  })
}
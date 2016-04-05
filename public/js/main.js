var requiredCheckbox = $('#required-readme');
var form = $('#new-form');
var className = 'disabled';

if (form && requiredCheckbox) {
  addTheListener();
  checkCheckBox();
  checkCompletion();

  sampleManager();

}

updateCompleteStatus();
addNote();

function checkCompletion() {

  var groupSelect = ':input[required]:visible, select[required]:visible';

  $('.group').each(function () {
    var $group = $(this);
    //console.log('group');
    $group.find(groupSelect).each(function () {
      //console.log('input');
      var $input = $(this);
      $input.on('input', function () {
        //console.log('change', $input.val());

        var $badge = $group.find('.badge');

        if (groupValid($group)) {
          console.log("valid");
          if (!$badge.hasClass('complete')) {
            $badge.addClass('complete');
          }
        } else {
          console.log("not valid");
          if ($badge.hasClass('complete')) {
            $badge.removeClass('complete');
          }
        }
      })
    })
  });
  function groupValid(g) {
    var allvalid = true;
    g.find(groupSelect).each(function () {

      if ($(this).is('input:text') || $(this).is(':input[type="number"]')) {
        if (!$(this).val()) {
          allvalid = false;
        }
      } else if ($(this).is('select')) {
        var text = $(this).find(':selected').text();
        if (text.length < 1) {
          allvalid = false;
        }
      }


    });
    return allvalid;
  }
}


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

function updateCompleteStatus() {
  var toggle = $('#complete-toggle');
  var url = '/admin/request/' + toggle.data('uuid') + '/toggle';
  toggle.on('change', function (e) {
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

function sampleManager() {

  function addSample() {
    var aSample = `<div class="dragg">
                    <div class="row">
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Sample number <span data-icon="&#x74;" class="tip"
                                                           data-tipso="This needs to be filled out"></span></label>
                                <input class="form-control" type="number" min="0" max="150" id="sampleNumber" name="sampleNumber" required>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="form-group">
                                <label>Sample description <span data-icon="&#x74;" class="tip"
                                                                data-tipso="This needs to be filled out"></span></label>
                                <input class="form-control" type="text" id="sampleDescription" name="sampleDescription" required>
                            </div>
                        </div>
                    </div>
                </div>`;
    $('#samples').append(aSample);
  }

  addSample();

  $('#addSample').on('click', function () {
    addSample();
  })

}
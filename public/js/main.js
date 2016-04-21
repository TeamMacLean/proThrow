var requiredCheckbox = $('#required-readme');
var form = $('#new-form');
//var className = 'disabled';

if (form && requiredCheckbox) {
  checkCompletion();
  sampleManager();

  initToolTips();
}

updateCompleteStatus();
addNote();

function initToolTips() {
  $('[data-toggle="tooltip"]').tooltip();
}

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

        <div class="col-md-10">
            <div class="row">
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Sample number <span data-icon="&#x74;" class="tip"
                                                   data-tipso="This needs to be filled out"></span></label>
                        <input class="form-control" type="number" min="0" max="150" id="sampleNumber"
                               name="sampleNumber" required>
                    </div>
                </div>
                <div class="col-md-6">
                    <div class="form-group">
                        <label>Sample description <span data-icon="&#x74;" class="tip"
                                                        data-tipso="This needs to be filled out"></span></label>
                        <input class="form-control" type="text" id="sampleDescription" name="sampleDescription"
                               required>
                    </div>
                </div>
            </div>
        </div>
        <div class="col-md-2">
            <div class="removeSample">
                <span data-icon="&#xe019;"></span>
            </div>

        </div>
    </div>

</div>`;

    var $aSample = $(aSample);

    $aSample.find('.removeSample').on('click', function () {
      $aSample.remove();
    });

    $('#samples').append($aSample);
  }

  addSample();

  $('#addSample').on('click', function () {
    addSample();
  })

}
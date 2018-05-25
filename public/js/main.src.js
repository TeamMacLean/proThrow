// import $ from 'jquery';
$(function () {

    var resultsDiv = $('#nav-search-results');

    const socket = io(window.location.host);
    socket.on('connect', function () {

        socket.on('search result', function (results) {
            console.log('result received', results);

            resultsDiv.empty();
            resultsDiv.append($('<ul>'));

            results.map(function (r) {
                resultsDiv.append($('<li>').text(r));
            })

        });
        socket.on('search error', function (error) {
            console.log('error received', error);
        });

    });

    $('#nav-search-button').on('click', function () {
        $('#nav-search-bar').toggle();
    });

    $('#nav-search-input').on('input', function () {
        console.log('sending search');
        socket.emit('search', $(this).val());
    });


    $('#assign-select').bind('change', function (e) {
        // e.preventDefault();

        var id = $('#id');

        if (id) {
            socket.emit('assignTo', {id: id.val(), admin: $(this).val()});
        } else {
            alert('could not find ID of job, please inform Proteomics of the issue');
        }


    });

    $('#completion-selection').bind('change', function (e) {

        var id = $('#id');
        if (id) {
            console.log('emitting', $(this).val());
            socket.emit('toggleStatus', {id: id.val(), status: $(this).val()});
        } else {
            alert('could not find ID of job, please inform Proteomics of the issue');
        }

    });

    $('.areyousure').click(function () {
        return window.confirm('Are you sure?');
    });

    $('#notes-button').on('click', function () {


        var id = $('#id');

        if (id) {
            socket.emit('addNote', {id: id.val(), note: $('#new-note').val()});
        } else {
            alert('could not find ID of job, please inform Proteomics of the issue');
        }

    });


    socket.on('noteAdded', function (obj) {
        $('#notes').append('<li>' + obj.note + '</li>');
        $('#new-note').val('');
    })

});
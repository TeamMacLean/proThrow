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
});
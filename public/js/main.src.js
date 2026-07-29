// Behaviour for the server-rendered pages (navbar search, and the admin
// controls on a request). The submission form is a separate React bundle.
$(function () {

    var resultsDiv = $('#nav-search-results');
    var socket = io(window.location.host);

    /** Debounce delay for the navbar search box. */
    var SEARCH_DEBOUNCE_MS = 250;
    var searchTimer = null;

    /**
     * Show a transient message. Falls back to alert() so a failure is never
     * silent, which is what happened before: rejected socket actions were
     * logged server-side and the admin saw the control simply do nothing.
     */
    function notify(message) {
        window.alert(message);
    }

    /**
     * The id of the request this page is showing.
     *
     * A jQuery object is truthy even when it matched nothing, so the old
     * `if (id)` guard never fired and `id.val()` sent `undefined` to the server.
     *
     * @returns {string|null}
     */
    function currentRequestId() {
        var field = $('#id');
        if (!field.length || !field.val()) {
            return null;
        }
        return field.val();
    }

    /**
     * Emit a socket action for the request on this page.
     *
     * @param {string} event
     * @param {object} payload
     */
    function emitForRequest(event, payload) {
        var id = currentRequestId();
        if (!id) {
            notify('Could not find the ID of this request. Please inform Proteomics.');
            return;
        }
        socket.emit(event, $.extend({id: id}, payload));
    }

    // --- Socket wiring -----------------------------------------------------
    // Registered once, at load. These used to live inside the 'connect'
    // handler, so every reconnection added another copy and a single note
    // ended up being appended several times.

    socket.on('connect_error', function (err) {
        if (err && err.message === 'unauthorized') {
            notify('Your session has expired. Please sign in again.');
        }
    });

    socket.on('search result', function (results) {
        resultsDiv.empty();

        if (!results.length) {
            resultsDiv.append($('<p>').addClass('text-muted').text('No matches.'));
            return;
        }

        var list = $('<ul>').addClass('list-unstyled');
        results.forEach(function (result) {
            var label = result.janCode + ' - ' + (result.species || 'unknown species');
            list.append(
                $('<li>').append(
                    // .text() rather than HTML: every one of these fields is
                    // user-supplied.
                    $('<a>').attr('href', '/request/' + encodeURIComponent(result.id)).text(label)
                )
            );
        });
        resultsDiv.append(list);
    });

    socket.on('search error', function () {
        resultsDiv.empty().append($('<p>').addClass('text-danger').text('Search failed.'));
    });

    socket.on('actionError', function (obj) {
        notify((obj && obj.error) || 'That action could not be completed.');
    });

    socket.on('noteAdded', function (obj) {
        // .text() rather than string concatenation: the note is user-supplied
        // and would otherwise be parsed as HTML.
        $('#notes').append($('<li>').text(obj.note));
        $('#new-note').val('');
    });

    // --- Page controls -----------------------------------------------------

    $('#nav-search-button').on('click', function () {
        $('#nav-search-bar').toggle();
    });

    $('#nav-search-input').on('input', function () {
        // Debounced: each search is a real query now, so firing one per
        // keystroke put avoidable load on the database.
        var value = $(this).val();
        window.clearTimeout(searchTimer);
        searchTimer = window.setTimeout(function () {
            socket.emit('search', value);
        }, SEARCH_DEBOUNCE_MS);
    });

    $('#assign-select').on('change', function () {
        emitForRequest('assignTo', {admin: $(this).val()});
    });

    $('#completion-selection').on('change', function () {
        emitForRequest('toggleStatus', {status: $(this).val()});
    });

    $('#notes-button').on('click', function () {
        var note = $('#new-note').val();
        if (!note || !note.trim()) {
            notify('Please write a note first.');
            return;
        }
        emitForRequest('addNote', {note: note});
    });

    $('.areyousure').click(function () {
        return window.confirm('Are you sure?');
    });

});

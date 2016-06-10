//run on load
$(function () {
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

function initToolTips() {
    $('[data-toggle="tooltip"]').tooltip();
}
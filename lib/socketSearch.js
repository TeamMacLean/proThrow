var currentSearch = {
    text: '',
    search: function search(data) {
        return new Promise(function (good, bad) {
            this.text = data;
            return good(data.split(''));
        });
    }
};

var SocketSearch = (socket) => {
        // console.log('search socket connection');

        socket.on('search', function (searchString) {
            currentSearch.search(searchString).then(function (results) {
                console.log(results);
                socket.emit('search result', results);
            }).catch(function (err) {
                console.log(err);
                socket.emit('search error', {err});
            });
        });
};


module.exports = SocketSearch;
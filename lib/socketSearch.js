var currentSearch = {
    text: '',
    search: function search(data) {
        return new Promise((good, bad)=> {
            this.text = data;
            return good(data.split(''));
        });
    }
};

var SocketSearch = (socket) => {
    // console.log('search socket connection');

    socket.on('search', (searchString) => {
        currentSearch.search(searchString).then((results) => {
            console.log(results);
            socket.emit('search result', results);
        }).catch((err) => {
            console.log(err);
            socket.emit('search error', {err});
        });
    });
};


module.exports = SocketSearch;
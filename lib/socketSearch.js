const currentSearch = {
  text: "",
  search: function search(data) {
    return new Promise((resolve) => {
      this.text = data;
      return resolve(data.split(""));
    });
  },
};

const SocketSearch = (socket) => {
  socket.on("search", async (searchString) => {
    try {
      const results = await currentSearch.search(searchString);
      socket.emit("search result", results);
    } catch (err) {
      console.error("Search error:", err);
      socket.emit("search error", { err: err.message });
    }
  });
};

module.exports = SocketSearch;

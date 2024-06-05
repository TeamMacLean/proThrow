import ReactDOM from "react-dom";
import React, { Component } from "react";
import MyForm from "./components/MyForm";

class App extends Component {
  render() {
    return <MyForm />;
  }
}

ReactDOM.render(<App />, document.getElementById("app"));

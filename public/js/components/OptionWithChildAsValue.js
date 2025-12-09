import { Component } from "react";

class OptionWithChildAsValue extends Component {
  render() {
    var text = this.props.children;
    return <option value={text}>{text}</option>;
  }
}

export default OptionWithChildAsValue;

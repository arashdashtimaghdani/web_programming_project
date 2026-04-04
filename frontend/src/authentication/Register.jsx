import React, { Component } from 'react';

class App extends Component {
  handleRegister = () => {
    const data = { username: 'test', password: '12345' };

    // Make a POST request to the Django server.
    fetch('http://localhost:8000/api/register/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })
    .then((response) => response.json())
    .then((data) => console.log('Success:', data))
    .catch((error) => console.error('Error:', error));
  }

  render() {
    return (
      <button onClick={this.handleRegister}>Register</button>
    );
  }
}

export default App;

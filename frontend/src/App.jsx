import { useEffect, useState } from "react";
import axios from "axios";
import Register from './authentication/Register'

function App() {
  const [message, setMessage] = useState("Loading...");

  useEffect(() => {
    axios
      .get("http://127.0.0.1:8000/api/test/")
      .then((res) => {
        setMessage(res.data.message);
      })
      .catch((err) => {
        console.error("Error fetching data from Django:", err);
        setMessage("Failed to connect to Django backend 😢");
      });
  }, []);

  return (
    <div style={{ padding: "40px", textAlign: "center", fontFamily: "sans-serif" }}>
      <h1>React ↔ Django Connection Test</h1>
      <h2>{message}</h2>
    </div>
  );
}

export default App;


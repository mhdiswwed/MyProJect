/*===================================================
main.jsx / index.jsx
אתחול האפליקציה וחיבור ל־
React Router 
(עטיפת App ב־BrowserRouter)
===================================================== */
import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./app/App";

ReactDOM.createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);

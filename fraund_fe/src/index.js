import React from "react";
import ReactDOM from "react-dom/client";
import reportWebVitals from "./reportWebVitals";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Provider } from "react-redux";
import ScrollToTop from "./component/common/ScrollTop";
import "./index.css";
import { ToastContainer } from "react-toastify";
import { store } from "./app/store";
import { router } from "./routers/index";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Provider store={store}>
    <RouterProvider router={router} />
    <ScrollToTop />
    <ToastContainer
      position="bottom-right"
      autoClose={500}
      hideProgressBar={false}
      newestOnTop={false}
      closeOnClick
      rtl={false}
      pauseOnFocusLoss
      draggable
      pauseOnHover
      theme="colored"
    />
  </Provider>
);

reportWebVitals();

//npm install
//npm start
 

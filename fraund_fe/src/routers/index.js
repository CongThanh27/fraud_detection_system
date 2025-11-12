import { createBrowserRouter } from "react-router-dom";
import { Layout } from "../component";
import RequireAuth from "../component/common/RequireAuth";
import {
  Test,
  Login,
  Home,
  Register,
  Batch,
  Admin,
} from "../pages";
export const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      {
        path: "test",
        element: <Test />,
      },
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "batch",
        element: (
          <RequireAuth>
            <Batch />
          </RequireAuth>
        ),
      },
      {
        path: "admin",
        element: (
          <RequireAuth>
            <Admin />
          </RequireAuth>
        ),
      },
      // {
      //   path: "job",
      //   element: <Layout2 />,
      //   children: [
      //     {
      //       path: ":id",
      //       element: <JobSingle />,
      //     },
      //     {
      //       path: "",
      //       element: <Job />,
      //     },
      //   ],
      // },
      // {
      //   path: "messages",
      //   element: (
      //     <PrivateRouter>
      //       <MessagesAdmin />
      //     </PrivateRouter>
      //   ),
      // },
    ],
  },
  {
    path: "login",
    element: <Login />,
  },
    {
    path: "register",
    element: <Register />,
  },
  // {
  //   path: "forget-password/confirm-password",
  //   element: <ForgotPass />,
  // },

]);

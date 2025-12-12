import { createBrowserRouter } from "react-router-dom";
import { Layout } from "../component";
import RequireAuth from "../component/common/RequireAuth";
import RequireRoleAuth from "../component/common/RequireRoleAuth";
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
            <RequireRoleAuth allowedRoles={["admin"]}>
              <Batch />
            </RequireRoleAuth>
          </RequireAuth>
        ),
      },
      {
        path: "admin",
        element: (
          <RequireAuth>
            <RequireRoleAuth allowedRoles={["admin"]}>
              <Admin />
            </RequireRoleAuth>
          </RequireAuth>
        ),
      },
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
]);
